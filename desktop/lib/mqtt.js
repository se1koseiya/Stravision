'use strict';

/**
 * 本地 MQTT broker。
 *
 * 业务侧（device-control / monitor）通过 MQTT_HOST:MQTT_PORT 连接 broker。
 * 线上部署连接的是外部 broker；离线桌面端需要在本地起一个等价实例，
 * 否则 MQTT 相关页面会因连接失败反复重试并报错。
 *
 * 注意：本地 broker 只能保证"链路存在、UI 不异常"。
 * 真实物理设备在离线环境天然无法接入，这属于环境限制而非缺陷。
 */

const net = require('node:net');
const logger = require('./logger');

let broker = null;
let server = null;

/**
 * 创建 aedes 实例。
 * aedes v1 导出的是具名 class（`export class Aedes`），default export 是个
 * 会抛错的迁移提示函数，故这里取 `.Aedes`。
 */
function createBroker() {
  const mod = require('aedes');
  const Aedes = mod.Aedes || mod;
  // aedes v1 导出 class（new 调用），v0 导出工厂函数，两种形态都兼容
  try {
    return new Aedes();
  } catch {
    return Aedes();
  }
}

async function start({ port, credentials }) {
  if (server) return;

  broker = createBroker();

  // 业务侧强制要求非空用户名/密码，故显式接受固定凭据而非匿名。
  // 仅监听 127.0.0.1，凭据不承担安全边界职责（真正的边界是回环地址）。
  if (credentials && credentials.username) {
    broker.authenticate = (client, username, password, done) => {
      const ok =
        username === credentials.username &&
        String(password?.toString?.('utf8') ?? password ?? '') === credentials.password;
      if (!ok) logger.warn('mqtt', `凭据校验失败 client=${client?.id}`);
      done(null, ok);
    };
  }

  // ⚠️ 必须调用 listen()：aedes v1 的构造函数把 this.closed 初始化为 true，
  // 且 persistence 只在 listen() 里初始化。若跳过这一步直接用 broker.handle，
  // 客户端连接会在 authenticate 回调里命中 `client.broker.closed === true`
  // 被静默丢弃 —— 表现为客户端一直 "connack timeout"，且日志里毫无异常。
  // listen() 不创建 TCP server（v1 已移除内置 server），只做 broker 自身就绪。
  await broker.listen();

  server = net.createServer(broker.handle);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  broker.on('clientError', (client, err) => {
    logger.warn('mqtt', `clientError: ${err.message}`);
  });
  broker.on('client', (client) => {
    logger.info('mqtt', `客户端已连接 id=${client?.id}`);
  });

  logger.info('mqtt', `本地 broker 已就绪 mqtt://127.0.0.1:${port}`);
}

async function stop() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  if (broker) {
    await new Promise((resolve) => broker.close(resolve));
    broker = null;
  }
  logger.info('mqtt', '已停止');
}

module.exports = { start, stop };
