'use strict';

/**
 * 桌面端 preload：以最小暴露面把宿主能力交给页面。
 * 默认上下文隔离开启、nodeIntegration 关闭，页面无法直接触碰 Node API。
 */

const { contextBridge, ipcRenderer } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 是否是「非安装产物」（`pack.mjs --dir` 出的 win-unpacked / portable zip）。
 *
 * 判据：`resources/app-update.yml` 缺失。
 *   electron-builder 只给**安装类目标**（nsis / dmg / AppImage / deb）写这个文件，
 *   `--dir` 模式恒不生成（见 electron-builder.yml 的 publish 注释）。
 *   因此它的缺失＝没走安装器，不需要在构建流程里额外注入标记。
 *
 * 用来决定页面上要不要出现「模拟数值」开关：正式安装包里永远没有这个入口。
 */
const demoValuesAvailable = (() => {
  if (!process.resourcesPath) return false;
  try {
    return !fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));
  } catch {
    return false;
  }
})();

contextBridge.exposeInMainWorld('stravisionDesktop', {
  /** 页面可据此启用桌面端专属行为（隐藏公网依赖入口等） */
  isDesktop: true,

  /**
   * 「模拟数值」（演示数据）开关是否可用。
   * true = 非安装产物，页面显示入口；false = 正式安装包，入口不渲染。
   * 数据本体在渲染进程侧（lib/demo/simulated-metrics.ts），主进程只给这一个判定。
   */
  demoValuesAvailable,

  /**
   * 窗口外壳是否真的在「透传桌面」（Windows 11 Mica/Acrylic、macOS vibrancy）。
   * 由主进程 openMainWindow 探测后写入环境变量 —— 页面据此决定要不要把画布让出来
   * （<html data-glass-shell="on">，见 app/globals.css「窗口玻璃壳」一节）。
   * 为 false 时页面保持不透明，与改动前逐像素一致。
   */
  glassShell: process.env.STRAVISION_GLASS_SHELL === '1',

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

  /* ---- 授权码（首次启动 / 授权失效时弹出的激活界面） ---- */

  /** 本机设备指纹与当前授权状态 */
  licenseInfo: () => ipcRenderer.invoke('desktop:license-info'),

  /** 提交授权码激活：{ ok:true } 或 { ok:false, error } */
  licenseActivate: (code) => ipcRenderer.invoke('desktop:license-activate', code),

  /** 导入离线授权串（纯本地验签，不联网）：{ ok:true } 或 { ok:false, error } */
  licenseActivateOffline: (blob) => ipcRenderer.invoke('desktop:license-activate-offline', blob),

  /** 关闭激活界面并退出应用 */
  licenseQuit: () => ipcRenderer.invoke('desktop:license-quit'),

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

  /* ---- 自绘标题栏（窗口功能键）---- */
  /* 主窗口是无边框的，原生标题栏与原生菜单都没有了 —— 最小化/最大化/关闭
     以及「编辑」类动作（撤销/复制/粘贴/全选…）全部由页面自绘的标题栏发起。
     命令走白名单，见 desktop/main.js 的 WINDOW_COMMANDS。                    */

  /**
   * 执行一条窗口命令。
   * 支持：minimize / toggle-maximize / close / toggle-fullscreen / reload /
   *       toggle-devtools / undo / redo / cut / copy / paste / select-all
   * @returns {Promise<{ok:boolean, error?:string, maximized?:boolean, fullscreen?:boolean}>}
   */
  windowCommand: (command) => ipcRenderer.invoke('desktop:window-command', command),

  /** 读取当前窗口状态（最大化 / 全屏）：自绘标题栏首帧同步「最大化 ⇄ 还原」图标 */
  windowGetState: () => ipcRenderer.invoke('desktop:window-get-state'),

  /** 订阅窗口状态变化（双击标题栏、Win+↑、Aero Snap 都会触发） */
  onWindowState: (handler) => {
    ipcRenderer.on('desktop:window-state', (_event, payload) => handler(payload));
  },

  /** 应用信息（「关于」面板：版本 / Electron / 平台） */
  appInfo: () => ipcRenderer.invoke('desktop:app-info'),
});
