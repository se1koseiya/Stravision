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
 * 桌面壳（Electron preload）暴露到页面的能力。
 * 浏览器部署下 window.stravisionDesktop 为 undefined，调用处一律用 `?.`。
 */
export interface StravisionDesktopBridge {
  isDesktop?: boolean
  onBootstrapStatus?: (handler: (payload: { text?: string; progress?: number; error?: string | null }) => void) => void
  getBackendInfo?: () => Promise<unknown>
  openLogs?: () => void
  retryBootstrap?: () => void
  /** 打开本地服务配置向导（AI / MQTT / 密钥与环境变量）。窗口弹出即返回，错误经 { ok:false, error } 上报 */
  openSetup?: () => Promise<{ ok: boolean; error?: string } | undefined>
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
  /** 手动检查在线更新（新版本会自动后台下载，退出应用时自动安装）；ready=新版本已下载完成可立即安装 */
  checkForUpdate?: () => Promise<{ ok: boolean; currentVersion?: string; latestVersion?: string | null; ready?: boolean; error?: string }>
  /** 立即安装已下载的更新并重启应用 */
  installUpdate?: () => Promise<{ ok: boolean; error?: string }>
}

declare global {
  interface Window {
    stravisionDesktop?: StravisionDesktopBridge
  }
}
