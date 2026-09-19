/**
 * Copilot 侧栏的每页配置：欢迎词 + 推荐问题
 *
 * 各业务页共用同一套 CopilotSidebar（内部复用 ai-assistant 的
 * ChatBubbleList / ChatSenderInput / ChatMessageRenderer），
 * 页面差异只体现在欢迎词与推荐问题上 —— 在这里集中配置。
 */

export type CopilotPageKey = "monitor" | "dashboard" | "automation" | "device-control"

export interface CopilotPageConfig {
  /** 侧栏标题（跟随页面名） */
  title: string
  /** 空态欢迎词（每个页面不一样 —— 2026-09-19 用户要求） */
  greeting: string
  /** 空态推荐问题（点击直接发送） */
  suggestions: string[]
}

export const COPILOT_PAGE_CONFIGS: Record<CopilotPageKey, CopilotPageConfig> = {
  monitor: {
    title: "实时监控 · 莓小智",
    greeting: "这个棚的数据我都在看。温度、湿度、设备开关、摄像头画面，有什么想问的直接说。",
    suggestions: [
      "当前环境有什么风险？",
      "现在适合开风扇通风吗？",
      "摄像头画面里的草莓长势怎么样？",
    ],
  },
  dashboard: {
    title: "数据看板 · 莓小智",
    greeting: "近 1 小时的环境趋势我都拉出来了。要我帮你解读波动、找异常，还是给种植建议？",
    suggestions: [
      "这 1 小时的数据有没有异常波动？",
      "当前环境适合草莓生长吗？",
      "根据趋势，接下来该注意什么？",
    ],
  },
  automation: {
    title: "自动化 · 莓小智",
    greeting: "你的自动化策略清单我已经看过了。想让我检查冲突、查漏补缺，还是新建一条规则？",
    suggestions: [
      "我这些规则有没有冲突或冗余？",
      "帮我梳理现有策略的覆盖场景",
      "帮我加一条夜间低温自动加热的规则",
    ],
  },
  "device-control": {
    title: "设备控制 · 莓小智",
    greeting: "水泵、风扇、补光灯都听你差遣。可以直接让我开关节点，或先问问我现在的设备状态。",
    suggestions: [
      "现在哪些设备开着？",
      "给我一套促进转色上色的补光方案",
      "把通风风扇打开 10 分钟",
    ],
  },
}
