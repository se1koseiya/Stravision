import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { deviceData, weatherData, username } = await req.json()

    const apiKey = process.env.SYSTEM_OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const hour = new Date().getHours()
    const timeGreeting = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

    // Analyze data for the AI so it can speak naturally
    const tempVal = deviceData?.temperature?.toFixed(1)
    const humVal = deviceData?.humidity?.toFixed(1)
    const co2Val = deviceData?.co2
    const lightVal = deviceData?.light

    // Pre-analyze conditions so AI can talk naturally
    const tempFeeling = tempVal ? (parseFloat(tempVal) < 15 ? '偏冷' : parseFloat(tempVal) > 30 ? '偏热' : parseFloat(tempVal) < 20 ? '凉爽' : '舒适') : null
    const humFeeling = humVal ? (parseFloat(humVal) < 40 ? '偏干' : parseFloat(humVal) > 80 ? '偏湿' : '适中') : null
    const co2Feeling = co2Val ? (co2Val > 1500 ? '偏高需通风' : co2Val > 1000 ? '略高' : '正常') : null
    const lightFeeling = lightVal ? (lightVal < 500 ? '光照不足' : lightVal > 5000 ? '光照充足' : '光照一般') : null

    const weatherDesc = weatherData?.current ?
      `室外${weatherData.current.condition?.text || ''}，${weatherData.current.temp_c}度` : ''

    const prompt = `当前环境数据：温度${tempVal}度(${tempFeeling})，湿度${humVal}%(${humFeeling})，CO2浓度${co2Val}(${co2Feeling})，光照${lightVal}lux(${lightFeeling})。${weatherDesc ? '室外天气：' + weatherDesc + '。' : ''}

请生成一段专业简短的每日播报，直接输出文字，不要输出思考过程。要求：
- 用"${timeGreeting}，${username || '农场主人'}，我是您的智能管家莓小智"开头
- 专业简要地概括当前环境状态，不要逐条列数字，用自然语言描述，比如"当前棚内温度适宜""空气流通性不太好"
- 根据数据给出1条专业建议，用"建议您"开头
- 语气专业、礼貌、温和，像一个称职的私人管家在向主人汇报
- 最后再告知用户，如果需要具体的自动调控建议，请使用莓小智语音助手，或者ai助手界面
- 控制在70字以内`

    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen3.6-flash",
        messages: [
          { role: "system", content: "你是莓小智，一个专业可靠的智慧农业AI管家。你对主人毕恭毕敬、专业负责。说话简洁有条理，像一个经验丰富的农业顾问。直接输出播报内容，不要输出思考过程，不要用<think>标签。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 120,
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Briefing generation error:", errorText)
      return NextResponse.json({ error: "Failed to generate briefing" }, { status: response.status })
    }

    const data = await response.json()
    let briefingText = data?.choices?.[0]?.message?.content?.trim() || ""

    // Strip any <think>...</think> blocks
    briefingText = briefingText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    return NextResponse.json({ text: briefingText })
  } catch (error) {
    console.error("Daily briefing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
