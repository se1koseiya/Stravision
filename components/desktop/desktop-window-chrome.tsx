"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/ui/feedback"

import { cn } from "@/lib/utils"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import {
  setSimulatedValues,
  useSimulatedValues,
  useSimulatedValuesAvailable,
} from "@/lib/demo/simulated-metrics"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  IconBook,
  IconCheck,
  IconClose,
  IconCopy,
  IconExperiment,
  IconFolder,
  IconFullScreen,
  IconListCheckbox,
  IconMinus,
  IconPaperclip,
  IconRedo,
  IconRefresh,
  IconScissors,
  IconSettingTwo,
  IconSquare,
  IconSquareSmall,
  IconTerminal,
  IconUndo,
} from "@/components/icon"

/** 「关于」面板用到的主进程信息（与 desktop/main.js 的 desktop:app-info 对齐） */
type DesktopAppInfo = {
  name: string
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
  arch: string
  /** 系统展示名，如「Windows 11 (10.0.26200)」。老版本主进程不返回，故可选。 */
  osName?: string
}

/** 「关于」面板用到的授权摘要（只取展示需要的字段） */
type DesktopLicenseSummary = {
  deviceId: string
  status: string
  label: string | null
  offline: boolean
  daysLeft: number | null
}

const PLATFORM_LABELS: Record<string, string> = {
  win32: "Windows",
  darwin: "macOS",
  linux: "Linux",
}

/**
 * 桌面端自绘标题栏（窗口功能键内联）。
 *
 * ── 为什么要自绘 ────────────────────────────────────────────────────
 * 主窗口是无边框的（`frame: false`，见 desktop/main.js 的 openMainWindow），
 * 且主进程已经调用 `Menu.setApplicationMenu(null)` 把 Electron 的**默认**菜单
 * 整份摘掉 —— 原来那排「编辑/窗口/帮助/关于」不是我们设计的任何东西，
 * 只是框架的兜底菜单（`autoHideMenuBar` 把它藏起来，按 Alt 就冒出来）。
 *
 * 现在窗口 chrome 全部由页面提供：
 *   - 本文件：菜单项（编辑/窗口/帮助/关于）+ 窗口控制键（− □ ✕）+ 「关于」面板；
 *   - `components/page-header.tsx`：把上面两者内联进现有 72px 顶栏，并声明拖拽区；
 *   - 无顶栏的页面（登录页等）由 {@link DesktopWindowChromeProvider} 兜底，
 *     在顶部渲染一条极薄的拖拽带 + 控制键，保证任何时候都能移动/关闭窗口。
 *
 * ── 与 Electron 的边界 ────────────────────────────────────────────
 * 所有动作都经 `window.stravisionDesktop.windowCommand(command)` 走主进程白名单
 * （desktop/main.js 的 WINDOW_COMMANDS），页面侧不碰任何 Electron API。
 *
 * ⚠️ 摘掉原生菜单**不会**影响 Ctrl+C / Ctrl+V 这类快捷键：输入框里的剪贴板行为由
 *    Chromium 内建处理，与菜单无关。菜单里的「编辑」条目之所以要显式接到
 *    webContents 命令上，是因为**点了菜单项**这条路径原本由 role 提供。
 */

/** `-webkit-app-region` 不在 React 的 CSSProperties 里，单独扩一个类型，避免 any */
type AppRegionStyle = React.CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" }

/** 拖拽区：无边框窗口里，只有声明了 drag 的区域才能拖动窗口 */
export const DESKTOP_DRAG: AppRegionStyle = { WebkitAppRegion: "drag" }

/**
 * 拖拽区内的交互元素必须显式声明 no-drag。
 * 🚨 这是最容易漏的一步：父级一旦是 drag，里面的按钮/输入框/菜单**全部点不动**，
 *    表现为"图标画出来了但没反应"。
 */
export const DESKTOP_NO_DRAG: AppRegionStyle = { WebkitAppRegion: "no-drag" }

