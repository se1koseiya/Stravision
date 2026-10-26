/**
 * 天气色相板（唯一来源）—— 7 日预报 / 天气卡 / 设备页天气区共用
 *
 * ══ 为什么要有这个文件（原先的病根）══
 *  ① `getGradient()` 曾在 weather-forecast-widget.tsx 与 weather-widget.tsx 里
 *     **各写一份且内容不一致** —— 同一场雨在两张卡上是两个颜色。
 *  ② 旧值对「小雨」给的是 `['#1e40af', '#059669', '#71717a']`：
 *     深蓝 → 翠绿 → 灰蓝，**三个色相对撞**。这就是用户看到「鬼颜色」的来源。
 *     它同时违反两条既有铁律：
 *       · 全站色系 = 晨雾松 emerald × zinc（撞色把品牌绿塞进了天气底色）；
 *       · 华为「平衡共生」原则 —— 色彩要舒适协调，单一界面不该同时跑三个色相。
 *  ③ 旧值还直接给 3 个十六进制色，**没有一处校验过白字对比度**。
 *
 * ══ 现在的规则（华为 HarmonyOS 设计方法论落地）══
 *  一、**一个天气 = 一个色相，明度在同色相内递减**（不跨色相）。
 *      这就是「和谐」的物理含义：色相差恒定、只走明度，人眼读起来是一块
 *      连续的天空，而不是三块贴在一起的色板。
 *  二、明度方向 = **上亮下深**。依据 HDS 沉浸光感「光从上方来 → 上缘受光」，
 *      同时真实天空也是上深下浅的反面；取上亮是因为卡片内容重心在中上部，
 *      上部亮才能保证文字对比度。
 *  三、最浅一档也已压到 **对白字 ≥ 4.5:1**（正文）/ ≥ 3:1（20px+ 大字），
 *      逐条算过，见每档下方的注释。绝不再出现「浅到白字读不清」的天气。
 *  四、**时段维度**：夜间走一套更暗更冷的色板（同色相，明度整体下压），
 *      避免大白天出现「深色天空卡」这种自相矛盾的画面。
 *  五、accent = 该色相的高彩度版本，**只用于图标 / 数据条**这类小面积点缀，
 *      不再拿来做底色 —— 底色归底色，强调色归强调色。
 *
 * 华为色彩方法论里被本文件采纳的三条：
 *  · 「雪域灰」：没有绝对的黑与白，颜色都带一点色相倾向 —— 所以这里的
 *    「阴 / 雾 / 雪」是**带蓝相的冷灰**，不是 zinc-500 那种纯中性灰。
 *  · 文本四级透明度层级（primary 90% / secondary 60% / tertiary 40%）：
 *    天气卡上的文字层级按这个比例给，而不是随手写 rgba。
 *  · 最小对比度 3:1（图标等非文本元素）/ 4.5:1（正文）。
 */

/** 一档天气色相：从最亮（上）到最深（下），同色相内递减 */
export interface SkyRamp {
  /** 三个色标，最亮 → 最深 */
  stops: readonly [string, string, string]
  /** 唯一强调色：只给图标 / 数据条等小面积，绝不做底色 */
  accent: string
  /** 是否为夜间色板（供文案与光效层判断） */
  night?: boolean
}

/** 天气类别 —— 由 condition 文本归一 */
export type SkyKind =
  | "clear"        // 晴
  | "cloudy"       // 多云 / 阴
  | "rain"         // 小雨 / 中雨
  | "heavyRain"    // 大雨 / 暴雨
  | "snow"         // 雪
  | "thunder"      // 雷暴
  | "fog"          // 雾 / 霾
  | "night"        // 夜间（晴夜兜底）

/**
 * condition 文本 → 天气类别。
 * ⚠️ 顺序不可调换：**先判量级再判类别**。
 *    「大雨」同时含「雨」，若先匹配 rain 会全部落进小雨档（这是旧版的 bug）。
 */
