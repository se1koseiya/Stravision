/**
 * 桌面端运行模式判定。
 *
 * 两套标记并存，用途不同：
 *
 * 1. `NEXT_PUBLIC_STRAVISION_DESKTOP`（构建期内联）
 *    - 由 scripts/desktop/build-next.mjs 注入，Web 构建下为 undefined
 *    - 客户端/服务端组件都直接可用（Next 会把 NEXT_PUBLIC_* 内联进 bundle）
 *    - 用途：隐藏依赖公网服务的入口（第三方 OAuth、支付、在线文档服务）
 *
 * 2. `STRAVISION_DESKTOP` / `STRAVISION_LOCAL_MODE`（运行时环境变量）
 *    - 由 desktop/main.js 注入给 Next 服务进程
 *    - 仅服务端可读，客户端拿到的是 undefined
 *    - 用途：本地单用户语义（如首个注册用户自动成为 super_admin）
 *
 * 判断"是否桌面端"时优先用本模块，不要在业务代码里直接读环境变量，
 * 否则服务端与客户端会得到不一致的结论。
 */

/** 是否运行在桌面端（服务端与客户端结论一致） */
export const IS_DESKTOP_APP = process.env.NEXT_PUBLIC_STRAVISION_DESKTOP === '1'

/**
 * 服务端 / 中间件侧的桌面端判定（**比 IS_DESKTOP_APP 更宽**）。
 *
 * 中间件（`proxy.ts`）与部分服务端运行时可能拿不到构建期内联值，
 * 因此这里额外认可桌面主进程注入的运行时变量（`desktop/lib/config.js` 的 DESKTOP_ENV）。
 * 浏览器里运行时变量恒不存在 ⇒ 两个判定在客户端完全等价，不会出现"服务端说桌面、客户端说不是"。
 */
export function isDesktopApp(): boolean {
  return (
    IS_DESKTOP_APP ||
    process.env.STRAVISION_DESKTOP === '1' ||
    process.env.STRAVISION_LOCAL_MODE === '1'
  )
}

/** 是否服务端本地模式（仅服务端可信） */
export const IS_LOCAL_SERVER_MODE = process.env.STRAVISION_LOCAL_MODE === '1'

/**
 * 桌面端功能开关。
 * 集中声明，便于后续新增降级项时一目了然。
 */
export const DESKTOP_CAPABILITIES = {
  /** 第三方 OAuth 登录（支付宝 / QQ）：依赖公网回调地址与外部授权服务 */
  oauthLogin: !IS_DESKTOP_APP,
  /** 在线支付与订阅：桌面端为本地买断式运行，无计费通道 */
  payment: !IS_DESKTOP_APP,
  /** OnlyOffice 在线编辑：依赖独立部署的 Document Server，离线不可用 */
  onlyOffice: !IS_DESKTOP_APP,
  /** 邮件找回密码：桌面端无发信服务，由本地管理员改密替代 */
  emailRecovery: !IS_DESKTOP_APP,
  /**
   * 注册时的邮箱验证码：依赖邮件发信服务（RESEND_API_KEY）。
   * 桌面端是本地单用户应用，没有发信服务也没有"防刷注册"的必要，
   * 强制邮箱验证会让用户**根本注册不了**（发码接口必然失败）。
   */
  registerEmailVerification: !IS_DESKTOP_APP,
} as const

export type DesktopCapability = keyof typeof DESKTOP_CAPABILITIES

/** 功能是否可用（桌面端未降级的项一律返回 true） */
export function canUse(capability: DesktopCapability): boolean {
  return DESKTOP_CAPABILITIES[capability]
}

/**
 * 本地服务配置（desktop-settings.json）的读写类型 —— 首启向导 /desktop-setup 用。
 * 与 desktop/lib/settings.js 的落盘结构一一对应，字段名不要自行发明。
 */
export interface DesktopAiPreset {
  id: string
  name: string
  /** 为空表示「自定义端点」，需要用户手填 Base URL */
  baseUrl: string
  /** Key 输入框的 placeholder */
  keyHint?: string
  /** 控制台地址（用于「获取 Key」链接） */
  consoleUrl?: string
  models?: Array<{ id: string; name?: string; enabled?: boolean }>
}

