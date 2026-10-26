"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useTheme } from "next-themes"
import {
  IconCaution,
  IconCheck,
  IconDelete,
  IconInfo,
  IconLoading,
  IconRefresh,
} from "@/components/icon"
import { useDesktopHeaderHost } from "@/components/desktop/desktop-window-chrome"
import type {
  DesktopAiPreset,
  DesktopAiProviderSummary,
  DesktopSetupSettings,
} from "@/lib/desktop-mode"
import { AuroraBackdrop } from "./_components/aurora-backdrop"

/**
 * 本地服务配置向导（React 版）。
 *
 * ── 为什么不再是静态页 ──────────────────────────────────────────────
 * 首启向导跑在 bootstrap 的**第 8 步**，此时 Next 服务已经拉起并通过健康检查
 * （见 desktop/main.js 的步骤 6/7/8），所以它完全可以直接是一个普通路由 ——
 * 于是这里复用 Tailwind、项目组件、图标源与 AI 助手那套极光背景，
 * 而不是在一份独立 HTML 里手抄设计系统。
 *
 * ⚠️ 另外两个界面**必须**保持静态，别顺手也搬过来：
 *    - splash.html：启动最开始，Next 还没起来；
 *    - activate.html：bootstrap 第 1 步的授权关卡，同样早于 Next。
 *    它们的窗口里根本加载不到这个路由。
 *
 * ── 版式：「一层容器」+ HDS 沉浸光感（2026-10-07 重做）────────────────
 * 用户要求：「不要太多圆角矩形套圆角矩形」+「用上沉浸光感」。
 * 这正是项目铁律「一层容器」原则（见 .workbuddy/memory/topic-design.md）：
 *   **一个视觉区域内只允许一层有底色/有边框的圆角容器**，
 *   容器内部只用「留白 + hairline 分隔线 + 字号字重层级」。
 *   例外只有两类（是"元素"不是"盒子"）：图标基座、交互控件。
 * 旧版违反得很彻底（甚至出现三级嵌套）：
 *   卡片(rounded-2xl) → 供应商行(rounded-[11px] 灰底) → 图标底
 *   ＋与卡片平级的提示条(rounded-xl) ＋左栏胶囊里再套一圈圆形序号徽章。
 * 现在全窗口**只剩一个圆角容器** = 右侧那块浮起面板，其余全靠 hairline 与字阶：
 *   · 左栏改成**满幅材质面**（不给圆角、不描边）—— 一给圆角它就变成"第二个圆角矩形"，
 *     与右侧面板打架；分隔只由一条内阴影画出的 hairline 完成。
 *   · 面板内部零容器：分组标题 + 留白，行与行之间只有 1px 分隔线。
 *   · 状态标记（默认 / 必需 / 可选）不再做成药丸底，只用**品牌色文字**当语义锚点。
 *
 * ── 沉浸光感的落点 ──────────────────────────────────────────────────
 * 不自己写玻璃，一律走项目唯一的材质源 components/device/material-css.ts：
 *   · 左栏  .dc-mat--regular    —— 承托面材质，把背后的极光吸上来（saturate/brightness）
 *                                  （曾用 --thin：alpha 只 .24，在 #f7f7f9 画布上几乎看不出
 *                                    是"一块面"，沉浸光感等于没有 —— 截图复核后提到 regular）
 *   · 面板  .dc-mat--thick      —— 聚合面板档（官方按"压在多少内容之上"定档）
 *                                  与左栏差一档，形成「承托 < 浮起」的层次，而不是两层同高
 *   · 输入框/选择器 .dc-ctrl--field   · 主按钮 .dc-ctrl--brand（自带品牌色边缘光）
 *   · 次按钮 .dc-ctrl--ghost          · 分段控件 .dc-ctrl--track.dc-seg + .dc-ctrl--thumb
 * 它们读同一组 --mat-* 变量 —— 用户在「设置 → 外观」里改材质厚度时全页同步生效。
 *
 * ⚠️ 正文块用 renderBody() **函数调用**而不是 <Body /> 组件：
 *    组件写在渲染函数内部 = 每次 render 都换一个新的组件类型 → React 会整棵卸载重建，
 *    表现是输入框每敲一个字就失焦。函数调用只是内联 JSX，元素类型稳定。
 *
 * ── 两种模式 ────────────────────────────────────────────────────────
 *   mode=first-run  首启引导：可「稍后配置」（写跳过标记），保存后主进程关窗继续启动；
 *   mode=settings   应用内打开：可「关闭」，保存后切结果态（必要时提示重启）。
 */

const STEPS = ["AI 助手", "外观与偏好"] as const
const LAST_STEP = STEPS.length - 1

const EMPTY_SETTINGS: DesktopSetupSettings = {
  ai: { providerId: "", baseUrl: "", apiKey: "", model: "", defaultModelId: "" },
  mqtt: {
    mode: "local",
    host: "",
    port: 1883,
    username: "",
    password: "",
    subscribeTopic: "",
    publishTopic: "",
    useSSL: false,
    keepalive: 60,
    reconnectPeriod: 5000,
  },
  voice: { dashscopeApiKey: "" },
  secrets: { jwtSecret: "", internalApiSecret: "" },
  env: [],
  personal: { assistantName: "莓小智", userAddress: "", theme: "system" },
}

