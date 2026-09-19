'use strict';

/**
 * 本地 MQTT broker 链路验证（无需图形界面，秒级完成）：
 *   1) 正确凭据能连上，错误凭据 / 匿名被拒
 *   2) 订阅/发布能互通（业务侧 device-control、monitor 依赖这条）
 *
 * 为什么需要这个脚本：
 *   aedes v1 的构造函数把 `this.closed` 初始化为 true，persistence 也只在
 *   `listen()` 里创建。若跳过 broker.listen() 直接 net.createServer(broker.handle)，
 *   TCP 层能建连（端口探测会亮绿灯），但客户端会一直卡在 "connack timeout" ——
 *   因为连接在 authenticate 回调里命中 `client.broker.closed === true` 被静默丢弃，
 *   日志里连异常都没有。这是一个"看起来正常、实际完全不可用"的坑，
 *   所以必须有真实收发往返的验证，光探测端口不够。
 *
 * 用法：node desktop/verify-mqtt.cjs
 */

const path = require('node:path');
const mqttLib = require(path.join(__dirname, 'lib', 'mqtt'));

// 真实业务侧的 mqtt 客户端（前端依赖树里），本脚本用于本地验证，故允许从仓库根解析
let mqtt;
try {
  mqtt = require(path.join(__dirname, '..', 'node_modules', 'mqtt'));
} catch (err) {
  console.error('未找到 mqtt 客户端依赖，无法完成往返校验：', err.message);
  process.exit(2);
}

const PORT = 11999;
const CREDS = { username: 'stravision', password: 'stravision_local_only' };

function tryConnect(creds, label) {
  return new Promise((resolve) => {
    const client = mqtt.connect(`mqtt://127.0.0.1:${PORT}`, {
      username: creds.username,
      password: creds.password,
      connectTimeout: 4000,
      reconnectPeriod: 0,
    });
    let settled = false;
    const done = (ok, detail) => {
      if (settled) return;
      settled = true;
      client.end(true);
      resolve({ label, ok, detail });
    };
    client.on('connect', () => done(true, 'connected'));
    client.on('error', (err) => done(false, `error: ${err.message}`));
    client.on('close', () => done(false, 'closed'));
    setTimeout(() => done(false, 'timeout'), 5000);
  });
}

function roundTrip() {
  return new Promise((resolve) => {
    const sub = mqtt.connect(`mqtt://127.0.0.1:${PORT}`, { ...CREDS, reconnectPeriod: 0 });
    const pub = mqtt.connect(`mqtt://127.0.0.1:${PORT}`, { ...CREDS, reconnectPeriod: 0 });
    let got = null;
    const finish = () => {
      sub.end(true);
      pub.end(true);
      resolve(got);
    };
    sub.on('connect', () => sub.subscribe('stravision/devices/+/data'));
    sub.on('message', (topic, payload) => {
      got = `${topic} = ${payload.toString()}`;
      finish();
    });
    pub.on('connect', () => pub.publish('stravision/devices/dev-1/data', '{"temp":26.5}'));
    setTimeout(finish, 5000);
  });
}

(async () => {
  await mqttLib.start({ port: PORT, credentials: CREDS });
  console.log('broker started on', PORT);

  const good = await tryConnect(CREDS, '正确凭据');
  const bad = await tryConnect({ username: 'stravision', password: 'wrong' }, '错误密码');
  const none = await tryConnect({}, '无凭据');
  const rt = await roundTrip();

  await mqttLib.stop();

  console.log('---');
  console.log(`正确凭据连接: ${good.ok ? 'PASS' : 'FAIL'} (${good.detail})`);
  console.log(`错误密码被拒: ${!bad.ok ? 'PASS' : 'FAIL'} (${bad.detail})`);
  console.log(`匿名被拒:     ${!none.ok ? 'PASS' : 'FAIL'} (${none.detail})`);
  console.log(`订阅/发布互通: ${rt ? 'PASS' : 'FAIL'} (${rt || '无消息'})`);

  const allOk = good.ok && !bad.ok && !none.ok && Boolean(rt);
  console.log('---');
  console.log(allOk ? 'RESULT: ALL PASS' : 'RESULT: HAS FAILURE');
  process.exit(allOk ? 0 : 1);
})().catch((err) => {
  console.error('EXCEPTION:', err);
  process.exit(2);
});
