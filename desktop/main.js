'use strict';

/**
 * Stravision 桌面端主进程。
 *
 * 启动顺序（每一步都必须成功，否则应用不可用）：
 *   校验服务端产物 → 建立可写目录映射 → 载入本地密钥
 *   → 内嵌 Postgres 就绪 → 本地 MQTT broker → 拉起 Next/WS/Yjs 子进程
 *   → 健康检查通过 → 打开主窗口
 *
 * 设计取舍说明：
 * - 全部子服务用 Electron 内置 Node 运行（ELECTRON_RUN_AS_NODE），不依赖用户装 Node。
 * - Postgres 必须真库而非 SQLite：业务层有上万行 PG 方言 SQL（见 lib/db/database.ts）。
 * - 起始页为 /login：桌面端不走营销落地页，本地模式无账号时引导注册。
 */

// 🚨 必须是本文件第一条 require：打包形态下 Electron 只给同步 API 做
// app.asar → app.asar.unpacked 的路径映射，异步 spawn 不映射，
// 而 embedded-postgres 是用 spawn 拉 initdb/postgres 的 →
// 不改写路径就会 ENOENT 且 Promise 永不 settle（表现为首启静默卡死）。
// 因为下游模块可能在加载期就解构 child_process.spawn，补丁必须早于它们生效。
require('./lib/spawn-asar-fix').apply();

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, session, shell, ipcMain, dialog, Menu } = require('electron');

const config = require('./lib/config');
const logger = require('./lib/logger');
const links = require('./lib/links');
const secrets = require('./lib/secrets');
const postgres = require('./lib/postgres');
const mqtt = require('./lib/mqtt');
const servers = require('./lib/servers');
const aiProvider = require('./lib/ai-provider');
const webSearch = require('./lib/web-search');
const settings = require('./lib/settings');
const notify = require('./lib/notify');
const license = require('./lib/license');

/**
 * 静态 UI 页面目录（splash / activate 的 html）。
 *
 * ⚠️ 2026-10-07：首启向导**不再**是这里的文件 —— 它改成了 Next 路由 /desktop-setup
 *   （见 app/desktop-setup/page.tsx），由 setupWindow 用 loadURL 打开，不走 file://。
 *   之所以能这么改：向导跑在 bootstrap 第 8 步，此时 Next 已就绪（见下方 bootstrap 步骤 6/7/8）；
 *   而 splash（最早）与 activate（第 1 步授权关卡）都早于 Next，必须保持静态。
 *
 * 🚨 这两个静态页打包态**不能**用 `__dirname` 拼：本机 electron-builder 打出的 app.asar 里，
 *   文件路径是 Windows 反斜杠形态（`\ui\activate.html`）。
 *   Node 的 require 对它容错（所以主进程代码照常加载，问题很隐蔽），
 *   但 Chromium 的 file:// 不做转换 → `loadFile` 恒报 ERR_FILE_NOT_FOUND，
 *   激活窗口 / splash 一个都打不开（已激活的老机器走不到这些界面，所以一直没暴露）。
 *   打包一律走 `<resources>/ui`（由 extraResources 从 desktop/ui 拷贝），绕开 asar 虚拟文件系统。
 */
function uiDir() {
  return app.isPackaged ? path.join(process.resourcesPath, 'ui') : path.join(__dirname, 'ui');
}

/* ------------------------------------------------------------------ */
/* 全局渲染层诊断                                                       */
/* preload 失败 / 渲染进程崩溃若不留痕，用户视角就是"点了没反应"的静默失效   */
/* ------------------------------------------------------------------ */

app.on('web-contents-created', (_event, wc) => {
  wc.on('preload-error', (_ev, preloadPath, err) => {
    logger.error('renderer', `PRELOAD-ERROR wc#${wc.id} path=${preloadPath} ${err && err.stack || err}`);
  });
  wc.on('render-process-gone', (_ev, details) => {
    logger.error('renderer', `RENDER-GONE wc#${wc.id} ${JSON.stringify(details)}`);
  });
});

logger.info('app', `desktop v${app.getVersion()} electron=${process.versions.electron}`);

const WINDOW = {
  width: 1440,
  height: 940,
  /**
   * 🚨 最小宽度 1024 → 1280。
   *
   * 起因：主窗口改成自绘标题栏后，− □ ✕ 由页面顶栏承载。而顶栏本身是"零余量"布局 ——
   * 中段那条导航胶囊自己就占 727px（wrapper 771px），三段实测 1024 下合计 1115px，
   * 本来就横向溢出（改了之前头像与"聊天"就已经被裁）。
   * 实测：1024 时三个控制键落在 x=963/1009/1055 —— **关闭按钮被窗口右边缘裁掉一截**，
   * 用户点不到关闭；1280 时左侧段 214px、右侧段 214px，全部落回窗内、控制键完整可见。
   *
   * 也就是说窗口功能键内联的前提是"顶栏装得下"，1280 是能让这条链完整成立的下限。
   * 若要调回更小值，必须先让顶栏中段可收缩（PageNavigation 的胶囊需要跟着改）。
   */
  minWidth: 1280,
  minHeight: 700,
};

const state = {
  starting: false,
  serversStarted: false,
  backendUrl: null,
  ports: null,
  serverRoot: null,
  dataRoot: null,
  /** 本地服务配置（AI / MQTT / 语音 / 自定义 env），见 lib/settings.js */
  appSettings: null,
  fatalNotice: null,
};

let mainWindow = null;
let splashWindow = null;
let setupWindow = null;
/** 配置向导的完成回调：由 IPC 保存成功 / 跳过 / 窗口关闭三处触发 */
let setupFinish = null;
let activateWindow = null;
/** 激活界面的完成回调：激活成功 / 用户关闭窗口两处触发 */
let activateFinish = null;
/** 'first-run'（首启，允许跳过） | 'settings'（应用内手动打开） */
let setupMode = 'first-run';
let shuttingDown = false;

/** 用户选择"稍后配置"后打标记，避免每次启动都弹出向导 */
const SKIP_FLAG = '.ai-setup-skipped';

/* ------------------------------------------------------------------ */
/* 启动画面状态同步                                                     */
/* ------------------------------------------------------------------ */

/**
 * 最近一次启动状态。
 * IPC 不缓冲：bootstrap() 在 createSplashWindow() 之后立刻开跑，
 * 前几条状态很可能早于渲染进程订阅 onBootstrapStatus 就发出去了，
 * 结果进度条卡在初始值。页面加载完成时回放一次即可。
 */
let lastStatus = null;

function pushStatus(payload) {
  lastStatus = payload;
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('bootstrap:status', payload);
  }
}

function status(text, progress, error) {
  if (error) logger.error('bootstrap', `${text}: ${error}`);
  else logger.info('bootstrap', `${text} (${progress}%)`);
  pushStatus({ text, progress, error: error || null });
}

