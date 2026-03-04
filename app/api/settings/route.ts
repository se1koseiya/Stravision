import { cookies } from "next/headers"

// 临时存储（生产环境应该使用数据库）
const settingsStore = new Map<string, any>()

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get("auth")
    
    const defaultSettings = {
      apiKey: "",
      apiUrl:
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      model: "qwen3-plus",
      systemPrompt:
        "你是莓界智慧农业平台的AI助手，专门帮助用户分析农业数据、提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。\n\n重要提醒：如果需要提供参考来源，请确保所有链接和信息都是真实存在的，绝对不要编造虚假的网站或来源。如果不确定来源，请直接说明这是基于你的知识库回答，而不是提供虚假引用。",
    }

    if (!authCookie) {
      // 未登录时返回默认设置
      return Response.json(defaultSettings)
    }

    // 使用用户token作为key（简化版，生产环境应该解析JWT）
    const userSettings = settingsStore.get(authCookie.value) || defaultSettings

    return Response.json(userSettings)
  } catch (error) {
    console.error("获取设置失败:", error)
    return Response.json({ error: "获取设置失败" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get("auth")
    
    const settings = await req.json()
    
    // 验证必需字段
    // 注意：如果是系统托管模式，前端会清空 apiKey 和 apiUrl，这里需要放行
    // 通过判断字段是否存在来决定，或者允许为空字符串
    // 这里我们稍微放宽校验：只有当它明确不是系统托管意图时才校验？
    // 实际上，只要前端传了空字符串，我们应该允许保存，因为这代表用户想用系统默认值
    
    // if (!settings.apiKey || !settings.apiUrl) {
    //   return Response.json({ error: "缺少必需字段" }, { status: 400 })
    // }

    if (!authCookie) {
      // 未登录时，返回成功但提示使用localStorage
      return Response.json({ 
        success: true, 
        message: "设置已保存到本地（未登录状态）",
        useLocalStorage: true 
      })
    }

    // 保存设置
    settingsStore.set(authCookie.value, settings)

    return Response.json({ success: true, message: "设置已保存" })
  } catch (error) {
    console.error("保存设置失败:", error)
    return Response.json({ error: "保存设置失败" }, { status: 500 })
  }
}