/** 主进程返回的是 partial，逐段与默认值合并，避免任何一段缺失就整页白屏 */
function mergeSettings(raw: Partial<DesktopSetupSettings> | null): DesktopSetupSettings {
  const s = raw || {}
  return {
    ai: { ...EMPTY_SETTINGS.ai, ...(s.ai || {}) },
    mqtt: { ...EMPTY_SETTINGS.mqtt, ...(s.mqtt || {}) },
    voice: { ...EMPTY_SETTINGS.voice, ...(s.voice || {}) },
    secrets: { ...EMPTY_SETTINGS.secrets, ...(s.secrets || {}) },
    env: Array.isArray(s.env) ? s.env : [],
    personal: { ...EMPTY_SETTINGS.personal, ...(s.personal || {}) },
  }
}

/**
 * 本页版式层。
 *
 * ⚠️ 用**手写类**而不是 Tailwind 工具类 —— 见 topic-design.md：
 *    dev 增量扫描会静默丢掉新增的工具类（divide-x / divide-y 那次的教训），
 *    所以分隔线、行距这类结构性样式一律自己写。
 * ⚠️ 类名前缀 ds-（desktop setup），避免与 AI 助手页的 pb-* 互相覆盖。
 * ⚠️ 这里不能出现反引号（外层就是模板字符串）。
 */
