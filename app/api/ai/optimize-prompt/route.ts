
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { prompt, apiKey, apiUrl, model } = await req.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key is required" },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    const systemPrompt = `你是一个专业的提示词优化专家。你的任务是将用户输入的简单、模糊的提示词重写为清晰、结构化、高质量的提示词。
    
优化原则：
1. **明确目标**：清晰地陈述希望 AI 完成的任务。
2. **补充细节**：补充必要的背景信息、约束条件或格式要求。
3. **结构化**：使用清晰的结构（如角色设定、任务描述、输出要求等）。
4. **保持原意**：不要改变用户原本的意图，只是使其更专业、更易于 AI 理解。
5. **简洁有力**：去除冗余词汇，使用精确的表达。

请直接输出优化后的提示词，不要包含任何解释或额外的对话内容。优化后的提示词应该是中文的（除非用户明确要求英文）。`

    // 构建请求体，复用 chat 接口的逻辑结构，但这里是一次性请求
    let targetUrl = apiUrl || ""
    const isDashScope = apiUrl?.includes("dashscope.aliyuncs.com") || model?.startsWith("qwen")
    const isCompatibleMode = apiUrl?.includes("compatible-mode/v1") ?? false
    
    let requestBody
    let headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    }

    if (isDashScope && !isCompatibleMode) {
        // DashScope Native API
        requestBody = {
            model: model || "qwen-plus",
            input: {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `请优化以下提示词：\n\n${prompt}` }
                ]
            },
            parameters: {
                result_format: "message"
            }
        }
    } else {
        // OpenAI Compatible API
        if (/\/v1$/.test(targetUrl) && !/\/chat\/completions(\?|$)/.test(targetUrl)) {
            targetUrl = `${targetUrl}/chat/completions`
        }
        
        requestBody = {
            model: model || "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `请优化以下提示词：\n\n${prompt}` }
            ],
            stream: false
        }
    }

    const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
        const error = await response.text()
        return NextResponse.json({ error: `API Error: ${response.status} - ${error}` }, { status: response.status })
    }

    const data = await response.json()
    
    let optimizedPrompt = ""
    if (isDashScope && !isCompatibleMode) {
        optimizedPrompt = data.output?.choices?.[0]?.message?.content || ""
    } else {
        optimizedPrompt = data.choices?.[0]?.message?.content || ""
    }

    return NextResponse.json({ optimizedPrompt })

  } catch (error) {
    console.error("Optimize prompt error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
