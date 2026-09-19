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
const { app, BrowserWindow, session, shell, ipcMain, dialog } = require('electron');

const config = require('./lib/config');
const logger = require('./lib/logger');
const links = require('./lib/links');
const secrets = require('./lib/secrets');
const postgres = require('./lib/postgres');
const mqtt = require('./lib/mqtt');
const servers = require('./lib/servers');
const aiProvider = require('./lib/ai-provider');
const settings = require('./lib/settings');
const notify = require('./lib/notify');

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
  minWidth: 1024,
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

  splashWindow.loadFile(path.join(__dirname, 'ui', 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

async function openMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    title: 'Stravision',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
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
      width: 460,
      height: 680, // AI 步骤含「已配置供应商」管理区（adminUI 融合），620 装不下
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

    // 通过 query 告知页面来源：首启向导允许"稍后配置"，应用内打开的向导不写跳过标记。
    // 页面据此决定按钮文案与是否展示"立即重启"（首启时服务已起，改 env 同样要重启）。
    setupWindow.loadFile(path.join(__dirname, 'ui', 'setup.html'), {
      query: { mode: allowSkip ? 'first-run' : 'settings' },
    }).catch((err) => {
      logger.error('setup', `向导 loadFile 失败: ${err?.message ?? err}`);
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

    // 8. 首启 AI 助手配置。
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

    // 9. 打开主界面
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