/* ------------------------------------------------------------------ */
/* 窗口                                                                */
/* ------------------------------------------------------------------ */

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    resizable: false,
    maximizable: false,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 页面就绪后回放最近状态：否则启动初期的进度事件会丢，进度条停在 4%
  splashWindow.webContents.on('did-finish-load', () => {
    if (lastStatus) splashWindow.webContents.send('bootstrap:status', lastStatus);
  });

  splashWindow.loadFile(path.join(uiDir(), 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

/**
 * 窗口「玻璃壳」能力探测（2026-10-22，2026-10-23 两次改判）
 *
 * ── 到底要什么 ──
 *   用户要的是**沉浸光感的模糊感**：窗口背后那层桌面要被「糊」掉再透上来，
 *   不是一块透明玻璃（能数清壁纸上的每一条线）。
 *
 * ── 三种能力的实测差异（本机 Win11 26200 + Electron 44，黑白条纹垫底，
 *    沿窗口中线采 240 点算亮度标准差 —— 糊 = 方差趋零，没糊 = 方差保留）──
 *   · transparent:true    stdev ≈ 30.5  → 条纹原样透上来，**一点都没糊**（只有透明）
 *   · mica                stdev ≈ 0     → 糊成纯色 #F6F6F6，但它糊的是「壁纸主色调」，
 *                                          根本不是窗口背后那块内容，等于没有信息
 *   · acrylic             stdev ≈ 0.4   → **真模糊**：窗口背后的内容被 DWM 采样 + 高斯模糊
 *   ⇒ 要模糊感，Windows 上只有 acrylic 这一条路。
 *
 * ── 代价 ──
 *   · acrylic 带一层系统 tint（亮色偏白、暗色偏黑），所以画布 alpha 不能给太高，
 *     否则 tint 被盖死、看不出「磨砂」（默认值见 app/globals.css 的 --glass-a）；
 *   · DWM 每帧重采样 → 拖动/滚动比 mica 贵，笔记本离电时更明显；
 *     但这是"要模糊"必须付的账，mica 省电却给不了模糊。
 *   · acrylic 与 transparent 互斥：同时给会直接丢掉材质，所以这里**不能**再带 transparent。
 *
 *   macOS 走 vibrancy（系统原生毛玻璃，同样是真模糊，不需要改）。
 *
 * 结果经环境变量传给 preload，再由页面读 window.stravisionDesktop.glassShell：
 * 页面据此写 <html data-glass-shell="on">（画布 token 半透明）与 data-imv-scene="on"。
 */
function detectGlassShell() {
  const platform = process.platform
  if (platform === 'darwin') {
    return {
      enabled: true,
      reason: 'macos:vibrancy',
      windowOptions: { vibrancy: 'under-window', visualEffectState: 'active', transparent: true },
    }
  }
  if (platform !== 'win32') return { enabled: false, reason: `${platform}:unsupported`, windowOptions: {} }

  /* Windows 11 22H2+ 用 acrylic（真模糊）；21H2 也支持。
     Windows 10 没有 system backdrop（DWMWA_SYSTEMBACKDROP_TYPE 是 Win11 才有的），
     这里按 build 号守住 —— 拿不到材质时宁可回到实色，也不要做成一个"看起来漏了"的窗。 */
  const build = Number(String(require('node:os').release()).split('.')[2] || 0)
  if (build >= 22000) return { enabled: true, reason: `win11:${build}:acrylic`, windowOptions: { backgroundMaterial: 'acrylic' } }
  return { enabled: false, reason: `win10:${build}:no-backdrop`, windowOptions: {} }
}

async function openMainWindow(url) {
  const glassShell = detectGlassShell()
  /* preload 与主进程不同进程，环境变量是最短的传递路径（窗口创建前写入即可） */
  process.env.STRAVISION_GLASS_SHELL = glassShell.enabled ? '1' : ''
  logger.info('window', `glass-shell=${glassShell.enabled ? 'on' : 'off'} (${glassShell.reason})`)

  mainWindow = new BrowserWindow({
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    title: 'Stravision',
    /* 玻璃壳启用时**完全不写 backgroundColor**：让系统材质自己拥有窗口背景。
       以前这里写 '#00000000'，但 Electron 文档明确「只有 transparent:true 时 backgroundColor
       的 alpha 才生效」，acrylic 又不能带 transparent —— 这条路径纯属靠运气，正式写法是别碰它。
       未启用时保持原来的白底（启动那一下不会闪黑）。 */
    ...(glassShell.enabled ? {} : { backgroundColor: '#ffffff' }),
    ...glassShell.windowOptions,
    /**
     * 🚨 无边框（自绘标题栏）。
     *
     * 原来这里是系统原生标题栏 + `autoHideMenuBar: true`：
     *   - 原生标题栏那排「编辑/窗口/帮助/关于」其实来自 Electron 的**默认**
     *     application menu（我们从未调用 `Menu.setApplicationMenu`，于是它被自动挂上），
     *     `autoHideMenuBar` 只是把它藏起来，按 Alt 就会在窗口顶部冒出来 ——
     *     和页面自己的顶栏是两套视觉语言，割裂感很明显。
     *   - 现在整个窗口 chrome 交给页面：菜单与 − □ ✕ 由
     *     `components/desktop/desktop-window-chrome.tsx` 自绘，
     *     拖拽区由 PageHeader / 全局兜底层声明 `-webkit-app-region: drag`。
     *
     * 相应地 `configureApplicationMenu()` 会把原生菜单整份摘掉
     * （macOS 例外：系统顶栏菜单不占窗口空间，但整份置空会让 Cmd+C/V/Q 失效，
     *   故只保留一份极简菜单维持标准快捷键）。
     */
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 语音助手的 Silero VAD 依赖 SharedArrayBuffer，
      // Next 侧已下发 COOP/COEP 响应头；Electron 需要放开沙箱以配合
      // 本地回环页面使用 WASM 多线程。
      sandbox: false,
    },
  });

  // 站内跳转留在窗口内，外部链接交给系统浏览器 —— 桌面壳不应内嵌任意外部页面
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (state.backendUrl && target.startsWith(state.backendUrl)) {
      return { action: 'allow' };
    }
    shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (state.backendUrl && target.startsWith(state.backendUrl)) return;
    event.preventDefault();
    shell.openExternal(target);
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 窗口回到前台即停止任务栏闪烁 —— 闪动只是"有事发生"的信号，
  // 用户已经看到窗口了就该收掉（通知本身留在通知中心，不主动关）。
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.flashFrame(false);
      } catch {
        /* ignore */
      }
    }
  });

  /**
   * 窗口状态回推 —— 自绘标题栏的「最大化 ⇄ 还原」按钮图标必须跟着**系统**状态走：
   * 用户双击标题栏、Win+↑、把窗口拖到屏幕边缘做 Aero Snap 时都不经过我们的按钮，
   * 只听按钮点击的话图标会和真实状态不一致。
   */
  const pushWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('desktop:window-state', {
      maximized: mainWindow.isMaximized(),
      fullscreen: mainWindow.isFullScreen(),
    });
  };
  for (const evt of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'restore']) {
    mainWindow.on(evt, pushWindowState);
  }

  await mainWindow.loadURL(`${url}/login`);
}

/**
 * 首启 AI 配置向导。
 * 未配置供应商时，应用内任何 AI 请求都会返回
 * "No AI provider configured"，体验很差；因此首次启动先引导配置。
 * 用户可跳过，跳过状态会持久化，不再重复打扰。
 */
