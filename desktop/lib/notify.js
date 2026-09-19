'use strict';

/**
 * 原生系统通知（Windows toast / macOS 通知中心 / Linux libnotify）。
 *
 * 为什么必须放主进程，而不是让页面直接用 Web Notification API：
 *   1. 「窗口不在前台时闪任务栏」「点通知把窗口拉到前台并跳到对应页面」是宿主能力，
 *      Web API 拿不到（Electron 的 renderer 版 Notification 也不给）。
 *   2. 页面被路由切走（组件卸载）后就再也发不出通知 —— 而这恰恰是长任务最常见的场景。
 *   3. 通知开关应当是**应用级**的，不该随页面生命周期存亡。
 *
 * 约定：
 *   - `tag` 相同的通知互相替换（同一会话的多次完成只留最新一条），避免刷屏。
 *   - 极短时间内的重复通知做一次去重（键盘连按 / 双发兜底）。
 *   - 点击通知 → 还原并聚焦主窗口 + 把 `route` 发给渲染进程由其导航。
 */

const fs = require('node:fs');
const path = require('node:path');
const { Notification, app } = require('electron');
const logger = require('./logger');

/** 主窗口可达性由 main.js 注入，避免这里 require 出循环依赖 */
let ctx = {
  getMainWindow: () => null,
  /** 通知被点击时回调，参数为渲染进程可导航的路由（可能为空） */
  onActivate: null,
};

/** tag -> 仍存活的通知，用于「同 tag 替换」 */
const live = new Map();

/** 极短窗口内的同内容去重（防抖） */
let lastKey = '';
let lastAt = 0;
const DEDUPE_MS = 1200;

function configure(next) {
  ctx = { ...ctx, ...next };
}

function isSupported() {
  try {
    return Notification.isSupported();
  } catch {
    return false;
  }
}

/**
 * 通知图标。
 * 打包后 `build/` 被 electron-builder 当 buildResources 排除在 asar 外，
 * 此时返回 undefined，交给系统用应用自身图标（Windows 按 AUMID 关联的图标）。
 */
function resolveIcon() {
  const candidate = path.join(__dirname, '..', 'build', 'icon.png');
  try {
    if (fs.existsSync(candidate)) return candidate;
  } catch {
    /* ignore */
  }
  return undefined;
}

function focusMainWindow(route) {
  const win = ctx.getMainWindow && ctx.getMainWindow();
  if (!win || win.isDestroyed()) return;

  // flashFrame 在窗口重新获得焦点时才由 main.js 关掉，这里只做"拉前台"
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();

  if (route && ctx.onActivate) {
    try {
      ctx.onActivate(route);
    } catch (err) {
      logger.warn('notify', `通知点击回调异常: ${err.message}`);
    }
  }
}

/**
 * 弹一条系统通知。
 *
 * @param {object} payload
 * @param {string} payload.title  必填
 * @param {string} [payload.body]
 * @param {string} [payload.tag]  同 tag 的通知互相替换
 * @param {string} [payload.route] 点击后要跳转的站内路由，如 '/ai-assistant'
 * @param {'success'|'error'|'info'} [payload.level] 仅用于日志与 silent 默认值
 * @param {boolean} [payload.silent] 是否静音（默认成功通知静音、失败通知出声）
 * @returns {{ok: boolean, reason?: string}}
 */
function show(payload) {
  const title = String(payload?.title || '').trim();
  if (!title) return { ok: false, reason: 'empty-title' };
  if (!isSupported()) {
    logger.warn('notify', '当前系统不支持原生通知，已忽略');
    return { ok: false, reason: 'unsupported' };
  }

  const body = String(payload?.body || '').trim();
  const tag = payload?.tag ? String(payload.tag) : '';
  const level = payload?.level || 'info';
  const silent = payload?.silent != null ? !!payload.silent : level !== 'error';

  // 去重：同一内容 1.2s 内只发一次
  const key = `${tag}|${title}|${body}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < DEDUPE_MS) {
    return { ok: false, reason: 'duplicate' };
  }
  lastKey = key;
  lastAt = now;

  // 同 tag 替换：先关掉上一条，让通知中心里同一会话只留最新状态
  if (tag) {
    const prev = live.get(tag);
    if (prev) {
      try {
        prev.close();
      } catch {
        /* ignore */
      }
      live.delete(tag);
    }
  }

  let notification;
  try {
    notification = new Notification({
      title,
      body,
      silent,
      icon: resolveIcon(),
      // Windows：长任务完成通知不该被系统"专注助手"直接吞掉
      timeoutType: level === 'error' ? 'never' : 'default',
    });
  } catch (err) {
    logger.warn('notify', `创建通知失败: ${err.message}`);
    return { ok: false, reason: err.message };
  }

  notification.on('click', () => focusMainWindow(payload?.route));

  // 窗口不在前台时闪任务栏：用户切回来能立刻看到"有事发生"
  const win = ctx.getMainWindow && ctx.getMainWindow();
  if (win && !win.isDestroyed() && !win.isFocused() && process.platform === 'win32') {
    try {
      win.flashFrame(true);
    } catch {
      /* ignore */
    }
  }

  notification.show();
  if (tag) live.set(tag, notification);
  logger.info('notify', `已发送系统通知 [${level}] ${title}${body ? ` — ${body.slice(0, 60)}` : ''}`);
  return { ok: true };
}

/** 主动关闭某个 tag 的通知（例如用户回到前台、任务被撤回） */
function close(tag) {
  if (!tag) return { ok: false, reason: 'empty-tag' };
  const n = live.get(tag);
  if (!n) return { ok: false, reason: 'not-found' };
  try {
    n.close();
  } catch {
    /* ignore */
  }
  live.delete(tag);
  return { ok: true };
}

/** Windows 通知归属需要 AUMID，否则 toast 会显示成 electron.exe */
function applyAppUserModelId() {
  if (process.platform !== 'win32') return;
  try {
    app.setAppUserModelId('site.stravision.desktop');
  } catch (err) {
    logger.warn('notify', `setAppUserModelId 失败: ${err.message}`);
  }
}

/**
 * 注册本模块的 IPC 面。
 *
 * 之所以由 notify.js 自己持有注册逻辑（而不是散在 main.js 的 registerIpc 里），
 * 是为了让 `desktop/verify-notify.cjs` 能直接复用同一份实现 ——
 * 否则验证脚本只能复刻一遍 handler，测的是副本而不是真货。
 */
function registerIpc(ipcMain) {
  ipcMain.handle('desktop:notify-supported', () => ({ supported: isSupported() }));
  ipcMain.handle('desktop:notify', (_event, payload) => show(payload));
  ipcMain.handle('desktop:close-notification', (_event, tag) => close(tag));
}

module.exports = {
  configure,
  isSupported,
  show,
  close,
  applyAppUserModelId,
  registerIpc,
};