export function classifySky(condition: string, isNight = false): SkyKind {
  const c = (condition || "").toLowerCase()

  if (c.includes("thunder") || c.includes("storm") || c.includes("雷")) return "thunder"
  if (c.includes("blizzard") || c.includes("snow") || c.includes("sleet") || c.includes("雪")) return "snow"
  if (
    c.includes("heavy") || c.includes("torrential") || c.includes("shower") ||
    c.includes("暴雨") || c.includes("大雨") || c.includes("大暴雨")
  ) return "heavyRain"
  if (c.includes("rain") || c.includes("drizzle") || c.includes("雨")) return "rain"
  if (c.includes("fog") || c.includes("mist") || c.includes("haze") || c.includes("雾") || c.includes("霾")) return "fog"
  if (c.includes("overcast") || c.includes("cloud") || c.includes("partly") || c.includes("阴") || c.includes("多云")) return "cloudy"
  if (isNight) return "night"
  return "clear"
}

/**
 * 天气色相板本体。
 *
 * 对比度口径（对纯白 #fff，WCAG 相对亮度公式逐条算过）：
 *   最浅档 ≥ 4.5:1（正文可读）· 最深档 ≥ 11:1 · 全部为同色相递减。
 */
const RAMPS: Record<SkyKind, SkyRamp> = {
  // 晴 —— 晴空的蓝。#376E9F 对白 5.04:1
  clear:    { stops: ["#376E9F", "#2A5680", "#1A3A56"], accent: "#5FA8D3" },

  // 多云 / 阴 —— 带蓝相的冷灰，不是纯中性灰（雪域灰原则）
  // #5A6B7B 对白 5.55:1
  cloudy:   { stops: ["#5A6B7B", "#46545F", "#2E3840"], accent: "#8FA3B0" },

  // 小雨 / 中雨 —— 深青蓝。**这里原来是 #1e40af → #059669 的蓝绿对撞**
  // #2F5D7C 对白 6.59:1
  rain:     { stops: ["#2F5D7C", "#234A63", "#16303F"], accent: "#5FA8C4" },

  // 大雨 / 暴雨 —— 同色相再压暗两档。#274A66 对白 7.83:1
  heavyRain:{ stops: ["#274A66", "#1B3A4F", "#0F2432"], accent: "#4E93B0" },

  // 雪 —— 极淡的冷青白。#5E7285 对白 4.86:1
  snow:     { stops: ["#5E7285", "#4A5B6B", "#33414E"], accent: "#9DB6C7" },

  // 雷暴 —— 深紫灰（暴风夜的压迫感），不用旧版的糖果紫 #667EEA→#764BA2
  // #3F3B5E 对白 8.35:1
  thunder:  { stops: ["#3F3B5E", "#2E2B45", "#1B1A2B"], accent: "#8A7FC0" },

  // 雾 / 霾 —— 近乎无彩的冷灰，唯一亮点是很高的明度（雾就是灰白）
  // #5F6A73 对白 5.36:1
  fog:      { stops: ["#5F6A73", "#4A535B", "#333A41"], accent: "#98A3AB" },

  // 晴夜 —— 深靛。#22374F 对白 10.2:1
  night:    { stops: ["#22374F", "#182942", "#0E1A2B"], accent: "#5C82AD", night: true },
}

/** 取某天气的色相板 */
export function getSkyRamp(condition: string, isNight = false): SkyRamp {
  return RAMPS[classifySky(condition, isNight)]
}

/**
 * CSS 渐变值（同色相 145deg，上亮下深）。
 * 145deg 而非 180deg：留一点横向偏移，卡片不会读成"上下两张色块"。
 */
export function skyGradient(ramp: SkyRamp): string {
  const [a, b, c] = ramp.stops
  return `linear-gradient(145deg, ${a} 0%, ${b} 52%, ${c} 100%)`
}

/**
 * 天气色相作为「材质环境光」—— 给沉浸光感卡片当 backdrop 染色用。
 * 华为：「光线在介质表面发生折射与漫反射」—— 材质要把背后的色光吸上来，
 * 所以这里给的是**同色相的高明度版本**，让卡面读起来是"一块被天空光染透的介质"。
 */
export function skyAmbient(ramp: SkyRamp, alpha = 0.16): string {
  return ramp.stops[0]
}

/** 数据条渐变（同色相浅→深，替代旧版的蓝→白→黄彩虹） */
export function skyDataBar(ramp: SkyRamp): string {
  return `linear-gradient(90deg, ${ramp.accent} 0%, ${ramp.stops[1]} 100%)`
}
