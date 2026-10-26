import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSensorHistory } from '@/lib/db/device-service';
import { getCreditsConfig, checkCreditAllowance } from '@/lib/db/credit-service';
import { incrementAiUsage, getUserAiQuota } from '@/lib/db/ai-quota-service';
import { IS_DESKTOP_APP } from '@/lib/desktop-mode';
import { adaptChatRequestBody } from '@/lib/ai/provider-body-adapter';
import { resolveRequestedModel, buildModelCandidates } from '@/lib/ai/effective-model';
import { resolveProvider, readProvidersConfig } from '@/lib/ai/provider-resolver';

// Force dynamic to prevent caching of the AI response
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `你是一个专业的智慧农业 AI 助手。请根据提供的最近24小时大棚环境数据，生成一份简短的"每日洞察报告"。

你的输出必须是 JSON 格式，包含以下字段：
1. insight (string): 对过去24小时环境状况的简要总结（不超过50字），语气专业且亲切。
2. recommendation (string): 基于数据给出的一条关键种植建议（如需操作设备，请明确指出）。
3. riskLevel (string): "low" | "medium" | "high"。综合评估当前环境对草莓生长的风险等级。
   - High: 温度>35 或 <5，湿度>90 或 <30
   - Medium: 数据略微偏离最佳区间
   - Low: 数据正常

草莓最佳生长环境参考：
- 温度：20-25°C
- 湿度：60-80%
- CO2：400-1000ppm
- 光照：适中`;

