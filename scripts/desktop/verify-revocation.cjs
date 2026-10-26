#!/usr/bin/env node
/**
 * 拉取式吊销的端到端回归（`pnpm desktop:verify:revocation`）。
 *
 * 验的是这条链：管理员签清单 → 静态托管 → 客户端拉取 → 验签 → 命中锁死 / 超期锁死。
 *
 * 跑法上做了两处隔离，保证不碰真实数据：
 *   1. 用 Module._load 拦截 `electron`，把 userData 指到临时目录（授权记录写在那里）；
 *   2. 只 import 台账模块的 `privateKey()`，签发与清单都在本脚本内用 crypto 现签 ——
 *      不会往 data/desktop-license-vault.json 或 desktop-revocation.json 写任何东西。
 */

'use strict';

const Module = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stv-revoke-'));
const electronMock = {
  app: {
    isPackaged: false,
    getVersion: () => '0.0.0-test',
    getPath: () => TMP,
    getAppPath: () => TMP,
    getName: () => 'Stravision',
    on() {},
    quit() {},
  },
  dialog: { showMessageBox: async () => ({ response: 0 }) },
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return electronMock;
  return origLoad.apply(this, arguments);
};

const license = require(path.join(__dirname, '..', '..', 'desktop', 'lib', 'license.js'));

/* ------------------------------------------------------------------ */
/* 断言                                                                */
/* ------------------------------------------------------------------ */

let pass = 0;
let fail = 0;

