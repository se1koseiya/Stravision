'use strict';

/**
 * 桌面端 preload：以最小暴露面把宿主能力交给页面。
 * 默认上下文隔离开启、nodeIntegration 关闭，页面无法直接触碰 Node API。
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stravisionDesktop', {
  /** 页面可据此启用桌面端专属行为（隐藏公网依赖入口等） */
  isDesktop: true,

  /** 订阅启动阶段状态（启动画面使用） */
  onBootstrapStatus: (handler) => {
    ipcRenderer.on('bootstrap:status', (_event, payload) => handler(payload));
  },

  /** 获取本地后端信息（端口等），供调试与"打开日志"入口使用 */
  getBackendInfo: () => ipcRenderer.invoke('desktop:backend-info'),

  /** 打开日志目录（启动失败时的排查入口） */
  openLogs: () => ipcRenderer.invoke('desktop:open-logs'),

  /** 启动失败后重试 */
  retryBootstrap: () => ipcRenderer.invoke('desktop:retry-bootstrap'),

  /* ---- 本地服务配置向导（AI / MQTT / 语音 / 自定义 env） ---- */

  /** 获取预置供应商列表 */
  getAiPresets: () => ipcRenderer.invoke('desktop:ai-presets'),

  /** 读取当前配置（含已生效的 AI 供应商回显） */
  getDesktopSettings: () => ipcRenderer.invoke('desktop:settings-get'),

  /** 删除一个 AI 供应商（向导「已配置供应商」管理区用） */
  aiProviderDelete: (providerId) => ipcRenderer.invoke('desktop:ai-provider-delete', providerId),

  /** 保存配置：AI → data/ai-providers-config.json；MQTT/env → userData/desktop-settings.json */
  saveDesktopSettings: (payload) => ipcRenderer.invoke('desktop:settings-save', payload),

  /** 跳过配置，直接进入应用 */
  skipAiSetup: () => ipcRenderer.invoke('desktop:skip-ai-setup'),

  /** 从应用内重新打开配置向导 */
  openSetup: () => ipcRenderer.invoke('desktop:open-setup'),

  /** 关闭配置向导（应用内打开时用，不写"跳过"标记） */
  closeSetup: () => ipcRenderer.invoke('desktop:close-setup'),

  /** 重启应用（环境变量类配置需要重启才能生效） */
  relaunch: () => ipcRenderer.invoke('desktop:relaunch'),

  /* ---- 在线更新 ---- */

  /** 手动检查更新：{ ok, currentVersion?, latestVersion?, ready?, error? }（ready=新版本已下载完成） */
  checkForUpdate: () => ipcRenderer.invoke('desktop:update-check'),

  /** 立即安装已下载的更新并重启应用 */
  installUpdate: () => ipcRenderer.invoke('desktop:update-install'),

  /* ---- 原生系统通知 ---- */

  /** 当前系统是否支持原生通知（Linux 缺 libnotify 时为 false） */
  notifySupported: () => ipcRenderer.invoke('desktop:notify-supported'),

  /**
   * 弹一条系统通知。
   * 页面只负责"发生了什么事"，是否真的弹（前台不打扰、用户关掉了通知）由页面侧
   * lib/desktop-notify.ts 决定；这里只做宿主能力调用。
   */
  notify: (payload) => ipcRenderer.invoke('desktop:notify', payload),

  /** 关闭某个 tag 的通知 */
  closeNotification: (tag) => ipcRenderer.invoke('desktop:close-notification', tag),

  /** 用户点击了通知（主进程已把窗口拉到前台），参数 { route } */
  onNotificationActivate: (handler) => {
    ipcRenderer.on('desktop:notification-activate', (_event, payload) => handler(payload));
  },
});
