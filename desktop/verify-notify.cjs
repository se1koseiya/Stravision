'use strict';

/**
 * 原生系统通知链路回归（必须在 Electron 运行时里跑，不能用 node 跑）：
 *
 *   preload 暴露面 → ipcMain handler（复用 lib/notify.js 的 registerIpc）
 *   → notify.show() 真正调用 Electron Notification
 *
 * 为什么值得单独验：这条链路的故障模式全是"静默失败"——
 *   · preload 忘了暴露 notify → 页面里 window.stravisionDesktop.notify 是 undefined，
 *     代码里全是 `?.` 于是不报错也不弹通知；
 *   · main.js 忘了 registerIpc → invoke 抛 "No handler registered"，
 *     但被页面的 void ... 吃掉；
 *   · tag 去重写错 → 正常通知被当成重复吃掉。
 * 这三类都只能靠真实跑一遍才能发现。
 *
 * 用法：pnpm desktop:verify:notify
 * 退出码 0 = 全绿。
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron || {};

/**
 * 自愈：偶发地，启动这个脚本的进程会带着 `ELECTRON_RUN_AS_NODE`（实测在
 * CI/沙箱外壳里会随机出现），此时 Electron **不以主进程身份启动**，
 * `require('electron')` 退化成返回二进制路径字符串（electron 包的 index.js），
 * 主进程 API 全没了。
 *
 * 症状极具迷惑性：同一个脚本、同一条命令，跑十次里有一次报
 * "Cannot read properties of undefined (reading 'whenReady')"。
 *
 * 处理办法：清掉该标记后把同一份二进制再拉一次；
 * 用环境变量做哨兵，避免万一清不掉时无限重启。
 */