function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? `  → ${extra}` : ''}`);
  }
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  const vault = await import(pathToFileURL(path.join(__dirname, 'license-vault.mjs')).href);
  const key = vault.privateKey();
  const deviceId = license.getDeviceId();

  const signLease = (code, extra) => {
    const payload = { v: 1, code, dev: deviceId, exp: Date.now() + 365 * 86400000, iat: Date.now(), ...extra };
    const body = b64url(JSON.stringify(payload));
    return `${body}.${b64url(crypto.sign(null, Buffer.from(body, 'utf8'), key))}`;
  };
  const signList = (codes, t) => {
    const payload = { v: 1, t: t ?? Date.now(), revoked: codes.map((c) => c.toUpperCase()) };
    const body = b64url(JSON.stringify(payload));
    return `${body}.${b64url(crypto.sign(null, Buffer.from(body, 'utf8'), key))}`;
  };
  const seed = (code, lease, patch) =>
    license.write({
      code,
      deviceId,
      lease,
      label: '回归测试',
      serverUrl: '',
      activatedAt: Date.now(),
      lastOnlineOkAt: 0,
      offline: true,
      lastRevocationCheckAt: 0,
      revokedAt: 0,
      revocationListTime: 0,
      ...patch,
    });

  /* ---- 清单托管（模拟 Gitee raw / COS / R2） ---- */
  let served = '';
  let status = 200;
  const server = http.createServer((_req, res) => {
    res.writeHead(status, { 'Content-Type': 'text/plain' });
    res.end(served);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const listUrl = `http://127.0.0.1:${server.address().port}/revoked.json`;

  const CODE_A = 'STV-AAAA-AAAA-AAAA-AAAA';
  const CODE_B = 'STV-BBBB-BBBB-BBBB-BBBB';
  const CODE_C = 'STV-CCCC-CCCC-CCCC-CCCC';
  const CODE_D = 'STV-DDDD-DDDD-DDDD-DDDD';
  const CODE_E = 'STV-EEEE-EEEE-EEEE-EEEE';

  served = signList([CODE_A]);

  console.log('\n【1】清单验签');
  check('正常清单可解析', license.verifyRevocationList(served) !== null);
  const tampered = `${served.split('.')[0]}xxx.${served.split('.')[1]}`;
  check('内容被篡改 → 验签失败', license.verifyRevocationList(tampered) === null);
  check('用别人的密钥签 → 验签失败', license.verifyRevocationList(signList([CODE_A]).slice(0, -3) + 'AAA') === null);
  check('垃圾串 / 空值 → 验签失败', license.verifyRevocationList('not-a-list') === null && license.verifyRevocationList('') === null);

  console.log('\n【2】命中清单 → 锁死');
  seed(CODE_A, signLease(CODE_A, { rl: listUrl, rk: 30 }));
  check('复检前仍可用', license.evaluate().status === 'active', license.evaluate().status);
  const hit = await license.checkRevocation();
  check('复检命中', hit.ok === true && hit.hit === true, JSON.stringify(hit));
  const afterHit = license.evaluate();
  check('evaluate 判定 revoked', afterHit.status === 'revoked' && afterHit.ok === false, afterHit.status);

  console.log('\n【3】未命中 → 放行');
  seed(CODE_B, signLease(CODE_B, { rl: listUrl, rk: 30 }));
  const miss = await license.checkRevocation();
  check('复检未命中', miss.ok === true && miss.hit === false, JSON.stringify(miss));
  check('evaluate 仍 active', license.evaluate().status === 'active', license.evaluate().status);
  check('复检时间已记录', license.read().lastRevocationCheckAt > 0);

  console.log('\n【4】没配 rl 的纯离线串 → 永不联网');
  seed(CODE_C, signLease(CODE_C, {}));
  const skipped = await license.checkRevocation();
  check('复检被跳过', skipped.ok === true && skipped.skipped === true, JSON.stringify(skipped));
  check('evaluate 仍 active', license.evaluate().status === 'active');

  console.log('\n【5】清单拉不到 → 不误杀');
  seed(CODE_D, signLease(CODE_D, { rl: 'http://127.0.0.1:1/revoked.json', rk: 30 }));
  const unreachable = await license.checkRevocation();
  check('网络不可达 → offline', unreachable.ok === false && unreachable.offline === true, JSON.stringify(unreachable));
  check('evaluate 仍 active（不误杀）', license.evaluate().status === 'active', license.evaluate().status);
  status = 500;
  const httpErr = await license.checkRevocation();
  check('HTTP 500 → offline', httpErr.ok === false && httpErr.offline === true);
  status = 200;

  console.log('\n【6】超期未复检 → 要求联网');
  seed(CODE_E, signLease(CODE_E, { rl: listUrl, rk: 1, gd: 7 }), {
    lastRevocationCheckAt: Date.now() - 9 * 86400000,
  });
  const overdue = license.evaluate();
  check('rk=1 + gd=7，9 天未复检 → revocation-overdue', overdue.status === 'revocation-overdue', overdue.status);
  // rk=1 + gd=7 → 窗口 8 天
  check('提示里带天数', /8\s*天/.test(overdue.message || ''), overdue.message);
  // 刚复检过就不该 overdue
  seed(CODE_E, signLease(CODE_E, { rl: listUrl, rk: 1, gd: 7 }), { lastRevocationCheckAt: Date.now() - 2 * 86400000 });
  check('2 天未复检 → 仍 active', license.evaluate().status === 'active', license.evaluate().status);

  console.log('\n【7】防回滚（托管方重放旧清单）');
  seed(CODE_B, signLease(CODE_B, { rl: listUrl, rk: 30 }));
  served = signList([], Date.now());
  await license.checkRevocation(); // 先见到 t=now 的空清单
  const seenTime = license.read().revocationListTime;
  served = signList([CODE_B], Date.now() - 10 * 86400000); // 再喂一份更旧、且点名 B 的清单
  const rollback = await license.checkRevocation();
  check('旧清单被拒绝采信', rollback.ok === false && /回退/.test(rollback.error || ''), JSON.stringify(rollback));
  check('未因此锁死', license.evaluate().status === 'active', license.evaluate().status);
  check('清单时间戳未被回退', license.read().revocationListTime === seenTime);

  console.log('\n【8】重新导入新串 → 解除锁死');
  seed(CODE_A, signLease(CODE_A, { rl: listUrl, rk: 30 }), { revokedAt: Date.now() });
  check('被吊销时 evaluate 拒绝', license.evaluate().status === 'revoked');
  seed(CODE_A, signLease(CODE_A, { rl: listUrl, rk: 30 })); // 重新导入（write 不带 revokedAt）
  check('重新导入后恢复 active', license.evaluate().status === 'active', license.evaluate().status);

  if (server.closeAllConnections) server.closeAllConnections();
  await new Promise((r) => server.close(r));

  console.log('\n────────────────────────────────────────────────────────');
  console.log(`结果：${pass} 项通过，${fail} 项失败`);
  console.log('────────────────────────────────────────────────────────\n');
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('\n❌ 回归脚本异常：', err);
  process.exit(1);
});
