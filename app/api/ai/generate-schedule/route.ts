
import { NextResponse } from 'next/server'
import { getEnhancedSystemPrompt } from '@/lib/ai-system-prompt'
import { initDB } from '@/lib/db/database'
import { getCurrentUser } from '@/lib/auth'
import { getUserAiQuota, incrementAiUsage } from '@/lib/db/ai-quota-service'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { date, deviceData, weatherData, apiKey: rawApiKey, apiUrl: rawApiUrl, model } = await req.json()

    // Key Validation Logic (Reuse from chat route)
    let apiKey = rawApiKey
    let targetUrl = rawApiUrl
    
    const useSystemKey = !apiKey && !rawApiUrl;
    
    if (useSystemKey) {
        await initDB()
        const quota = await getUserAiQuota(user.id as number)
        if (!quota.can_use) {
            const reason = quota.reason === 'membership_required'
                ? 'AI 功能仅限 Pro/Plus 会员使用'
                : quota.reason === 'limit_reached'
                    ? '今日配额已用完'
                    : 'AI 余额不足';
            return Response.json(
                { error: reason, quota },
                { status: 403 }
            )
        }
        
        // 尝试扣减配额
        const success = await incrementAiUsage(user.id as number)
        if (!success) {
             return Response.json(
                { error: "Failed to deduct quota" },
                { status: 403 }
            )
        }
        
        apiKey = process.env.SYSTEM_OPENAI_API_KEY || ""
        const systemBaseUrl = process.env.SYSTEM_OPENAI_BASE_URL || ""
        if (systemBaseUrl) {
             // Simple normalization
             targetUrl = systemBaseUrl
             if (!targetUrl.endsWith('/v1')) {
                // Try to guess if we need to append /v1 or not, usually safe to assume compatible endpoint structure
                // But let's stick to the simpler version for now
             }
        }
    }

    if (!apiKey) {
      return Response.json({ error: "API Key required" }, { status: 400 })
    }

    // Prepare prompt
    const targetDate = new Date(date)
    const dateStr = targetDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })
    
    const systemPrompt = `你是一个专业的农业任务规划专家。
你的目标是根据当前的环境数据、天气预报以及日期，为农场主生成今天的自动化任务列表。

请只输出 JSON 格式的任务列表，不要包含任何解释。
格式如下：
[
  {
    "title": "任务标题",
    "execute_at_time": "HH:MM", // 24小时制时间字符串
    "device_id": 5, // 5:水泵, 6:风扇, 7:补光灯, 8:光照植物补光灯
    "action_type": "relay", // 或 "led"
    "params": { "value": 1 } // 1:开启, 0:关闭
  }
]

设备ID参考：
- 5: 灌溉水泵
- 6: 通风风扇
- 7: 补光灯
- 8: 白光灯

决策依据：
1. 如果温度过高(>30°C)，建议开启风扇。
2. 如果湿度过低(<50%)，建议开启灌溉。
3. 如果是晴天，上午可以适当通风。
4. 如果是阴天或光照不足，建议开启补光灯。
5. 任务时间应分布在合理的工作时间段（如 08:00 - 18:00）。
`

    const userPrompt = `
日期: ${dateStr}
环境数据: ${JSON.stringify(deviceData || {})}
天气数据: ${JSON.stringify(weatherData || {})}

请生成 3-5 个合理的自动控制任务。
`

    // Call AI API (OpenAI Compatible)
    // Normalize URL
    let finalUrl = targetUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1"
    if (!finalUrl.endsWith('/chat/completions')) {
        if (finalUrl.endsWith('/v1')) finalUrl += '/chat/completions'
        else if (!finalUrl.includes('chat/completions')) finalUrl += '/v1/chat/completions'
    }

    let messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ]

    let tasks = []
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
        const response = await fetch(finalUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || "qwen-plus",
                messages: messages,
                temperature: 0.7,
                stream: false
            })
        })

        if (!response.ok) {
            throw new Error(`AI API Error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || "[]"
        
        // Parse JSON from content (handle potential markdown blocks)
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
                tasks = JSON.parse(jsonMatch[0])
            } else {
                tasks = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
            }
            break // Successfully parsed
        } catch (e: any) {
            console.error(`[AI Schedule] Parse failed on attempt ${attempts + 1}:`, e.message, "\nContent:", content)
            attempts++
            
            if (attempts >= maxAttempts) {
                console.error("[AI Schedule] Max attempts reached, failing.")
                break
            }
            
            messages.push({ role: "assistant", content: content })
            messages.push({ 
                role: "user", 
                content: `你生成的 JSON 格式有误，无法解析。报错详情为：${e.message}。
请修正格式错误，并严格重新输出一次正确的 JSON 数组。
正确的格式必须是纯 JSON，例如：
[
  { "title": "任务测试", "execute_at_time": "12:00", "device_id": 5, "action_type": "relay", "params": { "value": 1 } }
]
提示：绝对不要包含任何多余文字或 Markdown 代码块标记（禁止输出 \`\`\`json 等任何格式化修饰符）。` 
            })
        }
    }

    return NextResponse.json({ tasks })

  } catch (error: any) {
    console.error("AI Schedule Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
