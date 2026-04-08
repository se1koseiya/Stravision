import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initDB } from '@/lib/db/database';
import { incrementAiUsage, getUserAiQuota } from '@/lib/db/ai-quota-service';

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
      return NextResponse.json({ 
        error: '配额不足', 
        reason: quota.reason === 'limit_reached' ? '今日免费配额已用完' : 'AI 余额不足' 
      }, { status: 403 });
    }

    const { prompt, model } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.SYSTEM_OPENAI_API_KEY;
    const baseUrl = process.env.SYSTEM_OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    // Determine the model to use
    // Priority:
    // 1. model param from request (if provided and valid)
    // 2. SYSTEM_OPENAI_MODEL env var
    // 3. Default fallback 'qwen-plus'
    
    // Map 'auto' to a specific powerful model or keep logic flexible
    let selectedModel = model === 'auto' ? (process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus') : (model || process.env.SYSTEM_OPENAI_MODEL || 'qwen-plus');
    
    // If the request specifically asks for a model, try to use it, but fallback to system model if empty string
    if (!selectedModel) selectedModel = 'qwen-plus';

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

    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `基于以下需求生成自动化策略：\n\n${prompt}` }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
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
