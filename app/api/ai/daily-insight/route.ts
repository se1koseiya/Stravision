
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSensorHistory } from '@/lib/db/device-service';
import { getCreditsConfig, checkCreditAllowance } from '@/lib/db/credit-service';
import { incrementAiUsage, getUserAiQuota } from '@/lib/db/ai-quota-service';
import OpenAI from 'openai';

// Force dynamic to prevent caching of the AI response
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔥 额度守卫：积分制开启时按积分检查（此前只走旧按次配额，积分耗尽拦不住）
    const creditsEnabled = (await getCreditsConfig()).enabled;
    if (creditsEnabled) {
      const denyReason = await checkCreditAllowance(user.id as number);
      if (denyReason) {
        return NextResponse.json({
          insight: denyReason,
          recommendation: '请等待月度刷新或充值积分',
          riskLevel: "low",
          error: denyReason,
        }, { status: 403 });
      }
    } else {
    // Check Quota（旧按次配额，仅积分制关闭时使用）
    const quota = await getUserAiQuota(user.id as number);
    if (!quota.can_use) {
      const msg = quota.reason === 'membership_required'
        ? 'AI 功能仅限 Pro/Plus 会员使用'
        : '今日 AI 额度已用完';
      return NextResponse.json({
        insight: msg,
        recommendation: quota.reason === 'membership_required' ? '请升级会员' : '请明天再来或联系管理员充值',
        riskLevel: "low",
        error: msg,
        quota,
      }, { status: 403 });
    }
    }

    // 1. Fetch last 24h data for key metrics
    // We fetch a few key metrics to give the AI context
    const [tempData, humidityData, co2Data, lightData] = await Promise.all([
      getSensorHistory('temperature', '1d'),
      getSensorHistory('humidity', '1d'),
      getSensorHistory('co2', '1d'),
      getSensorHistory('light', '1d')
    ]);

    // 2. Prepare data summary for AI
    // We don't want to send thousands of points, just a summary
    const summarize = (data: any[], name: string) => {
      if (!data || data.length === 0) return `${name}: 无数据`;
      const values = data.map(d => d.value);
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
      summarize(lightData, '光照(Lux)')
    ].join('\n');

    // 3. Call AI
    // Use system-configured API Key (not user provided)
    const apiKey = process.env.SYSTEM_OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY;
    const baseUrl = process.env.SYSTEM_OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    
    if (!apiKey) {
      return NextResponse.json({ 
        insight: "系统 AI 服务未配置，无法生成分析报告。",
        recommendation: "请联系管理员配置系统环境变量。",
        riskLevel: "low"
      });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    let result = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Initial messages array
    const messages: any[] = [
      {
        role: 'system',
        content: `你是一个专业的智慧农业 AI 助手。请根据提供的最近24小时大棚环境数据，生成一份简短的"每日洞察报告"。
        
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
- 光照：适中`
      },
      {
        role: 'user',
        content: `环境数据摘要：\n${dataContext}`
      }
    ];

    while (attempts < maxAttempts) {
      const completion = await openai.chat.completions.create({
        model: process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus',
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content || '{}';

      try {
        // Safe JSON parsing handling leading/trailing markdown code blocks
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleanContent);
        break; // Process fully successful
      } catch (e: any) {
        console.error(`[Daily Insight] Parse failed on attempt ${attempts + 1}:`, e.message, "\nContent:", content);
        attempts++;
        
        if (attempts >= maxAttempts) {
          result = { 
            insight: "生成报告时遭遇解析异常", 
            recommendation: "请稍后重试或手动检查大棚数据指标。", 
            riskLevel: "low" 
          };
          break;
        }
        
        // Feed the failure back to the model with correction prompt
        messages.push({ role: 'assistant', content: content });
        messages.push({
          role: 'user',
          content: `你生成的 JSON 格式有误，无法被解析器解析。错误详情：${e.message}。
请修正所有的格式错误，并严格重新输出一次。
正确的格式必须且仅包含如下 JSON：
{
  "insight": "总结...",
  "recommendation": "建议...",
  "riskLevel": "low"
}
提示：必须以纯净的 JSON 字符串返回，绝对不要输出任何 markdown 代码块标记，不要写 \`\`\`json 等修饰内容。`
        });
      }
    }

    // Deduct Quota（旧按次配额；积分制下由 settle 体系按实际 token 结算，不按次扣）
    if (!creditsEnabled) {
      await incrementAiUsage(user.id as number);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Failed to generate daily insight:', error);
    return NextResponse.json({ 
      insight: "生成报告时发生错误", 
      recommendation: "请稍后重试", 
      riskLevel: "low" 
    }, { status: 500 });
  }
}
