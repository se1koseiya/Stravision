'use strict';

/**
 * 桌面端路径与端口策略。
 *
 * 三条硬约束（改造前已核实源码，勿随意"优化"成动态分配）：
 * 1. 语音 WebSocket 端口必须固定 3002 —— lib/voice/use-voice-omni.ts 在
 *    非 https 且无显式代理时硬编码 `ws://${window.location.hostname}:3002`。
 * 2. Yjs 端口必须固定 1234 —— NEXT_PUBLIC_YJS_WS_URL 是构建期内联变量，
 *    运行时无法改写。
 * 3. Next 端口可动态 —— 前端全部走同源相对路径访问 API 与页面资源。
 */

const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

const isDev = !app.isPackaged;

/**
 * 服务端资源根目录。
 * 打包后位于 resources/app-server，即 asar 之外：
 * Next standalone 的 server.js 会在运行时动态读取大量文件，
 * asar 虚拟文件系统对 fork + 动态 require + fs 读写的兼容性不可靠。
 */
function getServerRoot() {
  if (!isDev) return path.join(process.resourcesPath, 'app-server');
  return path.join(__dirname, '..', '..', '.next', 'standalone');
}

/** 桌面端可变数据根：PG 数据目录、上传、文档库、AI 配置等 */
function getDataRoot() {
  const dir = path.join(app.getPath('userData'), 'server-data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLogDir() {
  return path.join(app.getPath('userData'), 'logs');
}

/** 内嵌 Postgres 数据目录 */
function getPgDataDir() {
  const dir = path.join(getDataRoot(), 'pgdata');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const DEFAULT_PORTS = {
  next: 3000,
  ws: 3002,
  yjs: 1234,
  // 非标准端口：避开用户机器上可能已存在的 5432(Postgres) / 1883(MQTT)
  mqtt: 11883,
  postgres: 5433,
};

function readPort(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

function getPorts() {
  return {
    next: readPort(process.env.DESKTOP_NEXT_PORT, DEFAULT_PORTS.next),
    ws: readPort(process.env.DESKTOP_WS_PORT, DEFAULT_PORTS.ws),
    yjs: readPort(process.env.DESKTOP_YJS_PORT, DEFAULT_PORTS.yjs),
    mqtt: readPort(process.env.DESKTOP_MQTT_PORT, DEFAULT_PORTS.mqtt),
    postgres: readPort(process.env.DESKTOP_PG_PORT, DEFAULT_PORTS.postgres),
  };
}

/**
 * 内嵌数据库凭据。
 * 仅绑定 127.0.0.1，不对外网暴露；密码为本地占位值，
 * 用于满足 PG 的密码认证要求，不承担安全边界职责
 * （真正的隔离边界是"只监听回环地址 + 数据目录在用户态"）。
 */
const LOCAL_DB = {
  user: 'stravision',
  password: 'stravision_local_only',
  database: 'stravision',
};

/**
 * 本地 MQTT 凭据。
 *
 * 业务侧 lib/mqtt-config.ts 的 validateMQTTConfig() 强制要求
 * MQTT_USERNAME / MQTT_PASSWORD 非空（线上连接外部 broker 的既有约束）。
 * 桌面端本地 broker 因此不能走匿名，必须显式接受一组凭据，
 * 否则 /api/health 的 mqtt 检查项会一直报
 * "MQTT_USERNAME is required and cannot be empty"。
 */
const LOCAL_MQTT = {
  username: 'stravision',
  password: 'stravision_local_only',
};

function buildDatabaseUrl(port) {
  return `postgresql://${LOCAL_DB.user}:${LOCAL_DB.password}@127.0.0.1:${port}/${LOCAL_DB.database}`;
}

/** 桌面端标记：Next 侧据此启用本地模式（隐藏支付/OAuth/OnlyOffice 等公网依赖入口） */
const DESKTOP_ENV = {
  STRAVISION_DESKTOP: '1',
  STRAVISION_LOCAL_MODE: '1',
};

/* ------------------------------------------------------------------ */
/* FFmpeg（RTMP 摄像头预览 / AI 抓帧依赖）                              */
/* ------------------------------------------------------------------ */

const FFMPEG_BIN = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const FFMPEG_PLATFORM_KEY = `${process.platform}-${process.arch}`;

/**
 * FFmpeg 产物根目录。
 * - 打包后：resources/ffmpeg（electron-builder extraResources，asar 外，可直接 spawn）
 * - 开发态：仓库 .cache/ffmpeg（scripts/desktop/fetch-ffmpeg.mjs 下载）
 */
function getFfmpegRoot() {
  if (!isDev) {
    // process.resourcesPath 只在 Electron 运行时存在；异常环境下退化到应用目录，避免抛错
    const resourcesPath = process.resourcesPath || path.join(__dirname, '..', '..');
    return path.join(resourcesPath, 'ffmpeg');
  }
  return path.join(__dirname, '..', '..', '.cache', 'ffmpeg');
}

/**
 * 定位可用的 ffmpeg 可执行文件；找不到返回 null。
 * 服务端侧的 lib/media/ffmpeg.ts 也会自行探测，这里提前算好并通过环境变量注入，
 * 让子进程走「显式路径」这条最短路径，同时把目录塞进 PATH 供其它工具复用。
 */
function getFfmpegPath() {
  const candidates = [
    process.env.STRAVISION_FFMPEG_PATH,
    path.join(getFfmpegRoot(), FFMPEG_PLATFORM_KEY, FFMPEG_BIN),
    path.join(getFfmpegRoot(), FFMPEG_BIN),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 注入给 Next / ws-server 子进程的 FFmpeg 相关环境变量 */
function getFfmpegEnv() {
  const binPath = getFfmpegPath();
  if (!binPath) return {};
  const dir = path.dirname(binPath);
  const prevPath = process.env.PATH || '';
  return {
    STRAVISION_FFMPEG_PATH: binPath,
    STRAVISION_FFMPEG_DIR: dir,
    PATH: prevPath ? `${dir}${path.delimiter}${prevPath}` : dir,
  };
}

/**
 * standalone 的服务入口是否存在。
 * 开发模式下若未先执行桌面构建，给出明确指引而不是抛出晦涩错误。
 */
function checkServerBuild() {
  const root = getServerRoot();
  const entry = path.join(root, 'server.js');
  if (!fs.existsSync(entry)) {
    return { ok: false, root, entry };
  }
  return { ok: true, root, entry };
}

module.exports = {
  isDev,
  getServerRoot,
  getDataRoot,
  getLogDir,
  getPgDataDir,
  getPorts,
  DEFAULT_PORTS,
  LOCAL_DB,
  LOCAL_MQTT,
  buildDatabaseUrl,
  DESKTOP_ENV,
  checkServerBuild,
  getFfmpegRoot,
  getFfmpegPath,
  getFfmpegEnv,
};