/** 已配置供应商摘要；apiKey 是掩码串，明文不出主进程 */
export interface DesktopAiProviderSummary {
  id: string
  name?: string
  apiKey?: string
  baseUrl?: string
  isDefault?: boolean
  models?: Array<{ id: string; name?: string; enabled?: boolean }>
}

export interface DesktopSetupSettings {
  ai: {
    providerId: string
    baseUrl: string
    apiKey: string
    model: string
    /** 模型选「自动」时使用的模型 id */
    defaultModelId: string
  }
  mqtt: {
    mode: 'local' | 'remote'
    host: string
    port: number
    username: string
    password: string
    subscribeTopic: string
    publishTopic: string
    useSSL: boolean
    keepalive: number
    reconnectPeriod: number
  }
  voice: { dashscopeApiKey: string }
  secrets: { jwtSecret: string; internalApiSecret: string }
  env: Array<{ key: string; value: string }>
  personal: { assistantName: string; userAddress: string; theme: string }
}

export interface DesktopSetupBundle {
  ok: boolean
  error?: string
  /** 主进程返回的是 partial（未配置的段可能缺字段），页面侧一律给默认值兜底 */
  settings: Partial<DesktopSetupSettings> | null
  presets: DesktopAiPreset[]
  aiProviders: DesktopAiProviderSummary[]
  defaultModelId: string
  info?: { serverRoot?: string; dataRoot?: string; ports?: { next?: number } | null; isPackaged?: boolean }
}

/**
 * 桌面壳（Electron preload）暴露到页面的能力。
 * 浏览器部署下 window.stravisionDesktop 为 undefined，调用处一律用 `?.`。
 */
