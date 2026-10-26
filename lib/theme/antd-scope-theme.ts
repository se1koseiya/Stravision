import { theme as antdTheme } from "antd"
import type { ThemeConfig } from "antd"

/**
 * 页面级 antd 主题桥接（亮/暗双轨）
 *
 * 背景：本项目**没有**全局 ConfigProvider，各页面各自包裹。
 * 凡是页面内混用 antd 组件 + Tailwind `dark:` 类，必须用本函数生成 theme，
 * 否则 antd 组件在深色模式下仍是浅色算法（白底黑字）→ 在深色页面上出现刺眼白块。
 *
 * 用法：
 *   const { resolvedTheme } = useTheme()
 *   const isDark = resolvedTheme === "dark"
 *   <ConfigProvider theme={antdScopeTheme(isDark)}> ... </ConfigProvider>
 *
 * 色板统一走 WorkBuddy 配色体系（2026-09-26）：
 *   · 中性阶 = c-gray 暖灰（#F4F4F5 → #27272A），禁止 zinc/slate/antd 默认蓝。
 *   · 强调色 = c-teal 青绿（亮 #059669 / 暗 #34D399）。
 *   · 语义色全彩：c-green / c-amber / c-blue / c-red。
 */

/** WorkBuddy 青绿 c-teal，antd token 只接受真实色值，不接受 var() */
const BRAND_LIGHT = "#059669" // teal-600
const BRAND_DARK = "#34D399" // teal-200

/**
 * antd 字体栈 —— **antd 侧的唯一源**（2026-10-11 收口）。
 *
 * 取值指向 `app/globals.css` 的 `--font-ui`（全站字体唯一源 = 鸿蒙黑体），
 * 落地页 `.landing-legacy-font` 作用域内会整体回退成思源 —— 所以**永远别在这里写字体名**。
 *
 * 🚨 为什么必须显式写：antd v6 把字体做成 CSS 变量 `--ant-font-family`，
 *    默认值 = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, …`（系统栈），
 *    定义在它的 CSS 变量宿主（`.css-var-root` / `.css-var-<hash>`）上并向所有 antd 组件下发；
 *    宿主位于 body 之内 → 「从宿主往下」的一切（含弹窗自绘的左栏 / 标题 / 描述）全被系统栈接管。
 *    实测某设置弹窗：42 个可见文本节点里 41 个是 -apple-system，只有 1 个标题是鸿蒙。
 *
 * 用法：任何自建 `<ConfigProvider theme={...}>` 的 `token` 里都要带上它；
 *      兜底还有一条全局 CSS（globals.css 的 `:root [class*="css-var-"]`）覆盖漏网之鱼。
 */
export const ANTD_FONT_FAMILY =
  "var(--font-ui, -apple-system, BlinkMacSystemFont, sans-serif)"

/** WorkBuddy 语义色（亮 / 暗） */
const SEM = {
  light: {
    success: "#16A34A", // c-green 600
    warning: "#F59E0B", // c-amber 400
    info: "#0EA5E9", // c-blue 600
    error: "#EF4444", // c-red 400
    active: "rgba(5,150,105,0.10)",
  },
  dark: {
    success: "#4ADE80", // c-green 200
    warning: "#FBBF24", // c-amber 200
    info: "#38BDF8", // c-blue 200
    error: "#F87171", // c-red 200
    active: "rgba(52,211,153,0.18)",
  },
} as const

/** 中性阶梯唯一真相源 */
const N = {
  light: {
    text1: "#18181B",
    text2: "#52525B",
    text3: "#71717A",
    surface3: "#F4F4F5",
    line: "#E4E4E7",
  },
  dark: {
    text1: "#F4F4F5",
    text2: "#D4D4D8",
    text3: "#A1A1AA",
    text4: "#71717A",
    surface: "#18181B",
    surface2: "#27272A",
    canvas: "#09090B",
  },
} as const

export function antdScopeTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? BRAND_DARK : BRAND_LIGHT,
      /* 语义色必须显式写 —— 不写的话 antd 算法会注入自带绿/橙/蓝，
         与 WorkBuddy 色板对不上。 */
      colorSuccess: isDark ? SEM.dark.success : SEM.light.success,
      colorWarning: isDark ? SEM.dark.warning : SEM.light.warning,
      colorInfo: isDark ? SEM.dark.info : SEM.light.info,
      colorError: isDark ? SEM.dark.error : SEM.light.error,
      borderRadius: 8,
      controlHeight: 32,
      /* 字体唯一源：app/globals.css 的 --font-ui（HarmonyOS 鸿蒙黑体）
         用变量包一层，落地页 .landing-legacy-font 作用域内可整体回退成思源。
         常量定义见文件上方 ANTD_FONT_FAMILY（antd 侧唯一源，自建 ConfigProvider 也要用它）。 */
      fontFamily: ANTD_FONT_FAMILY,
      ...(isDark
        ? {
            colorBgContainer: N.dark.surface,
            colorBgElevated: N.dark.surface2,
            colorBgLayout: N.dark.canvas,
            colorBorder: "rgba(255,255,255,0.16)",
            colorBorderSecondary: "rgba(255,255,255,0.09)",
            colorText: N.dark.text1,
            colorTextSecondary: N.dark.text2,
            colorTextTertiary: N.dark.text3,
            colorTextQuaternary: N.dark.text4,
            colorFillSecondary: "rgba(255,255,255,0.08)",
            colorFillTertiary: "rgba(255,255,255,0.06)",
            colorFillQuaternary: "rgba(255,255,255,0.04)",
            controlItemBgHover: "rgba(255,255,255,0.06)",
            controlItemBgActive: SEM.dark.active,
            colorSplit: "rgba(255,255,255,0.09)",
          }
        : {
            colorBgContainer: "#FFFFFF",
            colorBgElevated: "#FFFFFF",
            colorBgLayout: "#F7F7F8",
            colorBorder: N.light.line,
            colorBorderSecondary: N.light.surface3,
            colorText: N.light.text1,
            colorTextSecondary: N.light.text2,
            colorTextTertiary: N.light.text3,
            controlItemBgHover: N.light.surface3,
            controlItemBgActive: SEM.light.active,
            colorSplit: N.light.surface3,
          }),
    },
    components: {
      Input: {
        // 深色下输入框底色与容器一致，避免出现比页面更亮/更暗的色块
        colorBgContainer: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
      },
      Button: {
        defaultBg: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
        defaultBorderColor: isDark ? "rgba(255,255,255,0.16)" : N.light.line,
        colorText: isDark ? N.dark.text2 : N.light.text1,
      },
      Segmented: {
        itemSelectedBg: isDark ? "#3F3F46" : "#FFFFFF",
        itemSelectedColor: isDark ? N.dark.text1 : N.light.text1,
        trackBg: isDark ? "rgba(255,255,255,0.06)" : N.light.surface3,
      },
      Drawer: {
        colorBgElevated: isDark ? N.dark.surface : "#FFFFFF",
      },
      Dropdown: {
        colorBgElevated: isDark ? N.dark.surface2 : "#FFFFFF",
      },
      Divider: {
        colorSplit: isDark ? "rgba(255,255,255,0.09)" : N.light.surface3,
      },
      Empty: {
        colorTextDescription: isDark ? N.dark.text3 : N.light.text3,
      },
    },
  }
}