function openSetupWindow({ allowSkip = true } = {}) {
  const dataRoot = state.dataRoot;
  if (setupWindow && !setupWindow.isDestroyed()) {
    // 已存在就强制拉起：focus() 对隐藏窗口无效，show() 才能治愈"幽灵窗口"
    setupWindow.show();
    setupWindow.focus();
    return Promise.resolve('already-open');
  }

  setupMode = allowSkip ? 'first-run' : 'settings';
  logger.info('setup', `创建配置向导窗口 mode=${setupMode}`);

  return new Promise((resolve) => {
    setupWindow = new BrowserWindow({
      // 分栏版式（左品牌面板 300 + 右内容区）：必须是宽扁比例，
      // 竖长条会把左面板压到 175px 塞不下插画与大标题。
      // 660 高在 1280×720 屏上仍留 60px 余量；内容区自身可滚动。
      width: 940,
      height: 660,
      frame: false,
      resizable: false,
      maximizable: false,
      show: false,
      // 与页面底色一致（#f7f7f9），避免加载那一帧先闪一下纯白
      backgroundColor: '#f7f7f9',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // 这些事件发生时 ready-to-show 不会触发 → 窗口永远隐形（用户视角=点了没反应），必须留痕
    setupWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
      logger.error('setup', `向导页面加载失败 code=${code} desc=${desc} url=${url}`);
    });
    setupWindow.webContents.on('render-process-gone', (_event, details) => {
      logger.error('setup', `向导渲染进程退出 reason=${details?.reason} exitCode=${details?.exitCode}`);
    });

    // "获取 Key" 是外部控制台链接，交给系统浏览器，避免向导窗内嵌公网页面
    setupWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    let settled = false;
    setupFinish = (result) => {
      if (settled) return;
      settled = true;
      setupFinish = null;

      if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
      setupWindow = null;

      // 只有首启向导的"稍后配置"才写跳过标记；从应用内手动打开的向导不写，
      // 否则用户下次启动就再也看不到向导了
      if (result === 'skipped' && allowSkip) {
        try {
          fs.writeFileSync(path.join(dataRoot, SKIP_FLAG), new Date().toISOString(), 'utf8');
        } catch {
          /* ignore */
        }
      }
      resolve(result);
    };

    // 关闭窗口：首启时视为"稍后配置"（放行启动）；手动打开时视为普通取消
    setupWindow.on('closed', () => {
      if (setupFinish) setupFinish(allowSkip ? 'skipped' : 'closed');
    });

    // 🚨 向导是**应用内路由**（app/desktop-setup/page.tsx），不是静态页 ——
    //    它在 bootstrap 第 8 步打开，此时 Next 已经拉起并通过健康检查（步骤 6/7），
    //    所以可以直接 loadURL 到本地服务；页面因此能复用 Tailwind、项目组件与
    //    AI 助手那套极光背景，而不用维护一份手抄设计系统的独立 HTML。
    //    ⚠️ 改成静态页会退回「每次调样式都要重抄一遍 token」的老问题，别回退。
    const nextPort = state.ports && state.ports.next;
    if (!nextPort) {
      logger.error('setup', '向导无法加载：Next 端口未就绪（bootstrap 未走到第 6 步）');
      setupFinish('closed');
      return;
    }
    // 用 query 告知页面来源：首启向导允许"稍后配置"，应用内打开的向导不写跳过标记。
    const setupUrl = new URL('/desktop-setup', `http://127.0.0.1:${nextPort}`);
    setupUrl.searchParams.set('mode', setupMode);
    setupWindow.loadURL(setupUrl.toString()).catch((err) => {
      logger.error('setup', `向导 loadURL 失败: ${err?.message ?? err}`);
    });
    setupWindow.once('ready-to-show', () => {
      logger.info('setup', '向导窗口 ready-to-show → show()');
      setupWindow.show();
    });
    // 兜底：ready-to-show 偶发不触发（渲染器首帧异常/事件被吞），2.5s 后强制 show。
    // 最差情况是白窗，也远好过"点了没反应"的隐形窗口。
    setTimeout(() => {
      if (setupWindow && !setupWindow.isDestroyed() && !setupWindow.isVisible()) {
        logger.warn('setup', 'ready-to-show 未触发，兜底强制 show()');
        setupWindow.show();
      }
    }, 2500);
  });
}

/* ------------------------------------------------------------------ */
/* 授权激活界面                                                         */
/* ------------------------------------------------------------------ */

/**
 * 授权激活窗口。
 *
 * 出现时机（bootstrap 里的授权关卡）：
 *   - 本机从未激活；
 *   - 本地授权已损坏 / 与本机不匹配；
 *   - 授权已到期，或超过离线宽限期；
 *   - 服务端明确拒绝（被停用 / 被后台解绑）。
 *
 * 用户关闭窗口 = 放弃激活 → bootstrap 中止并退出应用：
 * 授权是"能不能用"的前置条件，没有可降级的中间态。
 *
 * @returns {Promise<'activated'|'closed'|'already-open'>}
 */
function openActivateWindow() {
  if (activateWindow && !activateWindow.isDestroyed()) {
    activateWindow.show();
    activateWindow.focus();
    return Promise.resolve('already-open');
  }

  logger.info('license', '打开授权激活窗口');

  return new Promise((resolve) => {
    activateWindow = new BrowserWindow({
      // 与首启向导同一套分栏版式，窗口尺寸保持一致
      width: 940,
      height: 660,
      frame: false,
      resizable: false,
      maximizable: false,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    activateWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
      logger.error('license', `激活界面加载失败 code=${code} desc=${desc} url=${url}`);
    });
    activateWindow.webContents.on('render-process-gone', (_event, details) => {
      logger.error('license', `激活界面渲染进程退出 reason=${details?.reason} exitCode=${details?.exitCode}`);
    });

    let settled = false;
    activateFinish = (result) => {
      if (settled) return;
      settled = true;
      activateFinish = null;
      if (activateWindow && !activateWindow.isDestroyed()) activateWindow.close();
      activateWindow = null;
      resolve(result);
    };

    // 直接关窗 = 放弃激活（不是"稍后再说"：没有授权就没有可用的应用）
    activateWindow.on('closed', () => {
      if (activateFinish) activateFinish('closed');
    });

    activateWindow.loadFile(path.join(uiDir(), 'activate.html')).catch((err) => {
      logger.error('license', `激活界面 loadFile 失败: ${err?.message ?? err}`);
    });
    activateWindow.once('ready-to-show', () => activateWindow.show());
    // 与配置向导同款兜底：ready-to-show 偶发不触发时不留下隐形窗口
    setTimeout(() => {
      if (activateWindow && !activateWindow.isDestroyed() && !activateWindow.isVisible()) {
        logger.warn('license', 'ready-to-show 未触发，兜底强制 show()');
        activateWindow.show();
      }
    }, 2500);
  });
}

/**
 * 授权关卡。
 *
 * 取舍说明：
 *   - 本地租约有效就先放行，**不**用联网结果阻塞启动
 *     （客户机房常年断网，不能一断网就用不了）；
 *   - 放行后异步心跳：服务端明确拒绝（403/404）时作废本地授权，
 *     下次启动会重新要求激活；网络不可达则什么都不做，由离线宽限期兜底。
 *
 * @returns {Promise<boolean>} 是否允许继续启动
 */
/** 运行期定时复检句柄（避免重复注册） */
let revocationTimer = null;

/**
 * 运行期每 6 小时核对一次吊销清单 —— 客户不重启也能在半天内收到作废。
 * 命中就弹窗说明并退出；拉不到（断网）什么都不做，由 evaluate 的 overdue 窗口兜底。
 */