/** 统一的窗口动作派发：桥缺失时明确报错，不静默失败 */
function runWindowCommand(command: string) {
  const api = window.stravisionDesktop
  if (!api?.windowCommand) {
    toast.error("桌面桥未就绪（window.stravisionDesktop 不可用），请重启应用后重试")
    return
  }
  Promise.resolve(api.windowCommand(command))
    .then((res) => {
      if (res && res.ok === false) toast.error(`窗口操作失败：${res.error ?? "未知错误"}`)
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`窗口操作失败：${message}`)
    })
}

/* ------------------------------------------------------------------ */
/* 窗口控制键                                                           */
/* ------------------------------------------------------------------ */

/**
 * 最小化 / 最大化·还原 / 关闭。
 *
 * 最大化状态必须订阅主进程回推（双击标题栏、Win+↑、Aero Snap 都不走我们的按钮），
 * 否则图标会和真实窗口状态不一致。
 */
export function DesktopWindowControls({ className }: { className?: string }) {
  const [maximized, setMaximized] = React.useState(false)

  React.useEffect(() => {
    const api = window.stravisionDesktop
    if (!api) return
    let alive = true
    api
      .windowGetState?.()
      .then((state) => {
        if (alive && state) setMaximized(!!state.maximized)
      })
      .catch(() => {
        /* 首帧同步失败不影响按钮可用性，忽略 */
      })
    api.onWindowState?.((state) => setMaximized(!!state?.maximized))
    return () => {
      alive = false
    }
  }, [])

  // 尺寸对齐 Windows 原生 caption button 的心智：矮而宽，紧贴右上角
  const btn =
    "dc-ctrl--press flex h-8 w-11 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"

  return (
    <div className={cn("flex items-center gap-0.5", className)} style={DESKTOP_NO_DRAG}>
      <button type="button" aria-label="最小化" title="最小化" className={btn} onClick={() => runWindowCommand("minimize")}>
        <IconMinus size={14} />
      </button>
      <button
        type="button"
        aria-label={maximized ? "向下还原" : "最大化"}
        title={maximized ? "向下还原" : "最大化"}
        className={btn}
        onClick={() => runWindowCommand("toggle-maximize")}
      >
        {maximized ? <IconSquareSmall size={14} /> : <IconSquare size={14} />}
      </button>
      <button
        type="button"
        aria-label="关闭"
        title="关闭"
        className={cn(btn, "hover:bg-red-500 hover:text-white focus-visible:ring-red-500/40")}
        onClick={() => runWindowCommand("close")}
      >
        <IconClose size={15} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 菜单（编辑 / 窗口 / 帮助 / 关于）                                     */
/* ------------------------------------------------------------------ */

/**
 * 从原生菜单搬进来的那几组功能。
 *
 * 取舍：原生菜单里的 role（undo/copy/paste…）在无边框窗口下已无处可见，
 * 但用户对「编辑」这一组的心智还在（尤其是习惯用菜单找「全选/粘贴」的人），
 * 所以按同样的分组重建，动作落到 webContents 的原生编辑命令上。
 */
export function DesktopWindowMenu({ className }: { className?: string }) {
  const router = useRouter()
  const [aboutOpen, setAboutOpen] = React.useState(false)

  /**
   * 「模拟数值」开关。
   *
   * 只在**非安装产物**里存在（`demoValuesAvailable`，见 desktop/preload.js 的判定）：
   * 正式安装包跑在真机上，凭空冒出一个假数据开关只会让用户怀疑数据可信度。
   */
  const demoAvailable = useSimulatedValuesAvailable()
  const demoOn = useSimulatedValues()

  const toggleDemoValues = React.useCallback(() => {
    const next = !demoOn
    setSimulatedValues(next)
    if (next) {
      toast.success("模拟数值已开启", {
        description: "仪表盘 / 设备控制 / 监控页改为演示数据，真实设备上报暂停显示",
      })
    } else {
      toast.success("模拟数值已关闭", { description: "已切回真实设备数据" })
    }
  }, [demoOn])

  /**
   * Ctrl+Shift+M 直接切换。
   * 截图时不想让菜单展开（菜单本身会进画面），快捷键是唯一不污染界面的入口。
   */
  React.useEffect(() => {
    if (!demoAvailable) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== "m") return
      event.preventDefault()
      toggleDemoValues()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [demoAvailable, toggleDemoValues])

  /**
   * 🚨 顶栏本来就是"零余量"布局（1440 下三段实测 294 / 771 / 294，中段导航胶囊自己就占 727px），
   *    所以这几个触发器必须 `shrink-0 whitespace-nowrap`：否则 flex 一压就掉宽，
   *    「编辑」会变成竖排的「编/辑」两行（实测 42×36）。
   *    padding 收到 px-1.5（4 个字 × 2 侧 = 8px/个）：4 个触发器省下的 32px
   *    就是它能不能塞进 294px 左侧段的关键。
   */
  const trigger =
    "shrink-0 whitespace-nowrap rounded-md px-1.5 py-1.5 text-xs leading-none text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-foreground/[0.08] data-[state=open]:text-foreground"
  const item = "dc-ctrl--press gap-2.5 rounded-lg px-2.5 py-2 text-[13px]"
  // portal 到 body 的浮层 —— 全局材质只能从这里消费，见 components/device/material-css.ts
  const content = "dc-mat dc-mat--ultra min-w-[214px] rounded-xl p-1.5"

  const checkForUpdate = async () => {
    const api = window.stravisionDesktop
    if (!api?.checkForUpdate) {
      toast.error("当前环境不支持在线更新")
      return
    }
    const id = toast.loading("正在检查更新…")
    try {
      const res = await api.checkForUpdate()
      if (!res?.ok) {
        toast.error(`检查更新失败：${res?.error ?? "未知错误"}`, { id })
        return
      }
      if (res.ready) {
        toast.success(`新版本 ${res.latestVersion ?? ""} 已就绪，正在重启安装…`, { id })
        await api.installUpdate?.()
        return
      }
      if (res.latestVersion && res.latestVersion !== res.currentVersion) {
        toast.message(`发现新版本 ${res.latestVersion}，正在后台下载`, { id })
        return
      }
      toast.success(`已是最新版本（${res.currentVersion ?? "—"}）`, { id })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`检查更新失败：${message}`, { id })
    }
  }

  const openLocalSetup = () => {
    const api = window.stravisionDesktop
    if (!api?.openSetup) {
      toast.error("桌面桥未就绪（window.stravisionDesktop 不可用），请重启应用后重试")
      return
    }
    Promise.resolve(api.openSetup())
      .then((res) => {
        if (res && res.ok === false) toast.error(`无法打开本地服务配置：${res.error ?? "未知错误"}`)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        toast.error(`无法打开本地服务配置：${message}`)
      })
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)} style={DESKTOP_NO_DRAG}>
      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>编辑</DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className={content} data-lenis-prevent>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("undo")}>
            <IconUndo className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">撤销</span>
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("redo")}>
            <IconRedo className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">重做</span>
            <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1.5 my-1" />
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("cut")}>
            <IconScissors className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">剪切</span>
            <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("copy")}>
            <IconCopy className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">复制</span>
            <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("paste")}>
            <IconPaperclip className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">粘贴</span>
            <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("select-all")}>
            <IconListCheckbox className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">全选</span>
            <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>窗口</DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className={content} data-lenis-prevent>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("minimize")}>
            <IconMinus className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">最小化</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("toggle-maximize")}>
            <IconSquare className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">最大化 / 还原</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("toggle-fullscreen")}>
            <IconFullScreen className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">全屏</span>
            <DropdownMenuShortcut>F11</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="mx-1.5 my-1" />
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("reload")}>
            <IconRefresh className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">重新加载</span>
            <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => runWindowCommand("toggle-devtools")}>
            <IconTerminal className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">开发者工具</span>
            <DropdownMenuShortcut>Ctrl+Shift+I</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>帮助</DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className={content} data-lenis-prevent>
          <DropdownMenuItem className={item} onSelect={() => router.push("/help")}>
            <IconBook className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">使用手册</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => void checkForUpdate()}>
            <IconRefresh className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">检查更新</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => window.stravisionDesktop?.openLogs?.()}>
            <IconFolder className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">打开日志目录</span>
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={openLocalSetup}>
            <IconSettingTwo className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">本地服务配置</span>
          </DropdownMenuItem>

          {/* 非安装产物专属：演示数据开关。正式安装包里整块不渲染 */}
          {demoAvailable && (
            <>
              <DropdownMenuSeparator className="mx-1.5 my-1" />
              <DropdownMenuItem
                className={item}
                onSelect={(event) => {
                  // 开关类菜单项不收起菜单：可以连点来回切，省得每次重新展开
                  event.preventDefault()
                  toggleDemoValues()
                }}
              >
                <IconExperiment className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">模拟数值</span>
                {demoOn && <IconCheck className="size-4 shrink-0 text-primary" />}
                <DropdownMenuShortcut>Ctrl+Shift+M</DropdownMenuShortcut>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <button type="button" className={trigger} onClick={() => setAboutOpen(true)}>
        关于
      </button>

      <DesktopAboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 关于                                                                */
/* ------------------------------------------------------------------ */

/**
 * 「关于」信息行。
 *
 * 两种版式：
 * - 短值（版本号 / 授权状态）→ `layout="inline"`，左右两端对齐，同一行放得下。
 * - 长值（运行平台 / 内核 / 设备指纹）→ `layout="stacked"`，标签在上、值在下并允许换行。
 *
 * 🚨 为什么必须分开：`flex justify-between` + 不可换行的右侧 span，
 * 遇到 64 字符的设备指纹会把整行撑破 —— 长值溢出弹窗，连左侧「运行平台」的
 * Windows 版本号都被挤到外面去。所以长值一律改纵向堆叠 + `break-all`。
 * `tabular-nums` 只给短值用（指纹是 hex 串，等宽数字字符反而拉宽行）。
 */
function AboutRow({
  label,
  value,
  layout = "inline",
  copyable = false,
}: {
  label: string
  value: string
  layout?: "inline" | "stacked"
  copyable?: boolean
}) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* 剪贴板不可用时静默降级，不弹错 */
    }
  }

  if (layout === "stacked") {
    return (
      <div className="space-y-1 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {copyable && (
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="复制"
            >
              {copied ? <IconCheck className="size-3" /> : <IconCopy className="size-3" />}
              {copied ? "已复制" : "复制"}
            </button>
          )}
        </div>
        <div className="text-xs font-medium break-all text-foreground">{value}</div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      {/* 版本号这类"标签 + 值"同行会很长，禁 truncate —— 截断会把 5.0.0 显示成 5.0… */}
      <span className="min-w-0 text-right text-xs font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function DesktopAboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [info, setInfo] = React.useState<DesktopAppInfo | null>(null)
  const [license, setLicense] = React.useState<DesktopLicenseSummary | null>(null)

  React.useEffect(() => {
    if (!open) return
    const api = window.stravisionDesktop
    if (!api) return
    let alive = true
    api
      .appInfo?.()
      .then((res) => {
        if (alive) setInfo(res ?? null)
      })
      .catch(() => {
        /* 关于面板取不到信息时降级显示占位，不弹错 */
      })
    api
      .licenseInfo?.()
      .then((res) => {
        if (alive) setLicense(res ?? null)
      })
      .catch(() => {
        /* 同上 */
      })
    return () => {
      alive = false
    }
  }, [open])

  const platformLabel = info ? PLATFORM_LABELS[info.platform] ?? info.platform : "—"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">关于 Stravision 莓界</DialogTitle>
          <DialogDescription className="text-xs">桌面端运行信息</DialogDescription>
        </DialogHeader>

        {/* 短值行：左右两端对齐 */}
        <div className="divide-y divide-border/60">
          <AboutRow label="版本" value={info?.version ?? "—"} />
          <AboutRow label="授权状态" value={license ? license.label || license.status : "—"} />
        </div>

        {/* 长值行：标签在上、值在下换行，避免把弹窗撑破 */}
        <div className="divide-y divide-border/60">
          <AboutRow
            layout="stacked"
            label="运行平台"
            value={info ? `${info.osName || platformLabel} · ${info.arch}` : "—"}
          />
          <AboutRow
            layout="stacked"
            label="内核"
            value={info ? `Electron ${info.electron} · Chromium ${info.chrome}` : "—"}
          />
          {license?.deviceId && (
            <AboutRow layout="stacked" copyable label="设备指纹" value={license.deviceId} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* 全局兜底（无顶栏的页面：登录页等）                                     */
/* ------------------------------------------------------------------ */

const HeaderHostContext = React.createContext<{ setHasHeader: (value: boolean) => void } | null>(null)

/**
 * 根布局挂载。做的事情只有一件：当页面**没有**自绘顶栏时，
 * 在顶部补一条极薄的拖拽带 + 窗口控制键 —— 否则登录页会变成
 * "无边框又没有任何窗口按钮"的死窗口（只能靠 Alt+F4）。
 */
export function DesktopWindowChromeProvider({ children }: { children: React.ReactNode }) {
  const [hasHeader, setHasHeader] = React.useState(false)
  const value = React.useMemo(() => ({ setHasHeader }), [])

  return (
    <HeaderHostContext.Provider value={value}>
      {children}
      <GlobalWindowChrome hasHeader={hasHeader} />
    </HeaderHostContext.Provider>
  )
}

/**
 * 自绘顶栏声明"我在这里"。
 * 用 layoutEffect 而非 effect：否则控制键会先渲染在右上角再被顶栏接管，
 * 首帧能看到一次跳动。
 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

export function useDesktopHeaderHost() {
  const setHasHeader = React.useContext(HeaderHostContext)?.setHasHeader
  useIsomorphicLayoutEffect(() => {
    if (!IS_DESKTOP_APP || !setHasHeader) return
    setHasHeader(true)
    return () => setHasHeader(false)
  }, [setHasHeader])
}

function GlobalWindowChrome({ hasHeader }: { hasHeader: boolean }) {
  // SSR 阶段一律不渲染：桌面判定依赖构建期常量，但顶栏的挂载状态要到客户端才知道，
  // 不 gate 会出现 hydration 前后结构不一致。
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!IS_DESKTOP_APP || !mounted || hasHeader) return null

  /**
   * 🚨 兜底拖拽带必须「三面不挡」——
   *
   * 这是一条盖在**页面最顶层**的 fixed 带子（top:0, h:10 = 40px, z-100）。
   * 它存在的意义只是给"没有自绘顶栏"的页面（登录页等）一个能拖窗口的区域。
   *
   * 它以前是 `pointerEvents: auto`，于是**把任何落在顶部 40px 里的页面元素全吃掉了**：
   * AI 助手页侧栏顶那排图标（y=10~38）整排点不动，实测点「收起侧边栏」侧栏宽度
   * 260 → 260 毫无反应 —— 命中被这条带子接走，元素本身根本没收到事件。
   *
   * 修法：外带 `pointerEvents: none`（纯背景，永不抢命中），
   * 只让真正需要交互的两块重新开启命中：
   *   ① 控制键容器（自己已声明 no-drag）；
   *   ② 带子自身的拖拽面 —— 用一个内层 `inset-0` 且 `pointerEvents: auto` 的 div 承接，
   *      这样「拖得动窗口」与「不挡下面」两个诉求同时成立。
   *
   * ⚠️ 不能用「把 z-index 调低」来解：拖拽区必须盖在内容之上才拖得动，
   *    一旦降到内容之下，这页就彻底没有可拖区域了。
   * ⚠️ 也不该让每个页面自己记得调 useDesktopHeaderHost()：AI 助手页是自绘布局
   *    （不用 PageHeader），漏调一次就复现本 bug。兜底层自己无害化才是根治。
   */
  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-10" style={{ ...DESKTOP_DRAG, pointerEvents: "none" }}>
      {/* 拖拽面：只有它接收指针；控制键区在其之上单独开启命中 */}
      <div className="absolute inset-0" style={{ WebkitAppRegion: "drag", pointerEvents: "auto" } as AppRegionStyle} />
      <div className="absolute right-2 top-1" style={{ ...DESKTOP_NO_DRAG, pointerEvents: "auto" }}>
        <DesktopWindowControls />
      </div>
    </div>
  )
}
