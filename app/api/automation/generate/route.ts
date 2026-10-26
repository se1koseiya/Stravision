import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initDB } from '@/lib/db/database';
import { incrementAiUsage, getUserAiQuota } from '@/lib/db/ai-quota-service';
import { readProvidersConfig, resolveDefaultModelId, resolveProvider } from '@/lib/ai/provider-resolver';
import { adaptChatRequestBody } from '@/lib/ai/provider-body-adapter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await initDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查配额
    const quota = await getUserAiQuota(user.id as number);
    if (!quota.can_use) {
      const reason = quota.reason === 'membership_required'
        ? 'AI 功能仅限 Pro/Plus 会员使用'
        : quota.reason === 'limit_reached'
          ? '今日配额已用完'
          : 'AI 余额不足';
      return NextResponse.json({ error: reason, quota }, { status: 403 });
    }

    const { prompt, model } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Determine the model to use
    // Priority:
    // 1. model param from request (explicitly specified, non-'auto')
    // 2. Admin UI 配置的默认模型（data/ai-providers-config.json → defaultModelId）
    // 3. SYSTEM_OPENAI_MODEL env var
    // 4. Default fallback 'qwen-plus'
    let selectedModel = model || process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus';

    // 当未显式指定模型（或为 'auto'）时，从 adminUI 配置解析实际默认模型（而非硬编码）
    if (!model || model === 'auto') {
      try {
        const providersConfig = await readProvidersConfig()
        const adminDefaultModel = resolveDefaultModelId(providersConfig)
        if (adminDefaultModel) {
          selectedModel = adminDefaultModel
        }
      } catch (e) {
        console.warn('[Automation Generate] Failed to read providers config, fallback to env:', e)
      }
    }

    // 通过 provider-resolver 解析出 baseUrl / apiKey（优先 admin 配置的提供商，兜底系统环境变量）
    let resolvedProvider: Awaited<ReturnType<typeof resolveProvider>> = null
    try {
      resolvedProvider = await resolveProvider(selectedModel)
    } catch (e) {
      console.warn('[Automation Generate] resolveProvider error, fallback to env:', e)
    }

    const apiKey = resolvedProvider?.apiKey || process.env.SYSTEM_OPENAI_API_KEY;
    const baseUrl = resolvedProvider?.baseUrl
      || process.env.SYSTEM_OPENAI_BASE_URL
      || 'https://api.openai.com/v1';

    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const systemPrompt = `你是一个专业的 IoT 自动化专家。根据用户描述生成 JSON 策略。

输出格式：{ "nodes": [], "edges": [] }

节点结构规范：
1. nodes 数组中每个节点必须包含：
   - id: 唯一标识符（字符串）
   - type: 节点类型（"triggerNode" | "logicNode" | "actionNode" | "aiNode"）
   - position: { x: number, y: number } 位置坐标
   - data: 节点数据对象，必须包含：
     * label: 显示标签（字符串）
     * type: 子类型（字符串）
     * config: 配置对象（必须包含，即使为空对象 {}）

2. 节点子类型(data.type)：
   - triggerNode: "vlm"(视觉识别) | "sensor"(传感器) | "schedule"(定时)
   - logicNode: "compare"(比较) | "range"(范围) | "condition"(条件)
   - actionNode: "device"(设备控制) | "notification"(通知)
   - aiNode: "llm"(AI分析) | "trend"(趋势预测)

3. config 配置示例：
   - sensor触发器: { "sensor": "temp", "frequency": "5m" }
   - compare逻辑: { "sensor": "temp", "operator": "gt", "value": "30" }
   - range逻辑: { "sensor": "hum", "min": "40", "max": "80" }
   - device动作: { "device": "fan", "action": true }

4. edges 数组中每个连接：
   - id: 唯一标识符
   - source: 源节点id
   - target: 目标节点id
   - animated: true（可选）

5. 布局规则：
   - x轴间隔400像素
   - y轴根据分支适当调整
   - 从左到右：触发器 -> 逻辑 -> 动作

重要：所有节点的 data.config 必须是对象，不能省略！

仅输出有效的 JSON，不要包含任何解释文字。`;

    // baseUrl 可能已含 /chat/completions（resolveProvider 已规范化），兼容两种情况
    const chatUrl = /\/chat\/completions$/.test(baseUrl)
      ? baseUrl
      : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(adaptChatRequestBody({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `基于以下需求生成自动化策略：\n\n${prompt}` }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }, { baseUrl: chatUrl, model: selectedModel })),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({ error: `AI API Error: ${response.status} - ${errorData}` }, { status: response.status });
    }

    const data = await response.json();
    let result = JSON.parse(data.choices[0].message.content);
    
    // Validate and fix node structure
    if (result.nodes && Array.isArray(result.nodes)) {
      result.nodes = result.nodes.map((node: any) => {
        // Ensure config exists
        if (!node.data.config) {
          node.data.config = {};
        }
        // Ensure position exists
        if (!node.position) {
          node.position = { x: 0, y: 0 };
        }
        return node;
      });
    }

    // 扣减配额
    await incrementAiUsage(user.id as number);

    return NextResponse.json(result);

  } catch (error) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