if (!app && !process.env.SV_NOTIFY_VERIFY_REEXEC) {
  console.warn(
    `⚠️ require("electron") 返回了 ${typeof electron}（不是主进程 API），清 ELECTRON_RUN_AS_NODE 后重启自身…` +
      `（ELECTRON_RUN_AS_NODE=${process.env.ELECTRON_RUN_AS_NODE ?? 'unset'} process.type=${process.type ?? 'unset'}）`
  );
  const env = { ...process.env, SV_NOTIFY_VERIFY_REEXEC: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const ret = spawnSync(process.execPath, [__filename], { env, stdio: 'inherit' });
  process.exit(ret.status == null ? 1 : ret.status);
}

// 无头/虚拟机里 GPU 进程会反复崩（gpu_process_host.cc ERROR），
// 本脚本不需要渲染，直接关掉硬件加速免得刷满日志
if (app?.disableHardwareAcceleration) app.disableHardwareAcceleration();

if (!app) {
  console.error('❌ 未能取得 Electron app 对象 —— 本脚本必须用 electron 运行（pnpm desktop:verify:notify），不能用 node 跑');
  process.exit(1);
}

const notify = require('./lib/notify');

const results = [];
function check(ok, label, detail) {
  results.push({ ok, label });
  console.log(`${ok ? '✅' : '❌'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
}

// 原生通知在 CI/无头容器里可能不可用，此时降级为"只验链路不验弹出"
let supported = false;

async function main() {
  notify.registerIpc(ipcMain);

  const win = new BrowserWindow({
    show: false,
    width: 480,
    height: 320,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const activated = [];
  notify.configure({
    getMainWindow: () => win,
    onActivate: (route) => {
      activated.push(route);
      if (!win.isDestroyed()) win.webContents.send('desktop:notification-activate', { route });
    },
  });

  // 用临时页面承载 preload：data: URL 下 contextBridge 行为不稳定，落盘更接近真实
  const pageFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sv-notify-')), 'index.html');
  fs.writeFileSync(
    pageFile,
    `<!doctype html><meta charset="utf-8"><title>notify-verify</title>
     <script>
       window.__activated = [];
       if (window.stravisionDesktop?.onNotificationActivate) {
         window.stravisionDesktop.onNotificationActivate((p) => window.__activated.push(p));
       }
     </script>`,
    'utf8'
  );

  await win.loadFile(pageFile);
  // loadFile 的 resolve 早于脚本执行完，等一拍
  await new Promise((r) => setTimeout(r, 600));

  const evalInPage = (code) => win.webContents.executeJavaScript(code, true);

  // ---------- 1. preload 暴露面 ----------
  const surface = await evalInPage(`(() => {
    const d = window.stravisionDesktop;
    if (!d) return { ok: false };
    return {
      ok: true,
      isDesktop: d.isDesktop === true,
      notify: typeof d.notify,
      notifySupported: typeof d.notifySupported,
      closeNotification: typeof d.closeNotification,
      onNotificationActivate: typeof d.onNotificationActivate,
    };
  })()`);
  check(surface.ok && surface.isDesktop, 'preload 暴露 window.stravisionDesktop');
  check(surface.notify === 'function', 'preload 暴露 notify()', `实际 ${surface.notify}`);
  check(surface.notifySupported === 'function', 'preload 暴露 notifySupported()', `实际 ${surface.notifySupported}`);
  check(surface.closeNotification === 'function', 'preload 暴露 closeNotification()', `实际 ${surface.closeNotification}`);
  check(surface.onNotificationActivate === 'function', 'preload 暴露 onNotificationActivate()', `实际 ${surface.onNotificationActivate}`);

  // ---------- 2. 主进程 handler 在册 ----------
  const sup = await evalInPage(`window.stravisionDesktop.notifySupported()`);
  check(typeof sup?.supported === 'boolean', 'IPC desktop:notify-supported 有回包', JSON.stringify(sup));
  supported = sup?.supported === true;
  console.log(supported ? '   · 本机系统支持原生通知' : '   ⚠️ 本机系统不支持原生通知，后续只验链路');

  // ---------- 3. 空标题必须被拒（防止 UI 传空串刷出无标题通知） ----------
  const empty = await evalInPage(`window.stravisionDesktop.notify({ title: '   ' })`);
  check(empty?.ok === false && empty?.reason === 'empty-title', '空标题被拒 (reason=empty-title)', JSON.stringify(empty));

  // ---------- 4. 正常通知 ----------
  const first = await evalInPage(
    `window.stravisionDesktop.notify({ title: '验收通知 A', body: 'AI 任务已完成', tag: 'verify-tag', route: '/ai-assistant' })`
  );
  if (supported) {
    check(first?.ok === true, 'notify() 返回 ok', JSON.stringify(first));
  } else {
    check(first?.ok === false && first?.reason === 'unsupported', '不支持通知时返回 unsupported', JSON.stringify(first));
  }

  // ---------- 5. 同内容 1.2s 内去重 ----------
  const dupe = await evalInPage(`window.stravisionDesktop.notify({ title: '验收通知 A', body: 'AI 任务已完成', tag: 'verify-tag' })`);
  check(dupe?.ok === false && dupe?.reason === 'duplicate', '短时间内同内容被去重 (reason=duplicate)', JSON.stringify(dupe));

  // ---------- 6. 不同内容 / 不同 tag 不被误判为重复 ----------
  const other = await evalInPage(`window.stravisionDesktop.notify({ title: '验收通知 B', body: '另一条', tag: 'verify-tag-2' })`);
  if (supported) {
    check(other?.ok === true, '不同 tag 的通知能正常发出', JSON.stringify(other));
  } else {
    check(other?.ok === false && other?.reason === 'unsupported', '不支持通知时仍返回结构化结果', JSON.stringify(other));
  }

  // ---------- 7. closeNotification 能定位到已发出的通知 ----------
  const closed = await evalInPage(`window.stravisionDesktop.closeNotification('verify-tag')`);
  if (supported) {
    check(closed?.ok === true, 'closeNotification(tag) 关闭成功', JSON.stringify(closed));
  } else {
    check(closed?.ok === false && closed?.reason === 'not-found', '未发出过该 tag 时返回 not-found', JSON.stringify(closed));
  }
  const closedMissing = await evalInPage(`window.stravisionDesktop.closeNotification('')`);
  check(closedMissing?.ok === false, '空 tag 被拒', JSON.stringify(closedMissing));

  // ---------- 8. 点击通知 → 渲染进程收到 desktop:notification-activate ----------
  // 真实点击没法在无头环境模拟，这里验证主进程 → 渲染进程这一段的收发（也就是
  // "点通知后页面能导航" 所依赖的那条通道）。
  win.webContents.send('desktop:notification-activate', { route: '/ai-assistant' });
  await new Promise((r) => setTimeout(r, 300));
  const got = await evalInPage(`window.__activated`);
  check(
    Array.isArray(got) && got.length === 1 && got[0]?.route === '/ai-assistant',
    '通知点击事件能送达渲染进程并带 route',
    JSON.stringify(got)
  );

  // onActivate 回调（由 notify.show 的 click 触发）也要能透传给渲染进程
  check(activated.length === 0, '未经点击时 onActivate 不被误触发', JSON.stringify(activated));

  win.destroy();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? '✅ 全部通过' : `❌ ${failed.length} 项失败`}（共 ${results.length} 项）`);
  app.exit(failed.length === 0 ? 0 : 1);
}

app.whenReady().then(main).catch((err) => {
  console.error('验收脚本异常:', err);
  app.exit(1);
});

// 不要把窗口关闭当成退出信号：脚本自己决定退出码
app.on('window-all-closed', () => {});