export interface StravisionDesktopBridge {
  isDesktop?: boolean
  /**
   * 「模拟数值」（演示数据）开关是否可用。
   *
   * 仅**非安装产物**（`pack.mjs --dir` 出的 win-unpacked / portable zip）为 true ——
   * preload 用 `resources/app-update.yml` 是否存在判定（该文件只有安装类目标才生成）。
   * false / undefined（正式安装包、浏览器部署）时页面上连入口都不渲染。
   */
  demoValuesAvailable?: boolean
  /**
   * 窗口外壳是否真的在「透传桌面」（Windows 11 acrylic / macOS vibrancy）。
   *
   * 由 preload 按平台能力判定后注入。页面的沉浸光感「场景轴」会读它：
   * 一旦窗口背景是玻璃，全站背后就都有桌面壁纸可透 → 不再按路由白名单收缩材质，
   * 否则会出现「窗口是玻璃、里面却全是实色板」的割裂。见 components/device/imv-scene.tsx。
   *
   * false / undefined（Win10、Linux、浏览器部署）→ 仍按白名单，只有设备控制页用玻璃。
   */
  glassShell?: boolean
  onBootstrapStatus?: (handler: (payload: { text?: string; progress?: number; error?: string | null }) => void) => void
  getBackendInfo?: () => Promise<unknown>
  openLogs?: () => void
  retryBootstrap?: () => void
  /** 打开本地服务配置向导（AI / MQTT / 密钥与环境变量）。窗口弹出即返回，错误经 { ok:false, error } 上报 */
  openSetup?: () => Promise<{ ok: boolean; error?: string } | undefined>
  /** 读取本地服务配置（/desktop-setup 向导用） */
  getDesktopSettings?: () => Promise<DesktopSetupBundle>
  /** 保存本地服务配置；restartRequired=true 表示 MQTT / 密钥 / env 变更需重启应用 */
  saveDesktopSettings?: (payload: {
    settings: DesktopSetupSettings
  }) => Promise<{ ok: boolean; error?: string; restartRequired?: boolean }>
  /** 删除一个已配置的 AI 供应商（Key 不经渲染进程） */
  aiProviderDelete?: (providerId: string) => Promise<{ ok: boolean; error?: string }>
  /** AI 预设列表（主进程内置的服务商模板） */
  getAiPresets?: () => Promise<DesktopAiPreset[]>
  /** 首启向导「稍后配置」：写跳过标记，之后不再打扰 */
  skipAiSetup?: () => Promise<{ ok?: boolean }>
  /** 应用内打开的向导「关闭」：只关窗，不写跳过标记 */
  closeSetup?: () => Promise<{ ok?: boolean }>
  /** 重启应用（MQTT / 语音 / env 类配置需重启才生效） */
  relaunch?: () => Promise<unknown>
  /** 系统是否支持原生通知 */
  notifySupported?: () => Promise<{ supported: boolean }>
  /** 弹一条原生系统通知（真正弹与否由 lib/desktop-notify.ts 判定） */
  notify?: (payload: {
    title: string
    body?: string
    route?: string
    tag?: string
    level?: "success" | "error" | "info"
  }) => Promise<{ ok: boolean; reason?: string }>
  /** 关闭指定 tag 的通知 */
  closeNotification?: (tag: string) => Promise<unknown>
  /** 订阅「用户点了通知」（主进程已完成窗口还原与聚焦） */
  onNotificationActivate?: (handler: (payload: { route?: string }) => void) => void
  /**
   * 自绘标题栏：执行一条窗口命令。
   * 命令白名单见 desktop/main.js 的 WINDOW_COMMANDS：
   * minimize / toggle-maximize / close / toggle-fullscreen / reload /
   * toggle-devtools / undo / redo / cut / copy / paste / select-all
   *
   * ⚠️ 主窗口是无边框的（frame:false），原生标题栏与原生菜单都已不存在 ——
   *    窗口功能键**只能**通过这里发起，别再指望系统那套。
   */
  windowCommand?: (command: string) => Promise<{
    ok: boolean
    error?: string
    maximized?: boolean
    fullscreen?: boolean
  }>
  /** 读取当前窗口状态（最大化 / 全屏） */
  windowGetState?: () => Promise<{ maximized: boolean; fullscreen: boolean }>
  /** 订阅窗口状态变化（双击标题栏 / Win+↑ / Aero Snap 同样会触发） */
  onWindowState?: (handler: (payload: { maximized: boolean; fullscreen: boolean }) => void) => void
  /** 应用信息（「关于」面板：名称 / 版本 / Electron / 平台 / 系统展示名） */
  appInfo?: () => Promise<{
    name: string
    version: string
    electron: string
    chrome: string
    node: string
    platform: string
    arch: string
    /** 系统展示名，如「Windows 11 (10.0.26200)」；旧版主进程不返回，故可选 */
    osName?: string
  }>
  /** 手动检查在线更新（新版本会自动后台下载，退出应用时自动安装）；ready=新版本已下载完成可立即安装 */
  checkForUpdate?: () => Promise<{ ok: boolean; currentVersion?: string; latestVersion?: string | null; ready?: boolean; error?: string }>
  /** 立即安装已下载的更新并重启应用 */
  installUpdate?: () => Promise<{ ok: boolean; error?: string }>
  /** 本机授权状态（设备指纹 / 到期时间 / 离线宽限剩余天数） */
  licenseInfo?: () => Promise<{
    deviceId: string
    deviceName: string
    serverUrl: string
    status: string
    message: string
    code: string | null
    label: string | null
    /** true = 凭「离线授权串」导入，不联网、跳过心跳、不受宽限约束 */
    offline: boolean
    expiresAt: number | null
    daysLeft: number | null
    /** 生效的离线宽限天数；离线导入时为 null（不做宽限判定） */
    graceDays: number | null
    graceDaysLeft: number | null
  }>
  /** 提交授权码激活（激活界面用） */
  licenseActivate?: (code: string) => Promise<{ ok: boolean; error?: string; status?: string }>
  /** 导入离线授权串（激活界面用；纯本地验签，不联网） */
  licenseActivateOffline?: (blob: string) => Promise<{ ok: boolean; error?: string; status?: string; offline?: boolean }>
  /** 关闭激活界面并退出应用 */
  licenseQuit?: () => Promise<void>
}

declare global {
  interface Window {
    stravisionDesktop?: StravisionDesktopBridge
  }
}