const PAGE_CSS = `
  .ds-root{
    --ds-hair: rgba(9,9,11,.075);
    --ds-hair-soft: rgba(9,9,11,.055);
    --ds-band: rgba(9,9,11,.04);
    --ds-ink: #047857;
    --ds-muted: #71717a;
    --ds-faint: #a1a1aa;
  }
  .dark .ds-root{
    --ds-hair: rgba(255,255,255,.10);
    --ds-hair-soft: rgba(255,255,255,.07);
    --ds-band: rgba(255,255,255,.05);
    --ds-ink: #34D399;
    --ds-muted: #a1a1aa;
    /* ⚠️ 暗态不能用 zinc-500(#71717a) 当"最淡一档"：它压在本页的材质底（比画布亮一档）上
       只剩 ~4:1，截图里辅助说明几乎读不出来。暗态的最淡档 = zinc-400。 */
    --ds-faint: #8f8f97;
  }

  /* ── 左栏：满幅材质面 ──
     刻意 border:0 + border-radius:0：它是一块"承托面"，不是卡片。
     给了圆角就等于在窗口里并排放了两个圆角矩形。浮起投影也去掉，
     分隔只留一条用内阴影画出的 hairline（不占布局、不会叠成双线）。 */
  .ds-rail{
    border: 0;
    border-radius: 0;
    box-shadow: inset -1px 0 0 var(--ds-hair), var(--mat-edge);
  }

  /* ── 右栏标题区：不套容器（本区域容器数 = 0）── */
  .ds-crumb{ display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--ds-faint); }
  .ds-crumb-cur{ font-weight:600; color:var(--ds-ink); }
  .ds-title{ font-size:21px; font-weight:700; letter-spacing:-.02em; }
  .ds-sub{ margin-top:6px; font-size:12.5px; line-height:1.65; color:var(--ds-muted); }

  /* ── 全页唯一的圆角容器 ── */
  .ds-panel{
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .ds-scroll{ flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain; }

  /* ── 分组：只有留白 + hairline，内部零容器 ── */
  .ds-sec{ padding:16px 20px 18px; }
  .ds-sec + .ds-sec{ border-top:1px solid var(--ds-hair-soft); }
  .ds-sec-head{ display:flex; align-items:baseline; gap:8px; margin-bottom:12px; }
  .ds-sec-title{ font-size:13px; font-weight:650; letter-spacing:-.008em; }
  .ds-sec-note{ font-size:11px; color:var(--ds-faint); }
  /* 语义锚点用**文字**而不是色块：给状态做个药丸底 = 面板里又套一层圆角矩形 */
  .ds-tag{ margin-left:auto; flex:none; font-size:10.5px; font-weight:600; color:var(--ds-ink); }

  .ds-field{ display:block; }
  .ds-field + .ds-field{ margin-top:14px; }
  /* 两列字段里，第二个 Field 是网格项而不是兄弟段落 —— 不能吃上面那条 margin-top，
     否则右列会比左列低 14px（对齐塌掉）。 */
  .ds-grid2 > .ds-field + .ds-field{ margin-top:0; }
  .ds-label{ display:block; margin-bottom:6px; font-size:11.5px; font-weight:500; color:var(--ds-muted); }
  /* 辅助说明用 --ds-muted（不是 --ds-faint）：它是"要读的内容"，不是装饰性小字 */
  .ds-hint{ margin-top:6px; font-size:11px; line-height:1.65; color:var(--ds-muted); }
  .ds-link-inline{
    border:0; background:none; padding:0; font:inherit; color:var(--ds-ink);
    cursor:pointer; text-decoration:underline; text-underline-offset:2px;
  }

  /* ── 行列表（已配置供应商）：靠 hairline 分行，每行本身不是盒子 ── */
  .ds-rows{ border-top:1px solid var(--ds-hair-soft); }
  .ds-row{ display:flex; align-items:center; gap:8px; padding:10px 0; border-bottom:1px solid var(--ds-hair-soft); }
  .ds-row-name{ flex:none; font-size:12.5px; font-weight:600; }
  .ds-row-tag{ flex:none; font-size:10.5px; font-weight:600; color:var(--ds-ink); }
  .ds-row-key{
    flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:var(--ds-muted);
  }

  /* ── 左栏步骤条：不用胶囊、不用圆形序号徽章 ──
     选中态 = 左侧一条 2px 品牌色指示条 + 文字变色。指示条用负 left 悬在栏外，
     不占布局、也不产生任何新的矩形。 */
  .ds-steps{ display:flex; flex-direction:column; }
  .ds-step{
    position:relative; display:flex; align-items:center; gap:9px;
    padding:7px 0; background:none; border:0; width:100%; text-align:left; cursor:pointer;
    font-size:12.5px; color:var(--ds-muted); transition:color .18s;
  }
  .ds-step:disabled{ cursor:default; }
  .ds-step::before{
    content:""; position:absolute; left:-12px; top:5px; bottom:5px; width:2px;
    border-radius:1px; background:transparent; transition:background .18s;
  }
  .ds-step[data-state="active"]{ color:var(--ds-ink); font-weight:600; }
  .ds-step[data-state="active"]::before{ background:var(--ds-ink); }
  .ds-step-no{
    flex:none; width:12px; display:inline-flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--ds-faint);
  }
  .ds-step[data-state="active"] .ds-step-no{ color:var(--ds-ink); }

  /* ── 说明文字：一行文字 + 一个图标，不做圆角条 ── */
  .ds-note{ display:flex; gap:8px; align-items:flex-start; font-size:11.5px; line-height:1.7; color:var(--ds-muted); }
  .ds-note-icon{ flex:none; margin-top:2px; color:var(--ds-ink); }

  /* ── 高级设置折叠行：整行可点，默认无底色（交互控件例外）── */
  .ds-disclosure{
    display:flex; align-items:center; gap:8px; width:100%; padding:14px 20px;
    background:none; border:0; cursor:pointer; text-align:left;
    font-size:12.5px; font-weight:600; color:var(--ds-muted);
  }
  .ds-sec + .ds-disclosure{ border-top:1px solid var(--ds-hair-soft); }
  .ds-disclosure:hover{ color:var(--ds-ink); }
  .ds-caret{ flex:none; font-size:9px; transition:transform .2s; }
  .ds-disclosure[data-open="1"] .ds-caret{ transform:rotate(90deg); }
  .ds-disclosure-sub{ margin-left:auto; font-size:11px; font-weight:400; color:var(--ds-faint); }

  /* ── 底部动作区 ── */
  .ds-foot{ border-top:1px solid var(--ds-hair); padding:12px 20px 14px; }
  .ds-foot-row{ display:flex; align-items:center; gap:10px; }
  .ds-err{ min-height:16px; margin-bottom:6px; font-size:11.5px; line-height:1.4; color:#c0392b; }
  .dark .ds-err{ color:#f87171; }
  .ds-fatal{ display:flex; gap:8px; align-items:flex-start; font-size:12px; line-height:1.65; color:#c0392b; }
  .dark .ds-fatal{ color:#f87171; }

  /* ── 控件：全页唯一的圆角来源（HDS 例外条款：交互控件）──
     底色/模糊/边缘光全部由 .dc-ctrl--field 提供，这里只补尺寸与文字。 */
  .ds-ctrl{
    display:block; width:100%; height:38px; padding:0 12px;
    border-radius:10px; font-size:13px; color:#18181b; outline:none;
  }
  .dark .ds-ctrl{ color:#f4f4f5; }
  .ds-ctrl::placeholder{ color:var(--ds-faint); }
  .ds-ctrl:focus-visible{ outline:2px solid rgba(5,150,105,.42); outline-offset:1px; }

  /* 两列字段：用 grid 而不是 flex 宽度相加 —— 后者在窄容器里必然溢出 */
  .ds-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .ds-grid2--port{ grid-template-columns:1fr 104px; }

  /* 环境变量行：两个输入框各套一层定宽/可伸缩的壳。
     ⚠️ 不能直接把 .ds-ctrl（width:100%）放进 flex 行 —— 会按 100% 参与布局，
        加上前面的定宽框与 28px 删除键必然横向溢出（改版前就是这么翻的车）。 */
  .ds-envrow{ display:flex; align-items:center; gap:6px; }
  .ds-envrow + .ds-envrow{ margin-top:6px; }
  .ds-envrow-key{ flex:0 0 38%; min-width:0; }
  .ds-envrow-val{ flex:1 1 auto; min-width:0; }

  /* 分段控件：滑槽与选中块都是 HDS 控件材质，这里只补圆角与字号 */
  .ds-segbar{ display:flex; align-items:center; gap:2px; padding:2px; border-radius:999px; }
  .ds-seg-btn{
    flex:1 1 0%; min-width:0; height:30px; border:0; border-radius:999px;
    background:transparent; cursor:pointer; font-size:12px; color:var(--ds-muted);
    transition:color .18s;
  }
  .ds-seg-btn[data-on="1"]{ font-weight:500; color:#18181b; }
  .dark .ds-seg-btn[data-on="1"]{ color:#f4f4f5; }

  /* 图标按钮：默认态透明（铁律里"交互控件"那一类），hover 才起底 */
  .ds-icon-btn{
    flex:none; display:grid; place-items:center; width:28px; height:28px;
    border:0; border-radius:8px; background:transparent; color:var(--ds-faint);
    cursor:pointer; transition:color .15s, background .15s;
  }
  .ds-icon-btn:hover{ color:#dc2626; background:var(--ds-band); }
  .dark .ds-icon-btn:hover{ color:#f87171; }

  /* 小号幽灵按钮（＋ 添加变量） */
  .ds-btn-sm{
    display:inline-flex; align-items:center; justify-content:center;
    height:30px; padding:0 12px; border-radius:999px;
    font-size:11.5px; color:var(--ds-muted); cursor:pointer; transition:color .15s;
  }
  .ds-btn-sm:hover{ color:var(--ds-ink); }

  /* 结果态：一行品牌色文字，不做圆角条 */
  .ds-ok{ display:flex; gap:8px; align-items:flex-start; font-size:12.5px; line-height:1.7; color:var(--ds-ink); }
  .ds-ok-icon{ flex:none; margin-top:2px; }
`

