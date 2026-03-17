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
1. nodes: { id, type("triggerNode"|"logicNode"|"actionNode"|"aiNode"), position{x,y}, data{label, type} }
   - 子类型(data.type): trigger(vlm,sensor), logic(compare,range), ai(llm,trend), action(device,notification)
2. edges: { id, source, target, animated:true }
布局：x轴间隔400。仅输出 JSON。`;

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
    const result = JSON.parse(data.choices[0].message.content);

    // 扣减配额
    await incrementAiUsage(user.id as number);

    return NextResponse.json(result);

  } catch (error) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