function startRevocationTimer() {
  if (revocationTimer) return;
  revocationTimer = setInterval(async () => {
    try {
      const result = await license.checkRevocation();
      if (result.hit) {
        logger.warn('license', '本机授权已被管理员作废，提示后退出');
        dialog
          .showMessageBox({
            type: 'warning',
            buttons: ['退出'],
            defaultId: 0,
            title: '授权已作废',
            message: '该授权已被管理员作废',
            detail: '如需继续使用，请联系管理员重新签发授权码。',
          })
          .then(() => app.quit())
          .catch(() => app.quit());
      }
    } catch (err) {
      logger.warn('license', `运行期吊销复检异常：${err.message}`);
    }
  }, license.RECHECK_INTERVAL);
  // 不阻止应用退出
  if (revocationTimer.unref) revocationTimer.unref();
}

async function ensureLicensed() {
  // ① 启动即核对一次吊销清单（只有租约带 rl 才真的联网；失败不阻塞启动）
  try {
    const rev = await license.checkRevocation();
    if (rev.hit) logger.warn('license', '本机授权码已在吊销清单中');
    else if (rev.offline) logger.warn('license', `吊销清单暂不可达：${rev.error}`);
  } catch (err) {
    logger.warn('license', `启动期吊销复检异常：${err.message}`);
  }

  const current = license.evaluate();

  if (current.ok) {
    logger.info('license', `本地授权有效（${current.status}）`);
    startRevocationTimer();
    if (current.status === 'active') {
      license
        .heartbeat()
        .then((result) => {
          if (!result.ok && result.fatal) {
            logger.warn('license', `服务端拒绝当前授权，作废本地凭据：${result.error}`);
            license.clear();
          }
        })
        .catch((err) => logger.warn('license', `心跳异常：${err.message}`));
    }
    return true;
  }

  logger.warn('license', `需要激活：${current.status} / ${current.message}`);
  const result = await openActivateWindow();
  if (result !== 'activated') {
    logger.warn('license', '用户放弃激活，退出应用');
    return false;
  }
  const after = license.evaluate();
  logger.info('license', `激活完成，当前状态 ${after.status}`);
  return after.ok;
}

/** 深比较两个配置片段是否等价（用于判断是否需要提示重启） */
function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * MQTT / 语音 / 自定义 env / 密钥覆盖都是**注入子进程环境变量**实现的，
 * 只有重启应用才会生效；AI 供应商配置走文件（provider-resolver 按 mtime 失效缓存），
 * 写完即刻生效 —— 因此只改 AI 时不该打扰用户去重启。
 */
function requiresRestart(before, after) {
  return !(
    sameJson(before?.mqtt, after.mqtt)
    && sameJson(before?.voice, after.voice)
    && sameJson(before?.env, after.env)
    && sameJson(before?.secrets, after.secrets)
  );
}

/* ------------------------------------------------------------------ */
/* 权限：桌面端为本机回环页面，放开媒体采集                              */
/* ------------------------------------------------------------------ */