export default function DesktopSetupPage() {
  // 自绘布局（不用 PageHeader）→ 必须声明顶栏归属，否则全局兜底拖拽带会叠在上面
  useDesktopHeaderHost()

  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  const [mode, setMode] = useState<"first-run" | "settings">("settings")
  const [step, setStep] = useState(0)
  const [settings, setSettings] = useState<DesktopSetupSettings>(EMPTY_SETTINGS)
  const [presets, setPresets] = useState<DesktopAiPreset[]>([])
  const [providers, setProviders] = useState<DesktopAiProviderSummary[]>([])
  const [defaultModelId, setDefaultModelId] = useState("")
  const [advOpen, setAdvOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [fatal, setFatal] = useState("")
  const [error, setError] = useState("")
  const [saved, setSaved] = useState<{ restartRequired: boolean } | null>(null)

  /* ---------------------------------------------------------------- 读取配置 */
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("mode")
    setMode(param === "first-run" ? "first-run" : "settings")

    const api = window.stravisionDesktop
    if (!api?.getDesktopSettings) {
      setFatal("桌面桥未就绪（window.stravisionDesktop 不可用），请重启应用后重试")
      setLoading(false)
      return
    }

    let alive = true
    api
      .getDesktopSettings()
      .then((res) => {
        if (!alive) return
        if (!res?.ok) {
          setFatal(res?.error || "无法读取配置")
          return
        }
        setPresets(res.presets ?? [])
        setProviders(res.aiProviders ?? [])
        setDefaultModelId(res.defaultModelId ?? "")
        setSettings(mergeSettings(res.settings))
      })
      .catch((err: unknown) => {
        if (alive) setFatal(err instanceof Error ? err.message : "无法读取配置")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  /* ---------------------------------------------------------------- 字段更新 */
  const setAi = useCallback((v: Partial<DesktopSetupSettings["ai"]>) => {
    setSettings((p) => ({ ...p, ai: { ...p.ai, ...v } }))
  }, [])
  const setMqtt = useCallback((v: Partial<DesktopSetupSettings["mqtt"]>) => {
    setSettings((p) => ({ ...p, mqtt: { ...p.mqtt, ...v } }))
  }, [])
  const setPersonal = useCallback((v: Partial<DesktopSetupSettings["personal"]>) => {
    setSettings((p) => ({ ...p, personal: { ...p.personal, ...v } }))
  }, [])

  const currentPreset = useMemo(
    () => presets.find((p) => p.id === settings.ai.providerId),
    [presets, settings.ai.providerId],
  )
  /** 自定义端点（预设没有内置 baseUrl）时需要用户手填 */
  const needsBaseUrl = !currentPreset?.baseUrl

  const onPresetChange = (id: string) => {
    const p = presets.find((x) => x.id === id)
    setAi({ providerId: id, baseUrl: p?.baseUrl || "" })
    setError("")
  }

  const reloadProviders = useCallback(async () => {
    const fresh = await window.stravisionDesktop?.getDesktopSettings?.()
    if (fresh?.ok) {
      setProviders(fresh.aiProviders ?? [])
      setDefaultModelId(fresh.defaultModelId ?? "")
    }
  }, [])

  const removeProvider = async (p: DesktopAiProviderSummary) => {
    if (!window.confirm(`确定删除供应商「${p.name || p.id}」？其 API Key 将从本机清除。`)) return
    const res = await window.stravisionDesktop?.aiProviderDelete?.(p.id)
    if (!res?.ok) {
      setError(res?.error || "删除失败")
      return
    }
    await reloadProviders()
  }

  /* ---------------------------------------------------------------- 分步校验
   * 规则与原静态向导逐条一致：
   *   · API Key 允许留空（用户可以先跳过 AI，之后在「管理 → AI 设置」补填）；
   *   · 高级项只在用户展开后才校验 —— 折叠状态不该拦住保存。 */
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!settings.ai.providerId) return "请选择模型服务商"
      if (settings.ai.apiKey && !settings.ai.baseUrl) return "请填写接口地址"
    }
    if (advOpen) {
      if (!settings.mqtt.subscribeTopic) return "订阅主题不能为空"
      if (!settings.mqtt.publishTopic) return "发布主题不能为空"
      if (settings.mqtt.mode === "remote") {
        if (!settings.mqtt.host) return "请填写 MQTT 服务器地址"
        if (!settings.mqtt.username) return "请填写 MQTT 用户名"
        if (!settings.mqtt.password) return "请填写 MQTT 密码"
        if (!(settings.mqtt.port > 0 && settings.mqtt.port < 65536)) return "MQTT 端口不合法"
      }
      for (const item of settings.env) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(item.key)) {
          return `环境变量名不合法：${item.key}`
        }
      }
    }
    return null
  }

  /* ---------------------------------------------------------------- 保存 */
  const handleNext = async () => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    if (step < LAST_STEP) {
      setStep(step + 1)
      setError("")
      return
    }

    const api = window.stravisionDesktop
    if (!api?.saveDesktopSettings) {
      setError("桌面桥未就绪（window.stravisionDesktop 不可用），请重启应用后重试")
      return
    }
    setBusy(true)
    setError("")
    try {
      const res = await api.saveDesktopSettings({ settings })
      if (!res?.ok) {
        setError(res?.error || "保存失败，请重试")
        return
      }
      // 首启：主进程会关窗并继续启动主界面，这里不做收尾
      if (mode === "first-run") return
      setSaved({ restartRequired: !!res.restartRequired })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败，请重试")
    } finally {
      setBusy(false)
    }
  }

  /** 首启 =「稍后配置」写跳过标记；应用内 =「关闭」只关窗 */
  const handleExit = () => {
    const api = window.stravisionDesktop
    if (mode === "first-run") void api?.skipAiSetup?.()
    else void api?.closeSetup?.()
  }

  const restart = () => void window.stravisionDesktop?.relaunch?.()

  /* ---------------------------------------------------------------- 渲染 */
  const subtitle = fatal
    ? fatal
    : saved
      ? saved.restartRequired
        ? "配置已保存。消息服务与环境变量需重启应用后生效。"
        : "配置已保存，已立即生效。"
      : mode === "first-run"
        ? "填写你自己的模型 API Key 与本地服务参数。凭据仅保存在本机。"
        : "修改后保存；消息服务与环境变量需重启应用生效，AI 配置即时生效。"

  /** ⚠️ 函数调用，不是 <Body /> 组件 —— 见文件头「为什么用函数调用」 */
  const renderBody = (): ReactNode => {
    if (loading) {
      return (
        <div className="ds-sec flex items-center gap-2 text-[12.5px]" style={{ color: "var(--ds-faint)" }}>
          <IconLoading size={16} /> 正在读取配置…
        </div>
      )
    }
    if (fatal) {
      return (
        <div className="ds-sec">
          <p className="ds-fatal">
            <IconCaution size={15} className="mt-[2px] shrink-0" />
            <span>{fatal}</span>
          </p>
        </div>
      )
    }
    if (saved) {
      return (
        <div className="ds-sec">
          <p className="ds-ok">
            <IconCheck size={15} className="ds-ok-icon" />
            <span>
              配置已写入本机。
              {saved.restartRequired ? "重启应用后消息服务与环境变量生效。" : "已立即生效。"}
            </span>
          </p>
        </div>
      )
    }

    return step === 0 ? (
      /* ---------------------- 步骤 1：AI 助手 ---------------------- */
      <>
        <section className="ds-sec">
          <p className="ds-note">
            <IconInfo size={14} className="ds-note-icon" />
            <span>
              配置一次，AI 助手、自动化流程、知识库检索与语音对话全部生效。
              <br />
              API Key 留空则暂不启用 AI，可直接下一步先配消息服务。
            </span>
          </p>
        </section>

        {providers.length > 0 && (
          <section className="ds-sec">
            <div className="ds-sec-head">
              <h3 className="ds-sec-title">已配置供应商</h3>
              <span className="ds-sec-note">与网页管理后台共用同一套配置</span>
              <span className="ds-tag">已就绪</span>
            </div>

            <div className="ds-rows">
              {providers.map((p) => (
                <div key={p.id} className="ds-row">
                  <span className="ds-row-name">{p.name || p.id}</span>
                  {p.isDefault && <span className="ds-row-tag">默认</span>}
                  <span className="ds-row-key" title={p.baseUrl}>
                    {p.apiKey || "未配置 Key"}
                  </span>
                  <button
                    type="button"
                    title="删除该供应商"
                    onClick={() => void removeProvider(p)}
                    className="ds-icon-btn"
                  >
                    <IconDelete size={13} />
                  </button>
                </div>
              ))}
            </div>

            <Field
              className="mt-3.5"
              label="默认模型"
              hint="AI 助手选「自动」时用它。可直接输入任意模型 id（如 zai-org/GLM-5.3），不必局限于下拉建议；保存后会自动注册到对应服务商。"
            >
              <input
                className="ds-ctrl dc-ctrl--field"
                list="ds-default-model-options"
                value={defaultModelId}
                placeholder="留空则使用所选服务商的默认模型"
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => {
                  setDefaultModelId(e.target.value)
                  setAi({ defaultModelId: e.target.value })
                }}
              />
              <datalist id="ds-default-model-options">
                {providers.flatMap((p) =>
                  (p.models || [])
                    .filter((m) => m && m.enabled !== false)
                    .map((m) => (
                      <option key={`${p.id}-${m.id}`} value={m.id}>
                        {(p.name || p.id) + (m.name && m.name !== m.id ? ` · ${m.name}` : "")}
                      </option>
                    )),
                )}
              </datalist>
            </Field>
          </section>
        )}

        <section className="ds-sec">
          <div className="ds-sec-head">
            <h3 className="ds-sec-title">模型服务商</h3>
            <span className="ds-sec-note">选择供应商并填入访问凭据</span>
            <span className="ds-tag">必需</span>
          </div>

          <Field label="模型服务商">
            <select
              id="preset"
              className="ds-ctrl dc-ctrl--field"
              value={settings.ai.providerId}
              onChange={(e) => onPresetChange(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          {needsBaseUrl && (
            <Field label="接口地址（Base URL）">
              <input
                className="ds-ctrl dc-ctrl--field"
                value={settings.ai.baseUrl}
                placeholder="https://your-endpoint/v1"
                spellCheck={false}
                onChange={(e) => setAi({ baseUrl: e.target.value })}
              />
            </Field>
          )}

          <Field
            label="API Key"
            hint={
              currentPreset?.consoleUrl ? (
                <>
                  获取 Key：
                  <button
                    type="button"
                    className="ds-link-inline"
                    onClick={() => window.open(currentPreset.consoleUrl, "_blank")}
                  >
                    {currentPreset.consoleUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </button>
                </>
              ) : undefined
            }
          >
            <input
              className="ds-ctrl dc-ctrl--field"
              type="password"
              value={settings.ai.apiKey}
              placeholder={currentPreset?.keyHint || "sk-…"}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setAi({ apiKey: e.target.value })}
            />
          </Field>

          <Field label="默认模型（可选）">
            <input
              className="ds-ctrl dc-ctrl--field"
              value={settings.ai.model}
              placeholder="留空则使用服务商默认模型"
              spellCheck={false}
              onChange={(e) => setAi({ model: e.target.value })}
            />
          </Field>
        </section>
      </>
    ) : (
      /* ---------------------- 步骤 2：外观与偏好 ---------------------- */
      <>
        <section className="ds-sec">
          <p className="ds-note">
            <IconInfo size={14} className="ds-note-icon" />
            <span>
              这两项随时可以在「管理 → 个性化」里改。下面「高级设置」默认折叠 ——
              MQTT、语音 Key、环境变量等都已经在管理后台开放，绝大多数用户不需要动。
            </span>
          </p>
        </section>

        <section className="ds-sec">
          <div className="ds-sec-head">
            <h3 className="ds-sec-title">个性化</h3>
            <span className="ds-sec-note">AI 助手的名字与它对你的称呼</span>
            <span className="ds-tag">可选</span>
          </div>

          <Field label="助手的名字" hint="AI 助手以此自称，也可在管理后台修改。">
            <input
              className="ds-ctrl dc-ctrl--field"
              value={settings.personal.assistantName}
              placeholder="莓小智"
              spellCheck={false}
              onChange={(e) => setPersonal({ assistantName: e.target.value })}
            />
          </Field>
          <Field label="助手对你的称呼" hint="例如「老板」「小朱」，AI 回复时会自然使用。">
            <input
              className="ds-ctrl dc-ctrl--field"
              value={settings.personal.userAddress}
              placeholder="留空则不特意称呼"
              spellCheck={false}
              onChange={(e) => setPersonal({ userAddress: e.target.value })}
            />
          </Field>
          <Field label="界面外观">
            <select
              className="ds-ctrl dc-ctrl--field"
              value={settings.personal.theme}
              onChange={(e) => setPersonal({ theme: e.target.value })}
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </Field>
        </section>

        <button
          type="button"
          className="ds-disclosure"
          data-open={advOpen ? "1" : "0"}
          onClick={() => setAdvOpen((v) => !v)}
        >
          <span className="ds-caret">▶</span>
          <span>高级设置</span>
          <span className="ds-disclosure-sub">消息服务 / 密钥 / 环境变量</span>
        </button>

        {advOpen && (
          <>
            <section className="ds-sec">
              <div className="ds-sec-head">
                <h3 className="ds-sec-title">消息服务（MQTT）</h3>
                <span className="ds-sec-note">设备数据上报与控制指令通道</span>
                <span className="ds-tag">可选</span>
              </div>

              <p className="ds-note mb-3">
                <IconInfo size={14} className="ds-note-icon" />
                <span>离线使用选「内置服务」即可，应用会自带一个仅监听本机的 broker。</span>
              </p>

              <div className="ds-segbar dc-ctrl--track dc-seg mb-3.5">
                {(
                  [
                    ["local", "内置服务（推荐）"],
                    ["remote", "自建 / 云端 broker"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    data-on={settings.mqtt.mode === value ? "1" : "0"}
                    onClick={() => setMqtt({ mode: value })}
                    className={`ds-seg-btn dc-ctrl--press${
                      settings.mqtt.mode === value ? " dc-ctrl--thumb" : ""
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {settings.mqtt.mode === "remote" && (
                <>
                  <div className="ds-grid2 ds-grid2--port mb-3.5">
                    <Field label="服务器地址">
                      <input
                        className="ds-ctrl dc-ctrl--field"
                        value={settings.mqtt.host}
                        placeholder="mqtt.example.com"
                        spellCheck={false}
                        onChange={(e) => setMqtt({ host: e.target.value })}
                      />
                    </Field>
                    <Field label="端口">
                      <input
                        className="ds-ctrl dc-ctrl--field"
                        type="number"
                        value={settings.mqtt.port}
                        placeholder="1883"
                        onChange={(e) => setMqtt({ port: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  <div className="ds-grid2 mb-3.5">
                    <Field label="用户名">
                      <input
                        className="ds-ctrl dc-ctrl--field"
                        value={settings.mqtt.username}
                        spellCheck={false}
                        autoComplete="off"
                        onChange={(e) => setMqtt({ username: e.target.value })}
                      />
                    </Field>
                    <Field label="密码">
                      <input
                        className="ds-ctrl dc-ctrl--field"
                        type="password"
                        value={settings.mqtt.password}
                        spellCheck={false}
                        autoComplete="off"
                        onChange={(e) => setMqtt({ password: e.target.value })}
                      />
                    </Field>
                  </div>
                </>
              )}

              <div className="ds-grid2 mb-3.5">
                <Field label="订阅主题">
                  <input
                    className="ds-ctrl dc-ctrl--field"
                    value={settings.mqtt.subscribeTopic}
                    spellCheck={false}
                    onChange={(e) => setMqtt({ subscribeTopic: e.target.value })}
                  />
                </Field>
                <Field label="发布主题">
                  <input
                    className="ds-ctrl dc-ctrl--field"
                    value={settings.mqtt.publishTopic}
                    spellCheck={false}
                    onChange={(e) => setMqtt({ publishTopic: e.target.value })}
                  />
                </Field>
              </div>

              <div className="ds-grid2 mb-3.5">
                <Field label="Keepalive（秒）">
                  <input
                    className="ds-ctrl dc-ctrl--field"
                    type="number"
                    value={settings.mqtt.keepalive}
                    onChange={(e) => setMqtt({ keepalive: Number(e.target.value) })}
                  />
                </Field>
                <Field label="重连间隔（毫秒）">
                  <input
                    className="ds-ctrl dc-ctrl--field"
                    type="number"
                    value={settings.mqtt.reconnectPeriod}
                    onChange={(e) => setMqtt({ reconnectPeriod: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <Field label="传输加密">
                <select
                  className="ds-ctrl dc-ctrl--field"
                  value={settings.mqtt.useSSL ? "true" : "false"}
                  onChange={(e) => setMqtt({ useSSL: e.target.value === "true" })}
                >
                  <option value="false">关闭（mqtt://）</option>
                  <option value="true">开启（mqtts://）</option>
                </select>
              </Field>
            </section>

            <section className="ds-sec">
              <div className="ds-sec-head">
                <h3 className="ds-sec-title">密钥与环境变量</h3>
                <span className="ds-sec-note">留空则自动生成并持久化</span>
                <span className="ds-tag">可选</span>
              </div>

              <Field
                label="语音专用 Key（可选）"
                hint="用于语音识别 / 实时对话（DashScope 兼容接口）。留空则复用 AI 助手 Key。"
              >
                <input
                  className="ds-ctrl dc-ctrl--field"
                  type="password"
                  value={settings.voice.dashscopeApiKey}
                  placeholder="留空则复用 AI 助手 Key"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      voice: { ...p.voice, dashscopeApiKey: e.target.value },
                    }))
                  }
                />
              </Field>

              <Field
                label="本地服务密钥（可选）"
                hint="仅在需要与已有数据/服务对齐时填写；改动会使现有登录态失效。"
              >
                <div className="space-y-1.5">
                  <input
                    className="ds-ctrl dc-ctrl--field"
                    type="password"
                    value={settings.secrets.jwtSecret}
                    placeholder="JWT 密钥，留空则自动生成并持久化（推荐）"
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        secrets: { ...p.secrets, jwtSecret: e.target.value },
                      }))
                    }
                  />
                  <input
                    className="ds-ctrl dc-ctrl--field"
                    type="password"
                    value={settings.secrets.internalApiSecret}
                    placeholder="内部服务鉴权密钥，留空自动生成"
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        secrets: { ...p.secrets, internalApiSecret: e.target.value },
                      }))
                    }
                  />
                </div>
              </Field>

              <Field
                label="自定义环境变量"
                hint="启动器管理的键（PORT / DATABASE_URL / JWT_SECRET 等）会被忽略。例如 MQTT_CLIENT_ID、GUARDIAN_CHECK_CRON。"
              >
                {settings.env.map((item, i) => (
                  <div key={i} className="ds-envrow">
                    <div className="ds-envrow-key">
                      <input
                        className="ds-ctrl dc-ctrl--field"
                        value={item.key}
                        placeholder="KEY"
                        spellCheck={false}
                        onChange={(e) =>
                          setSettings((p) => {
                            const env = [...p.env]
                            env[i] = { ...env[i], key: e.target.value }
                            return { ...p, env }
                          })
                        }
                      />
                    </div>
                    <div className="ds-envrow-val">
                      <input
                        className="ds-ctrl dc-ctrl--field"
                        value={item.value}
                        placeholder="值"
                        spellCheck={false}
                        onChange={(e) =>
                          setSettings((p) => {
                            const env = [...p.env]
                            env[i] = { ...env[i], value: e.target.value }
                            return { ...p, env }
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      title="移除"
                      className="ds-icon-btn"
                      onClick={() =>
                        setSettings((p) => ({ ...p, env: p.env.filter((_, j) => j !== i) }))
                      }
                    >
                      <IconDelete size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="ds-btn-sm dc-ctrl--ghost dc-ctrl--press mt-2"
                  onClick={() =>
                    setSettings((p) => ({ ...p, env: [...p.env, { key: "", value: "" }] }))
                  }
                >
                  ＋ 添加变量
                </button>
              </Field>
            </section>
          </>
        )}
      </>
    )
  }

  return (
    <div className="ds-root relative flex h-screen w-screen overflow-hidden bg-[#f7f7f9] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <style>{PAGE_CSS}</style>

      <AuroraBackdrop dark={isDark} />

      {/* 无边框窗口的拖拽条（自绘布局必须自己提供一条可拖区） */}
      <div
        className="absolute inset-x-0 top-0 z-30 h-10"
        style={{ WebkitAppRegion: "drag" } as CSSProperties}
      />

      <div className="relative z-10 flex h-full w-full">
        {/* ============================ 左：满幅材质面 ============================ */}
        <aside className="ds-rail dc-mat dc-mat--regular flex w-[300px] shrink-0 flex-col px-6 pb-6 pt-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/desktop/brand-icon.png"
              alt=""
              className="size-7 shrink-0 rounded-[9px] object-cover"
            />
            <span className="text-[13.5px] font-bold tracking-tight">Stravision</span>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/desktop/setup-mascot.png"
              alt=""
              className="h-[164px] w-[164px] object-contain drop-shadow-[0_14px_26px_rgba(9,9,11,0.14)]"
            />
          </div>

          <div className="mb-[18px]">
            <h2 className="text-[25px] font-bold leading-[1.28] tracking-[-0.022em]">
              你的莓园
              <br />
              即将就绪。
            </h2>
            <p className="mt-2.5 text-[12px] leading-[1.62]" style={{ color: "var(--ds-muted)" }}>
              配置一次，AI 助手、自动化流程、知识库检索与语音对话全部生效。
            </p>
          </div>

          {/* 垂直步骤：进度放着左栏，右侧内容区专心放表单 */}
          {!saved && (
            <nav className="ds-steps mb-3.5" aria-label="配置步骤">
              {STEPS.map((label, i) => {
                const done = i < step
                const state = i === step ? "active" : done ? "done" : "todo"
                return (
                  <button
                    key={label}
                    type="button"
                    className="ds-step"
                    data-state={state}
                    disabled={i > step}
                    onClick={() => {
                      if (i <= step) {
                        setStep(i)
                        setError("")
                      }
                    }}
                  >
                    <span className="ds-step-no">
                      {done ? <IconCheck size={11} /> : i + 1}
                    </span>
                    {label}
                  </button>
                )
              })}
            </nav>
          )}

          <div
            className="pt-3.5 text-[10.5px] leading-normal"
            style={{ borderTop: "1px solid var(--ds-hair)", color: "var(--ds-faint)" }}
          >
            凭据仅保存在本机 · 随时可在管理后台修改
          </div>
        </aside>

        {/* ============================ 右：标题 + 唯一容器 ============================ */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 px-[30px] pb-4 pt-5">
            <div className="ds-crumb">
              <span>配置向导</span>
              <span>›</span>
              <span className="ds-crumb-cur">{saved ? "完成" : STEPS[step]}</span>
            </div>
            <h1 id="title" className="ds-title mt-1.5">
              {mode === "first-run" ? "配置本地服务" : "本地服务配置"}
            </h1>
            <p id="subtitle" className="ds-sub max-w-[520px]">
              {subtitle}
            </p>
          </header>

          <section className="ds-panel dc-mat dc-mat--thick mx-[30px] mb-[22px] flex-1">
            <div className="ds-scroll" data-lenis-prevent>
              {renderBody()}
            </div>

            <footer className="ds-foot">
              <div id="err" className="ds-err">
                {error}
              </div>
              <div className="ds-foot-row">
                {!saved && step > 0 && (
                  <button
                    id="btn-prev"
                    type="button"
                    className="dc-ctrl--ghost dc-ctrl--press h-9 rounded-full px-5 text-[12.5px]"
                    onClick={() => {
                      setStep(step - 1)
                      setError("")
                    }}
                  >
                    上一步
                  </button>
                )}
                <div className="flex-1" />
                {saved ? (
                  <>
                    <button
                      id="btn-skip"
                      type="button"
                      className="dc-ctrl--ghost dc-ctrl--press h-9 rounded-full px-5 text-[12.5px]"
                      onClick={handleExit}
                    >
                      关闭
                    </button>
                    {saved.restartRequired && (
                      <button
                        id="btn-restart"
                        type="button"
                        className="dc-ctrl--brand dc-ctrl--press inline-flex h-9 items-center rounded-full px-5 text-[12.5px] font-medium text-white"
                        onClick={restart}
                      >
                        <IconRefresh size={13} className="mr-1.5" />
                        立即重启
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      id="btn-skip"
                      type="button"
                      className="dc-ctrl--ghost dc-ctrl--press h-9 rounded-full px-5 text-[12.5px]"
                      onClick={handleExit}
                      disabled={busy}
                    >
                      {mode === "first-run" ? "稍后配置" : "关闭"}
                    </button>
                    <button
                      id="btn-next"
                      type="button"
                      className="dc-ctrl--brand dc-ctrl--press inline-flex h-9 items-center justify-center rounded-full px-5 text-[12.5px] font-medium text-white disabled:cursor-default disabled:opacity-45"
                      onClick={() => void handleNext()}
                      disabled={busy || loading || !!fatal}
                    >
                      {busy ? <IconLoading size={13} /> : step === LAST_STEP ? "保存" : "下一步"}
                    </button>
                  </>
                )}
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 局部展示件
 * ⚠️ Field 不是容器 —— 没有底色、没有边框、没有圆角。
 *    面板内部只允许「留白 + hairline + 字阶」，见文件头「一层容器」说明。
 *    （旧版的 Card 外壳已删除，它是"圆角矩形套圆角矩形"的主要来源。） */

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className ? `ds-field ${className}` : "ds-field"}>
      <label className="ds-label">{label}</label>
      {children}
      {hint && <p className="ds-hint">{hint}</p>}
    </div>
  )
}
