'use strict';

/**
 * 桌面端日志：同时输出到控制台与 userData/logs。
 * 日志不可写时静默降级，绝不因日志失败阻断启动。
 */

const fs = require('node:fs');
const path = require('node:path');

let logStream = null;
let logFile = null;

function init(logDir) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    logFile = path.join(logDir, `desktop-${day}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
    logStream.on('error', () => { logStream = null; });
  } catch {
    logStream = null;
  }
}

function fmt(value) {
  if (value instanceof Error) return `${value.message}\n${value.stack || ''}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function write(level, scope, args) {
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${args.map(fmt).join(' ')}`;
  if (level === 'ERROR') console.error(line);
  else console.log(line);
  if (logStream) {
    try {
      logStream.write(line + '\n');
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  init,
  getLogFile: () => logFile,
  info: (scope, ...a) => write('INFO', scope, a),
  warn: (scope, ...a) => write('WARN', scope, a),
  error: (scope, ...a) => write('ERROR', scope, a),
};