function configurePermissions() {
  // 摄像头巡检、语音助手依赖摄像头与麦克风；
  // 页面来源是 127.0.0.1 本地服务，与浏览器部署（公网页面）的威胁模型不同。
  const allowed = new Set([
    'media',
    'audioCapture',
    'videoCapture',
    'clipboard-read',
    'clipboard-sanitized-write',
    'notifications',
    'fullscreen',
  ]);

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.has(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
}

/* ------------------------------------------------------------------ */
/* 环境变量组装                                                         */
/* ------------------------------------------------------------------ */

function buildServerEnv({ ports, secretKeys, appSettings, mqttPort, dataRoot }) {
  const base = {
    NODE_ENV: 'production',
    PORT: String(ports.next),
    HOSTNAME: '127.0.0.1',
    TZ: 'Asia/Shanghai',

    DATABASE_URL: config.buildDatabaseUrl(ports.postgres),
    JWT_SECRET: secretKeys.JWT_SECRET,
    INTERNAL_API_SECRET: secretKeys.INTERNAL_API_SECRET,

    // ws-server 用该地址回调 Next 的内部 API，必须与实际端口一致
    NEXT_SERVER_URL: `http://127.0.0.1:${ports.next}`,

    WS_SERVER_PORT: String(ports.ws),
    YJS_WS_PORT: String(ports.yjs),
    YJS_WS_HOST: '127.0.0.1',

    // 数据根目录（userData/server-data）。业务侧据此把「本机设备配置」
    // （如摄像头地址）额外落盘一份，PG 数据目录被重建时也不丢用户配置。
    ...(dataRoot ? { STRAVISION_DATA_ROOT: String(dataRoot) } : {}),

    // 业务侧 lib/mqtt-config.ts 强制校验用户名/密码非空，本地 broker 也用同一组。
    // 用户在向导里改成自建 broker 时，下面 settings.toEnv() 会整体覆盖这组值。
    MQTT_HOST: '127.0.0.1',
    MQTT_PORT: String(mqttPort || ports.mqtt),
    MQTT_USERNAME: config.LOCAL_MQTT.username,
    MQTT_PASSWORD: config.LOCAL_MQTT.password,

    // 桌面端离线运行，无自托管 Cap 实例。而 lib/cap.ts 在 NODE_ENV=production
    // 且未配置 CAP_VERIFY_URL/CAP_SECRET_KEY 时"拒绝放行"（防误配绕过），
    // 会直接堵死注册与登录。此处显式关闭。
    CAP_ENABLED: 'false',

    // FFmpeg 绝对路径 + 目录入 PATH：服务端 lib/media/ffmpeg.ts 优先读这个变量，
    // 避免它去逐个猜路径（用户机器上通常没有 FFmpeg）。
    ...config.getFfmpegEnv(),

    ...config.DESKTOP_ENV,
  };

  // 用户在向导里配置的值优先级最高（MQTT / 语音兜底 Key / 自定义环境变量）
  return {
    ...base,
    ...settings.toEnv(appSettings || settings.defaults(), { localMqttPort: mqttPort || ports.mqtt }),
  };
}

/* ------------------------------------------------------------------ */
/* 启动流程                                                             */
/* ------------------------------------------------------------------ */

async function bootstrap() {
  if (state.starting) return;
  state.starting = true;

  try {
    status('正在准备本地运行环境…', 5);

    const ports = config.getPorts();
    const dataRoot = config.getDataRoot();
    state.ports = ports;
    state.dataRoot = dataRoot;

    // 1. 服务端产物校验
    const build = config.checkServerBuild();
    if (!build.ok) {
      throw new Error(`未找到服务端构建产物\n${build.entry}\n请先执行：pnpm desktop:build`);
    }
    state.serverRoot = build.root;

    // 2. 可写目录映射（仅打包后生效；开发态直接使用仓库目录）
    links.apply(build.root, dataRoot, { isPackaged: app.isPackaged });

    // 3. 本地服务配置（向导写入）+ 本地密钥（跨重启稳定，否则每次启动登录态失效）
    const appSettings = settings.read(dataRoot);
    state.appSettings = appSettings;
    const secretKeys = secrets.load(dataRoot);
    // 高级项：允许用户在向导里覆盖自动生成的密钥（用于与已有数据/服务对齐）
    if (appSettings.secrets?.jwtSecret) secretKeys.JWT_SECRET = appSettings.secrets.jwtSecret;
    if (appSettings.secrets?.internalApiSecret) {
      secretKeys.INTERNAL_API_SECRET = appSettings.secrets.internalApiSecret;
    }

    // 3.5 授权关卡。刻意放在数据库之前：
    //     没有授权就没必要初始化 PG / 拉起服务，也避免未授权用户
    //     在磁盘上留下一整套数据目录。未通过则直接退出应用。
    status('正在校验授权…', 12);
    if (!(await ensureLicensed())) {
      pushStatus({ text: '未完成激活', progress: 100, error: '本机尚未完成授权激活' });
      app.quit();
      return;
    }

    // 4. 内嵌数据库
    status('正在初始化本地数据库…', 18);
    await postgres.start({ dataDir: config.getPgDataDir(), port: ports.postgres });

    // 5. 消息服务：默认起内置 broker；用户在向导里选了自建/云端 broker 则跳过本地实例
    const useLocalMqtt = appSettings.mqtt.mode !== 'remote';
    const mqttPort = useLocalMqtt ? appSettings.mqtt.port : ports.mqtt;
    state.mqttPort = mqttPort;

    if (useLocalMqtt) {
      status('正在启动本地消息服务…', 42);
      try {
        await mqtt.start({
          port: mqttPort,
          credentials: {
            username: appSettings.mqtt.username || config.LOCAL_MQTT.username,
            password: appSettings.mqtt.password || config.LOCAL_MQTT.password,
          },
        });
      } catch (err) {
        // 失败不阻断启动，仅设备相关功能降级
        logger.warn('bootstrap', `本地 MQTT 启动失败，设备链路将不可用: ${err.message}`);
      }
    } else {
      status(`正在连接自建消息服务 ${appSettings.mqtt.host}:${appSettings.mqtt.port}…`, 42);
      logger.info('bootstrap', '已按配置跳过内置 MQTT broker（使用自建 / 云端 broker）');
    }

    // 6. 应用服务子进程
    if (!state.serversStarted) {
      status('正在启动应用服务…', 55);
      const env = buildServerEnv({ ports, secretKeys, appSettings, mqttPort, dataRoot });
      // FFmpeg 缺失会让「实时视频监控 / AI 抓帧」整条链路不可用，属于上线前必须暴露的问题，
      // 不静默：写进桌面端日志（%APPDATA%/Stravision/logs）便于售后排查。
      if (env.STRAVISION_FFMPEG_PATH) {
        logger.info('ffmpeg', `已内置 FFmpeg：${env.STRAVISION_FFMPEG_PATH}`);
      } else {
        logger.warn(
          'ffmpeg',
          `未找到内置 FFmpeg（${config.getFfmpegRoot()}），RTMP 实时视频与 AI 抓帧将不可用；请检查安装包是否包含 resources/ffmpeg`,
        );
      }
      servers.startAll({
        serverRoot: build.root,
        env,
        onFatal: (name, code) => {
          state.fatalNotice = `${name} 服务异常退出（code=${code}）`;
          logger.error('bootstrap', state.fatalNotice);
          pushStatus({ text: '应用服务已中断', progress: 100, error: state.fatalNotice });
        },
      });
      state.serversStarted = true;
    }

    // 7. 健康检查
    status('正在等待服务就绪…', 72);
    await servers.waitForHttp(`http://127.0.0.1:${ports.next}/api/health`, {
      timeoutMs: 180000,
      label: 'next',
    });
    await servers.waitForPort(ports.ws, { timeoutMs: 30000, label: 'ws-voice' });
    await servers.waitForPort(ports.yjs, { timeoutMs: 30000, label: 'yjs' });

    // 8. 联网搜索开箱即用。
    //    用户群体不看 API Key，所以这里静默把 webSearchConfig 配好：
    //    授权服务器换 key → 内置应急 key → 内置本地引擎（永远成功）。
    //    已由 admin / 用户手动配置过则原样尊重，不覆盖。
    //    放在 AI 向导之前：用户即使跳导向导，联网搜索也是可用的。
    status('正在配置联网搜索…', 82);
    try {
      const ws = await webSearch.ensureWebSearch(build.root);
      logger.info(
        'web-search',
        `联网搜索就绪 protocol=${ws.protocol} source=${ws.source}${ws.changed ? '（本次已写入）' : ''}`,
      );
    } catch (err) {
      // 配置失败不阻断启动：最差情况是沿用已有配置，聊天与设备功能均不受影响
      logger.warn('web-search', `联网搜索自动配置失败，沿用现有配置：${err.message}`);
    }

    // 9. 首启 AI 助手配置。
    //    桌面端不预置任何供应商凭据（构建时已重置为空调），若用户不填 Key，
    //    AI 对话 / 自动化 / 知识库检索全部返回 "No AI provider configured"。
    //    因此首次启动主动引导；用户可跳过，跳过状态持久化，之后只在应用内设置页改。
    if (!aiProvider.isConfigured(build.root) && !fs.existsSync(path.join(dataRoot, SKIP_FLAG))) {
      status('正在准备 AI 助手…', 88);
      try {
        await openSetupWindow({ allowSkip: true });
      } catch (err) {
        // 向导异常不应阻断启动，主界面照常打开（用户可在设置页补配）
        logger.warn('bootstrap', `AI 配置向导异常，跳过: ${err.message}`);
      }
    }

    // 10. 打开主界面
    status('正在加载界面…', 95);
    state.backendUrl = `http://127.0.0.1:${ports.next}`;
    await openMainWindow(state.backendUrl);

    status('就绪', 100);
    closeSplashWindow();
  } catch (err) {
    logger.error('bootstrap', err);
    state.fatalNotice = err.message;
    pushStatus({ text: '启动失败', progress: 100, error: err.message });
  } finally {
    state.starting = false;
  }
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function registerIpc() {
  ipcMain.handle('desktop:backend-info', () => ({
    version: app.getVersion(),
    backendUrl: state.backendUrl,
    ports: state.ports,
    serverRoot: state.serverRoot,
    dataRoot: state.dataRoot,
    logFile: logger.getLogFile(),
    isPackaged: app.isPackaged,
  }));

  ipcMain.handle('desktop:open-logs', () => {
    const file = logger.getLogFile();
    if (file) shell.showItemInFolder(file);
    else shell.openPath(config.getLogDir());
  });

  ipcMain.handle('desktop:retry-bootstrap', async () => {
    if (state.starting) return { ok: false, reason: '正在启动中' };
    if (state.fatalNotice) state.fatalNotice = null;
    await bootstrap();
    return { ok: !state.fatalNotice };
  });

  /* ---- 授权码 ---- */

  /** 激活界面用：设备指纹 + 当前授权状态 */
  ipcMain.handle('desktop:license-info', () => {
    const current = license.evaluate();
    return {
      deviceId: license.getDeviceId(),
      deviceName: license.getDeviceName(),
      serverUrl: license.serverUrl(),
      status: current.status,
      message: current.message,
      code: current.code ?? null,
      label: current.label ?? null,
      offline: current.offline === true,
      expiresAt: current.expiresAt ?? null,
      daysLeft: current.daysLeft ?? null,
      graceDays: current.graceDays ?? license.GRACE_DAYS,
      graceDaysLeft: current.graceDaysLeft ?? null,
      revokedAt: current.revokedAt ?? null,
      revalidation: current.revalidation ?? null,
    };
  });

  /** 提交授权码：成功后关窗，让 bootstrap 继续往下走 */
  ipcMain.handle('desktop:license-activate', async (_event, code) => {
    try {
      const result = await license.activate(code);
      if (result.ok && activateFinish) activateFinish('activated');
      return result;
    } catch (err) {
      logger.warn('license', `激活请求异常：${err.message}`);
      return { ok: false, error: '无法连接授权服务器，请检查网络后重试' };
    }
  });

  /**
   * 导入离线授权串：纯本地验签，不发任何网络请求。
   * 服务器停机 / 到期 / 域名失效都不影响这条路径 —— 这是"服务器没了也能发授权"的保底通道。
   */
  ipcMain.handle('desktop:license-activate-offline', (_event, blob) => {
    try {
      const result = license.activateOffline(blob);
      if (result.ok && activateFinish) activateFinish('activated');
      return result;
    } catch (err) {
      logger.warn('license', `离线授权导入异常：${err.message}`);
      return { ok: false, error: '离线授权串解析失败，请确认复制完整' };
    }
  });

  /** 放弃激活 → 关窗，bootstrap 随即退出应用 */
  ipcMain.handle('desktop:license-quit', () => {
    if (activateFinish) activateFinish('closed');
    else app.quit();
  });

  /* ---- 本地服务配置向导（AI / MQTT / 语音 / 自定义 env） ---- */

  ipcMain.handle('desktop:ai-presets', () => aiProvider.PRESETS);

  /** 读取当前配置 + 预置供应商，供向导回显 */
  ipcMain.handle('desktop:settings-get', () => {
    if (!state.dataRoot) return { ok: false, error: '本地服务尚未就绪' };

    const current = settings.read(state.dataRoot);
    let aiProviders = [];
    let defaultModelId = '';
    // AI Key 已落在 data/ai-providers-config.json；回显时以实际生效值为准
    if (state.serverRoot) {
      const config = aiProvider.read(state.serverRoot);
      const providers = config.providers || [];
      const active = providers.find((p) => p && p.enabled !== false && p.apiKey);
      if (active) {
        current.ai = {
          providerId: active.id,
          baseUrl: active.baseUrl || '',
          apiKey: active.apiKey,
          model: current.ai?.model || '',
        };
      }
      // 🆕 与 adminUI 融合：完整供应商清单（key 脱敏）+ 默认模型，供向导管理区回显
      const listed = aiProvider.list(state.serverRoot);
      aiProviders = listed.providers;
      defaultModelId = listed.defaultModelId;
    }

    return {
      ok: true,
      settings: current,
      presets: aiProvider.PRESETS,
      aiProviders,
      defaultModelId,
      info: {
        serverRoot: state.serverRoot,
        dataRoot: state.dataRoot,
        ports: state.ports,
        isPackaged: app.isPackaged,
      },
    };
  });

  /**
   * 保存配置。分两处落盘：
   *   - AI 供应商 → <serverRoot>/data/ai-providers-config.json（Next 侧读取，全模块生效）
   *   - 其余（MQTT / 语音 / 自定义 env / 密钥覆盖）→ userData/desktop-settings.json
   *     由启动器注入成子进程环境变量，重启应用后生效。
   */
  ipcMain.handle('desktop:settings-save', (_event, payload) => {
    if (!state.dataRoot || !state.serverRoot) {
      return { ok: false, error: '本地服务尚未就绪' };
    }

    const incoming = payload?.settings || {};

    try {
      // AI 供应商的 Key 只落在 data/ai-providers-config.json（单一数据源，
      // 避免密钥在 userData 里存两份）；desktop-settings.json 只留 providerId 等非敏感回显值。
      const persisted = {
        ...incoming,
        ai: { ...(incoming.ai || {}), apiKey: '' },
      };

      const before = state.appSettings || settings.read(state.dataRoot);
      const saved = settings.save(state.dataRoot, persisted);
      state.appSettings = saved;
      const restartRequired = requiresRestart(before, saved);

      // 再落 AI 供应商（仅在填了 Key 时写，避免把已有配置清空）
      const ai = incoming.ai || {};
      if (ai.providerId && String(ai.apiKey || '').trim()) {
        aiProvider.save(state.serverRoot, {
          providerId: ai.providerId,
          apiKey: ai.apiKey,
          baseUrl: ai.baseUrl,
          model: ai.model,
          // 🆕 向导「默认模型」随保存一起落盘（此前只传 model，改默认模型会被静默丢弃）
          defaultModelId: ai.defaultModelId,
        });
      } else if (ai.defaultModelId && state.serverRoot) {
        // 🆕 没填 Key、只调整了默认模型（adminUI 融合：defaultModelId 独立可改）。
        // 允许预设外的任意模型 id：不归属任何供应商时自动注册到默认供应商，
        // 保证 resolveProvider 运行时可解析（向导已支持自由填写）。
        const config = aiProvider.read(state.serverRoot);
        const modelId = String(ai.defaultModelId).trim();
        const owned = (config.providers || []).some(
          (p) => p && Array.isArray(p.models) && p.models.some((m) => m && m.id === modelId),
        );
        let writable = owned;
        if (!owned) {
          const host = (config.providers || []).find((p) => p && p.isDefault)
            || (config.providers || []).find((p) => p && p.enabled !== false);
          if (host) {
            host.models = Array.isArray(host.models) ? host.models : [];
            host.models.push({ id: modelId, name: modelId, enabled: true });
            writable = true;
            logger.info('ai-provider', `默认模型 ${modelId} 不在预设列表，已注册到供应商 ${host.id}`);
          }
        }
        if (writable) {
          config.defaultModelId = modelId;
          const file = aiProvider.configPath(state.serverRoot);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
          logger.info('ai-provider', `已更新默认模型 model=${modelId}`);
        }
      }

      // 用户存完仍没配 AI（留空跳过）：落跳过标记，
      // 否则下次启动 isConfigured() 依旧为 false，向导会反复弹窗骚扰。
      if (!aiProvider.isConfigured(state.serverRoot)) {
        try {
          fs.writeFileSync(path.join(state.dataRoot, SKIP_FLAG), new Date().toISOString(), 'utf8');
        } catch {
          /* ignore */
        }
      }

      // 首启向导保存即继续启动流程（关窗放行）；
      // 应用内打开的向导保持窗口，由页面展示"立即重启 / 关闭"。
      if (setupFinish && setupMode === 'first-run') setupFinish('saved');
      return { ok: true, restartRequired };
    } catch (err) {
      logger.warn('settings', `保存失败: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });

  /** 跳过（仅首启向导会写跳过标记） */
  ipcMain.handle('desktop:skip-ai-setup', () => {
    if (setupFinish) setupFinish('skipped');
    return { ok: true };
  });

  /** 从应用内重新打开配置向导 */
  ipcMain.handle('desktop:open-setup', async () => {
    logger.info(
      'setup',
      `收到 desktop:open-setup dataRoot=${state.dataRoot ? 'ok' : 'null'} existing=${setupWindow && !setupWindow.isDestroyed() ? 'yes' : 'no'}`
    );
    if (!state.dataRoot) return { ok: false, error: '尚未就绪' };
    if (setupWindow && !setupWindow.isDestroyed()) {
      // show() + focus()：focus 对隐藏/被遮挡窗口不够，show 才保证可见
      setupWindow.show();
      setupWindow.focus();
      return { ok: true };
    }
    try {
      // 不 await 整个 promise —— 它要等窗口关闭才 resolve（首启流程才需要等待）。
      // 应用内打开：窗口弹出即返回，关闭/保存由窗口自身生命周期管理。
      Promise.resolve(openSetupWindow({ allowSkip: false })).catch((err) => {
        logger.error('setup', `向导窗口异常退出: ${err?.message ?? err}`);
      });
      return { ok: true };
    } catch (err) {
      logger.error('setup', `打开本地服务配置失败: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });

  /** 🆕 删除一个 AI 供应商（向导管理区用；key 不经渲染进程） */
  ipcMain.handle('desktop:ai-provider-delete', (_event, providerId) => {
    if (!state.serverRoot) return { ok: false, error: '本地服务尚未就绪' };
    try {
      aiProvider.remove(state.serverRoot, String(providerId || ''));
      return { ok: true };
    } catch (err) {
      logger.warn('ai-provider', `删除供应商失败: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });

  /** 关闭配置向导（应用内打开时使用；不写跳过标记） */
  ipcMain.handle('desktop:close-setup', () => {
    if (setupFinish) setupFinish('closed');
    else if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
    return { ok: true };
  });

  /** 改完环境变量后需要重启应用才能生效 */
  ipcMain.handle('desktop:relaunch', () => {
    logger.info('app', '用户请求重启应用以应用新配置');
    app.relaunch();
    app.exit(0);
    return { ok: true };
  });

  /* ---- 原生系统通知（见 lib/notify.js） ---- */

  notify.registerIpc(ipcMain);

  /* ---- 在线更新（见 initAutoUpdater） ---- */

  /** 手动检查更新：返回 { ok, currentVersion?, latestVersion?, ready?, error? } */
  ipcMain.handle('desktop:update-check', async () => {
    initAutoUpdater();
    if (!autoUpdaterRef) return { ok: false, error: 'updater unavailable' };
    try {
      const result = await autoUpdaterRef.checkForUpdates();
      return {
        ok: true,
        currentVersion: app.getVersion(),
        latestVersion: result?.updateInfo?.version ?? null,
        // ready=true 表示新版本已下载完成（用户可能错过了弹框）→ 前端可直接提供"立即安装"
        ready: updateReadyToInstall != null,
      };
    } catch (err) {
      return { ok: false, error: err && err.message || String(err) };
    }
  });

  /** 立即安装已下载的更新并重启（新版本装完自动拉起） */
  ipcMain.handle('desktop:update-install', () => {
    if (!autoUpdaterRef) return { ok: false, error: 'updater unavailable' };
    logger.info('updater', '用户请求立即安装更新');
    setTimeout(() => {
      try {
        autoUpdaterRef.quitAndInstall(false, true);
      } catch (err) {
        logger.error('updater', `安装失败: ${err && err.message}`);
      }
    }, 0);
    return { ok: true };
  });

  /* ---- 自绘标题栏：窗口功能键 ---------------------------------------- */
  /* 主窗口 frame:false 之后，最小化/最大化/关闭/编辑类动作全部由页面自绘的
     标题栏发起（见 components/desktop/desktop-window-chrome.tsx）。
     这里只做"命令 → Electron API"的映射，不掺任何业务判断。              */

  const WINDOW_COMMANDS = {
    minimize: (win) => win.minimize(),
    'toggle-maximize': (win) => (win.isMaximized() ? win.unmaximize() : win.maximize()),
    close: (win) => win.close(),
    'toggle-fullscreen': (win) => win.setFullScreen(!win.isFullScreen()),
    reload: (win) => win.webContents.reload(),
    'toggle-devtools': (win) => win.webContents.toggleDevTools(),
    // 编辑类：走 webContents 的原生编辑命令。
    // 🚨 摘掉原生菜单后，Ctrl+C/V/X/A/Z 在输入框里照常可用（Chromium 内建处理），
    //    但「编辑」菜单**条目本身**需要显式落到这些命令上，否则点了没反应。
    undo: (win) => win.webContents.undo(),
    redo: (win) => win.webContents.redo(),
    cut: (win) => win.webContents.cut(),
    copy: (win) => win.webContents.copy(),
    paste: (win) => win.webContents.paste(),
    'select-all': (win) => win.webContents.selectAll(),
  };

  /**
   * 窗口功能键统一入口（白名单命令，不接受任意方法名）。
   * @returns {{ok:boolean, error?:string, maximized?:boolean, fullscreen?:boolean}}
   */
  ipcMain.handle('desktop:window-command', (event, command) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || win.isDestroyed()) return { ok: false, error: 'no-window' };

    const run = WINDOW_COMMANDS[String(command)];
    if (!run) {
      logger.warn('window', `未知窗口命令: ${command}`);
      return { ok: false, error: `unknown-command:${command}` };
    }
    try {
      run(win);
    } catch (err) {
      logger.error('window', `${command} 失败: ${err && err.message}`);
      return { ok: false, error: err && err.message };
    }
    return { ok: true, maximized: win.isMaximized(), fullscreen: win.isFullScreen() };
  });

  /** 读取当前窗口状态：自绘标题栏首帧同步「最大化 ⇄ 还原」图标用 */
  ipcMain.handle('desktop:window-get-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || win.isDestroyed()) return { maximized: false, fullscreen: false };
    return { maximized: win.isMaximized(), fullscreen: win.isFullScreen() };
  });

  /** 应用信息（「关于」面板：版本 / Electron / 平台 / 系统产品名） */
  ipcMain.handle('desktop:app-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    osName: getOsProductName(),
  }));
}

/**
 * 操作系统展示名（「关于」面板的「运行平台」行）。
 *
 * 🚨 为什么不用 `reg query` 读注册表 ProductName：
 * 那要拉起子进程，而子进程在受管/加固环境下可能被黑名单拦截
 * （本机就拦过 reg.exe），且 spawn 默认 stdio 还有 EBUSY 的坑。
 * `process.getSystemVersion()` 是 Electron 原生 API，零子进程、零权限，
 * 配一张 NT 内核号→产品名的映射表就够用；映射不到时直接回显内核号，
 * 信息量仍大于只写 "Windows"。
 */
function getOsProductName() {
  const os = require('node:os');
  if (process.platform !== 'win32') {
    return `${os.type()} ${os.release()}`;
  }
  // getSystemVersion 只在 Electron 运行时存在；纯 node 下退回 os.release()
  const ver =
    typeof process.getSystemVersion === 'function' ? process.getSystemVersion() : os.release();
  const major = String(ver).split('.')[2]; // 10.0.<build> → build 号才是版本判据
  const build = Number(major);
  let label = 'Windows';
  if (build >= 22000) label = 'Windows 11';
  else if (build >= 10240) label = 'Windows 10';
  else if (build >= 9600) label = 'Windows 8.1';
  else if (build >= 9200) label = 'Windows 8';
  else if (build >= 7601) label = 'Windows 7';
  return build ? `${label} (${ver})` : 'Windows';
}

/* ------------------------------------------------------------------ */
/* 在线更新（electron-updater，generic provider → stravision.site）      */
/* 发布流程见 docs/DESKTOP.md：bump 版本 → pack → 上传 3 个文件到服务器    */
/* ------------------------------------------------------------------ */

let autoUpdaterRef = null;
/** 新版本是否已下载完成（值=版本号）：供手动"检查更新"判断能否立即安装 */
let updateReadyToInstall = null;

function initAutoUpdater() {
  if (!app.isPackaged || autoUpdaterRef) return;
  try {
    // 惰性 require：开发态（desktop:dev）没有装这个依赖也不能炸
    const { autoUpdater } = require('electron-updater');
    autoUpdaterRef = autoUpdater;

    autoUpdater.logger = {
      info: (...a) => logger.info('updater', a.join(' ')),
      warn: (...a) => logger.warn('updater', a.join(' ')),
      error: (...a) => logger.error('updater', a.join(' ')),
      debug: () => {},
    };
    autoUpdater.autoDownload = true;          // 发现新版本直接后台下载
    autoUpdater.autoInstallOnAppQuit = true;  // 下载完成后用户退出应用即自动安装
    autoUpdater.allowDowngrade = false;

    let lastLoggedPercent = 0;
    autoUpdater.on('checking-for-update', () => logger.info('updater', '检查更新…'));
    autoUpdater.on('update-available', (info) => {
      logger.info('updater', `发现新版本 ${info?.version}，后台下载中…`);
      // 🚨 全量包 ~450MB 下载要十几分钟，期间完全静默会被用户当成"没弹更新框"（2026-09-17 反馈）：
      // 发现新版本立刻发系统通知告知正在后台下载，弹框仍留在下载完成时（update-downloaded）。
      notify.show({
        title: 'Stravision 发现新版本',
        body: `新版本 ${info?.version} 正在后台下载，完成后会弹出安装提示（无需等待，可继续使用）。`,
        tag: 'desktop-update-available',
      });
    });
    autoUpdater.on('update-not-available', (info) => logger.info('updater', `已是最新版本（${info?.version}）`));
    autoUpdater.on('download-progress', (p) => {
      if (p.percent - lastLoggedPercent >= 20) {
        lastLoggedPercent = p.percent;
        logger.info('updater', `下载进度 ${Math.round(p.percent)}%`);
      }
    });
    autoUpdater.on('update-downloaded', async (info) => {
      lastLoggedPercent = 0;
      updateReadyToInstall = info?.version ?? true;
      logger.info('updater', `新版本 ${info?.version} 已就绪，主动弹窗询问用户`);
      // 系统通知兜底（用户可能正在别的窗口）
      notify.show({
        title: 'Stravision 发现新版本',
        body: `新版本 ${info?.version} 已下载完成，重启应用后自动安装。`,
        tag: 'desktop-update',
      });
      // 🚨 必须主动弹更新框（用户要求；2026-09-16 修复在线更新从未弹过框的问题）：
      // electron-updater 读 resources/app-update.yml 拿更新源——依赖 electron-builder.yml
      // 里配置 publish 才会在打包时生成该文件；缺它时首查 ENOENT 静默失败（4.2.0-4.2.3 通病）。
      try {
        const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
        const { response } = await dialog.showMessageBox(win, {
          type: 'info',
          title: '发现新版本',
          message: `Stravision 新版本 ${info?.version} 已准备就绪`,
          detail: '立即重启完成安装，或选择稍后——退出应用时也会自动安装。',
          buttons: ['立即重启安装', '稍后'],
          defaultId: 0,
          cancelId: 1,
          noLink: true,
        });
        if (response === 0) {
          logger.info('updater', '用户选择立即安装，重启应用');
          autoUpdater.quitAndInstall(false, true);
        } else {
          logger.info('updater', '用户选择稍后，退出应用时自动安装');
        }
      } catch (err) {
        logger.warn('updater', `更新提示框失败（保留退出时自动安装）: ${err && err.message}`);
      }
    });
    autoUpdater.on('error', (err) => logger.warn('updater', `更新出错（不影响使用）: ${err && err.message || err}`));

    // 启动 20s 后首查（避开启动高峰），之后每 6 小时复查一次
    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 20000);
    setInterval(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 6 * 60 * 60 * 1000);
    logger.info('updater', `在线更新已启用 v${app.getVersion()}`);
  } catch (err) {
    logger.warn('updater', `初始化失败（忽略在线更新）: ${err && err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* 退出清理                                                             */
/* ------------------------------------------------------------------ */

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('app', '开始退出清理…');
  try {
    await servers.stopAll();
  } catch (err) {
    logger.warn('app', `子进程清理异常: ${err.message}`);
  }
  try {
    await mqtt.stop();
  } catch {
    /* ignore */
  }
  try {
    await postgres.stop();
  } catch {
    /* ignore */
  }
  logger.info('app', '清理完成');
}

/* ------------------------------------------------------------------ */
/* 应用菜单（原生）                                                     */
/* ------------------------------------------------------------------ */

/**
 * 原生 application menu 的处置。
 *
 * 背景：Electron 在**没有**调用 `Menu.setApplicationMenu()` 时会自动挂一份默认菜单，
 * 于是窗口顶部凭空多出一排「编辑/窗口/帮助/关于」——它不是我们设计的任何东西，
 * 只是框架的兜底，和页面自己的顶栏是两套视觉语言。主窗口已改为 `frame: false`，
 * 这排菜单在页面自绘标题栏里重建（含最小化/最大化/关闭），所以这里整份摘掉。
 *
 * macOS 例外：系统顶栏菜单不占窗口空间，也就不属于"要内联掉的原生控件"；
 * 而整份置空会让 Cmd+C / Cmd+V / Cmd+Q / Cmd+H 等标准快捷键全部失效
 * （macOS 的编辑快捷键依赖菜单项的 accelerator）。故只保留极简三组，
 * 视觉上由系统接管，功能上保持标准行为。
 */
function configureApplicationMenu() {
  try {
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          { role: 'appMenu' },
          { role: 'editMenu' },
          { role: 'windowMenu' },
        ])
      );
      logger.info('app', 'macOS：保留极简原生菜单（维持标准快捷键）');
    } else {
      Menu.setApplicationMenu(null);
      logger.info('app', '已摘除 Electron 默认菜单（窗口功能键改为页面自绘）');
    }
  } catch (err) {
    // 菜单不是可用性必需项：失败只记日志，绝不能让启动流程挂掉
    logger.warn('app', `设置应用菜单失败（忽略）: ${err && err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* 生命周期                                                             */
/* ------------------------------------------------------------------ */

function main() {
  // 单实例：第二个实例把已有窗口唤到前台，避免并发跑两套数据库与服务
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else if (splashWindow) {
      splashWindow.focus();
    }
  });

  app.whenReady().then(() => {
    logger.init(config.getLogDir());
    logger.info('app', `Stravision 桌面端启动 isPackaged=${app.isPackaged} electron=${process.versions.electron} node=${process.versions.node}`);

    notify.applyAppUserModelId();
    notify.configure({
      getMainWindow: () => mainWindow,
      // 点击通知 → 把路由透给渲染进程，由它决定怎么导航（应用可能还停在启动画面上）
      onActivate: (route) => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
          mainWindow.webContents.send('desktop:notification-activate', { route });
        }
      },
    });

    configurePermissions();
    // 原生菜单必须早于任何窗口创建：菜单条是窗口级 chrome，晚于窗口设置会先闪一下
    configureApplicationMenu();
    registerIpc();
    initAutoUpdater();
    createSplashWindow();
    bootstrap();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      bootstrap();
    }
  });

  // 桌面端承载常驻本地服务，关闭窗口即退出（macOS 同样处理）
  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('before-quit', (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    shutdown().finally(() => app.quit());
  });

  app.on('will-quit', (event) => {
    if (!shuttingDown) {
      event.preventDefault();
      shutdown().finally(() => app.exit(0));
    }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  main();
}