/**
 * 「AI 每日洞察」—— AI 辅助接口（独立调 LLM）
 *
 * 🚨 模型解析**必须与 /api/chat 同一条链路**（readProvidersConfig → resolveRequestedModel
 *    → resolveProvider + adaptChatRequestBody）。此前这里直接读
 *    `process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus'` + `SYSTEM_OPENAI_API_KEY`，
 *    等于自写了一套模型名与凭据 —— 管理员在后台换模型/换供应商后，
 *    这张卡仍按旧模型生成（典型的「各自造轮子」）。
 *    额度守卫同样照抄 /api/chat 的 useSystemKey 口径（桌面端豁免）。
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔥 额度守卫
    //   · 桌面端（本地运行 + BYOK，平台积分/会员体系不适用）整体豁免
    //   · 积分制开启 → checkCreditAllowance
    //   · 积分制关闭 → 回落到旧按次配额 getUserAiQuota
    const useSystemKey = !IS_DESKTOP_APP;
    if (useSystemKey) {
      const creditsEnabled = (await getCreditsConfig()).enabled;
      if (creditsEnabled) {
        const denyReason = await checkCreditAllowance(user.id as number);
        if (denyReason) {
          return NextResponse.json({
            insight: denyReason,
            recommendation: '请等待月度刷新或充值积分',
            riskLevel: 'low',
            error: denyReason,
          }, { status: 403 });
        }
      } else {
        const quota = await getUserAiQuota(user.id as number);
        if (!quota.can_use) {
          const msg = quota.reason === 'membership_required'
            ? 'AI 功能仅限 Pro/Plus 会员使用'
            : '今日 AI 额度已用完';
          return NextResponse.json({
            insight: msg,
            recommendation: quota.reason === 'membership_required' ? '请升级会员' : '请明天再来或联系管理员充值',
            riskLevel: 'low',
            error: msg,
            quota,
          }, { status: 403 });
        }
      }
    }

    // 1. 取最近 24h 关键指标，压成给模型的摘要
    const [tempData, humidityData, co2Data, lightData] = await Promise.all([
      getSensorHistory('temperature', '1d'),
      getSensorHistory('humidity', '1d'),
      getSensorHistory('co2', '1d'),
      getSensorHistory('light', '1d'),
    ]);

    const summarize = (data: Array<{ value: number }> | null, name: string) => {
      if (!data || data.length === 0) return `${name}: 无数据`;
      const values = data.map((d) => d.value);
      const min = Math.min(...values).toFixed(1);
      const max = Math.max(...values).toFixed(1);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      const current = values[values.length - 1].toFixed(1);
      return `${name}: 当前${current}, 均值${avg}, 最低${min}, 最高${max}`;
    };

    const dataContext = [
      summarize(tempData, '温度(°C)'),
      summarize(humidityData, '湿度(%)'),
      summarize(co2Data, 'CO2(ppm)'),
      summarize(lightData, '光照(Lux)'),
    ].join('\n');

    // 2. 模型 / 供应商解析：与主对话完全同一条链路，不再硬编码任何模型名
    const providersConfig = await readProvidersConfig();
    const { model: effectiveModel, degraded, reason } = await resolveRequestedModel({
      model: undefined,
      // 这条只需要一段短 JSON，不需要推理模型（省 token、快）
      enableReasoning: false,
      isByok: false,
      cfg: providersConfig,
    });
    if (degraded) console.warn('[daily-insight]', reason);

    const candidates = buildModelCandidates({
      primary: effectiveModel,
      cfg: providersConfig,
      enableReasoning: false,
      allowFallback: true,
      max: 6,
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        insight: '系统 AI 服务未配置，无法生成分析报告。',
        recommendation: '请联系管理员在后台配置 AI 服务商。',
        riskLevel: 'low',
        degraded: true,
        // 🚨 辅助接口的降级必须**可诊断**（铁律）：只给兜底文案的话，
        //    前端分不清「没解析到供应商 / key 没配 / 额度耗尽」，只能一个个 curl 试。
        reason: 'no-provider',
      });
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `环境数据摘要：\n${dataContext}` },
    ];

    // 3. 依次尝试候选模型；每个候选内部对「JSON 解析失败」再纠错重试一次
    let result: any = null;
    let usedModel = candidates[0];
    let lastError = 'all candidates failed';
    // 降级指纹：形如 "upstream-402" / "parse-failed"。
    // 没有它就只能看到"回退到了某个模型"这个事实，看不到**为什么**要回退。
    const failureCodes: string[] = [];

    for (const candidate of candidates) {
      const resolved = await resolveProvider(candidate);
      if (!resolved?.apiKey || !resolved?.baseUrl) continue;

      const attemptMessages = [...messages];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const requestBody = {
            model: candidate,
            messages: attemptMessages,
            response_format: { type: 'json_object' },
            temperature: 0.7,
            stream: false,
          };

          const response = await fetch(resolved.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resolved.apiKey}` },
            body: JSON.stringify(
              adaptChatRequestBody(requestBody, { baseUrl: resolved.baseUrl, model: candidate }),
            ),
          });

          if (!response.ok) {
            const body = await response.text().catch(() => '');
            lastError = `${candidate} → HTTP ${response.status} ${body.slice(0, 160)}`;
            failureCodes.push(`upstream-${response.status}`);
            console.warn(`[daily-insight] model "${candidate}" failed (${response.status})`);
            break; // 这个模型不行，换下一个
          }

          const data = await response.json();
          const content: string =
            data?.choices?.[0]?.message?.content ||
            data?.output?.choices?.[0]?.message?.content ||
            '';

          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanContent);
          if (parsed && typeof parsed === 'object') {
            result = parsed;
            usedModel = candidate;
          }
          break;
        } catch (e: any) {
          lastError = `${candidate} → ${e?.message || 'parse failed'}`;
          if (failureCodes.length === 0 || failureCodes[failureCodes.length - 1] !== 'parse-failed') {
            failureCodes.push('parse-failed');
          }
          console.error(`[daily-insight] parse failed on "${candidate}" (attempt ${attempt + 1}):`, e?.message);
          if (attempt === 0) {
            // 把失败原因喂回去让它自我修正，再给一次机会
            attemptMessages.push(
              { role: 'assistant', content: lastError },
              {
                role: 'user',
                content: `你生成的 JSON 格式有误，无法被解析器解析。错误详情：${e?.message}。
请修正所有格式错误并严格重新输出一次，必须且仅包含如下 JSON：
{
  "insight": "总结...",
  "recommendation": "建议...",
  "riskLevel": "low"
}
提示：必须返回纯净 JSON 字符串，绝对不要输出 markdown 代码块标记。`,
              },
            );
          }
        }
      }
      if (result) break;
    }

    if (!result) {
      // 全部候选都失败：给一个可读的兜底，而不是 500
      return NextResponse.json({
        insight: '生成报告时遭遇异常',
        recommendation: '请稍后重试，或联系管理员检查 AI 服务商配置。',
        riskLevel: 'low',
        degraded: true,
        reason: failureCodes[0] ?? 'all-candidates-failed',
        error: lastError,
      });
    }

    // 4. 旧按次配额扣减（积分制下由 settle 体系按实际 token 结算，不按次扣）
    if (useSystemKey) {
      const creditsEnabled = (await getCreditsConfig()).enabled;
      if (!creditsEnabled) {
        await incrementAiUsage(user.id as number);
      }
    }

    // 候选链回退（主模型上游不可用 → 退到别的模型）也算降级，且必须说清回退原因：
    // 本次实测 primary 恒定 402/403 时，只报 degraded=true 根本定位不到「是额度耗尽」。
    const fellBack = usedModel !== effectiveModel;
    const degradeReason = fellBack
      ? `primary "${effectiveModel}" unavailable → fell back to "${usedModel}"` +
        (failureCodes.length ? ` (${failureCodes[0]})` : '')
      : reason;

    return NextResponse.json({
      insight: String(result.insight ?? ''),
      recommendation: String(result.recommendation ?? ''),
      riskLevel: ['low', 'medium', 'high'].includes(result.riskLevel) ? result.riskLevel : 'low',
      model: usedModel,
      degraded: fellBack || degraded,
      ...(fellBack || degraded ? { reason: degradeReason ?? 'unknown' } : {}),
      ...(failureCodes.length ? { failureCodes } : {}),
    });
  } catch (error) {
    console.error('Failed to generate daily insight:', error);
    return NextResponse.json({
      insight: '生成报告时发生错误',
      recommendation: '请稍后重试',
      riskLevel: 'low',
    }, { status: 500 });
  }
}
