'use strict';

/**
 * 授权租约闭环验证（`pnpm desktop:verify:license`）。
 *
 * 验证目标（跨端最容易出错的地方）：
 *   1. 服务端 signLease 的产物能被桌面端 license.js 的 verifyLease 验签通过；
 *   2. 篡改 payload（改到期时间）后验签必须失败 —— 这是"离线也无法续期"的根基；
 *   3. 用别的密钥签的租约必须失败；
 *   4. evaluate() 在有效 / 过期 / 超宽限 / 换设备 各情况下判定正确。
 *
 * 用真实的 data/desktop-license-keys.json 私钥，mock 掉 electron 以便直接加载桌面端模块。
 * 前置：先跑 `node scripts/desktop/generate-license-keys.mjs` 生成密钥。
 */

const Module = require('module');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// ---- mock electron（桌面端 lib 依赖 app.getPath / app.getVersion / app.isPackaged）----
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') {
    return {
      app: {
        isPackaged: false,
        name: 'Stravision',
        getVersion: () => '4.2.6',
        getPath: (name) => path.join(os.tmpdir(), 'stravision-lic-check', name),
      },
    };
  }
  return origLoad.call(this, request, ...rest);
};

const root = path.resolve(__dirname, '..', '..');
const license = require(path.join(root, 'desktop', 'lib', 'license.js'));

// ---- 复刻服务端 lib/desktop-license-lease.ts 的 signLease ----
const keys = JSON.parse(fs.readFileSync(path.join(root, 'data', 'desktop-license-keys.json'), 'utf8'));
const priv = crypto.createPrivateKey({
  key: Buffer.from(keys.privateKey, 'base64'),
  format: 'der',
  type: 'pkcs8',
});
const otherPriv = crypto.generateKeyPairSync('ed25519').privateKey;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function signLease(payload, key = priv) {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${b64url(crypto.sign(null, Buffer.from(body, 'utf8'), key))}`;
}

const results = [];
function check(name, pass, extra) {
  results.push({ name, pass, extra: extra === undefined ? '' : String(extra) });
}

const deviceId = license.getDeviceId();
const code = 'STV-AAAA-BBBB-CCCC-DDDD';
const now = Date.now();
const exp = now + 30 * 86400000;

// 1. 正常租约
const good = signLease({ v: 1, code, dev: deviceId, exp, iat: now });
const payload = license.verifyLease(good);
check('正常租约验签通过', !!payload && payload.dev === deviceId && payload.exp === exp, payload ? payload.code : 'null');

// 2. 篡改到期时间（离线自行续期）
const tamperedBody = b64url(Buffer.from(JSON.stringify({ v: 1, code, dev: deviceId, exp: exp + 9999999999, iat: now }), 'utf8'));
const tampered = `${tamperedBody}.${good.split('.')[1]}`;
check('篡改到期时间被拒绝', license.verifyLease(tampered) === null);

// 3. 伪造签名（换密钥签）
const forged = signLease({ v: 1, code, dev: deviceId, exp, iat: now }, otherPriv);
check('他人密钥签发的租约被拒绝', license.verifyLease(forged) === null);

// 4. 设备指纹不一致（拷贝他人本地文件）
const otherDevice = signLease({ v: 1, code, dev: 'deadbeef'.repeat(8), exp, iat: now });
const otherPayload = license.verifyLease(otherDevice);
check('租约本身有效但设备指纹不同（应由 evaluate 拦下）', !!otherPayload && otherPayload.dev !== deviceId);

// 5. 格式非法
check('垃圾串被拒绝', license.verifyLease('not-a-lease') === null);
check('空值被拒绝', license.verifyLease('') === null);

// ---- evaluate() 三态 ----
function writeLocal(record) {
  license.write(record);
}

const base = {
  code,
  deviceId,
  label: '自测',
  serverUrl: 'https://stravision.site',
  activatedAt: now,
  lastOnlineOkAt: now,
  lease: good,
};

writeLocal(base);
let ev = license.evaluate();
check('有效期内 → ok', ev.ok === true && ev.status === 'active', `${ev.status}/${ev.daysLeft}天`);

writeLocal({ ...base, lease: signLease({ v: 1, code, dev: deviceId, exp: now - 86400000, iat: now }) });
ev = license.evaluate();
check('已过期 → 拒绝', ev.ok === false && ev.status === 'expired', ev.status);

writeLocal({
  ...base,
  lease: signLease({ v: 1, code, dev: deviceId, exp: now + 30 * 86400000, iat: now }),
  lastOnlineOkAt: now - (license.GRACE_DAYS + 1) * 86400000,
});
ev = license.evaluate();
check('超离线宽限 → 拒绝', ev.ok === false && ev.status === 'need-online', ev.status);

// 模拟：把"签给别人的本地授权文件"拷到本机 → 租约合法但设备指纹不是本机
writeLocal({
  ...base,
  deviceId: 'other-device-id',
  lease: signLease({ v: 1, code, dev: 'deadbeef'.repeat(8), exp: now + 86400000, iat: now }),
});
ev = license.evaluate();
check('租约签给别的设备 → 拒绝', ev.ok === false && ev.status === 'device-mismatch', ev.status);

// ---- A：离线宽限天数（gd）随租约下发，客户端按码生效 ----
// 场景：客户机房长期断网，把宽限设成 3650 天即可长期离线可用。
const gdPayload = license.verifyLease(
  signLease({ v: 1, code, dev: deviceId, exp, iat: now, gd: 90, lbl: '某某客户' })
);
check('租约 gd / lbl 可被解析', !!gdPayload && gdPayload.gd === 90 && gdPayload.lbl === '某某客户',
  gdPayload ? `gd=${gdPayload.gd} lbl=${gdPayload.lbl}` : 'null');

const legacyPayload = license.verifyLease(signLease({ v: 1, code, dev: deviceId, exp, iat: now }));
check('老租约不带 gd → 回落默认 7 天', !!legacyPayload && legacyPayload.gd === license.GRACE_DAYS,
  legacyPayload ? String(legacyPayload.gd) : 'null');

writeLocal({
  ...base,
  lease: signLease({ v: 1, code, dev: deviceId, exp: now + 4000 * 86400000, iat: now, gd: 3650 }),
  lastOnlineOkAt: now - 365 * 86400000,
});
ev = license.evaluate();
check('gd=3650：离线满一年仍有效', ev.ok === true && ev.status === 'active', `${ev.status}/宽限${ev.graceDays}天`);

writeLocal({
  ...base,
  lease: signLease({ v: 1, code, dev: deviceId, exp: now + 4000 * 86400000, iat: now, gd: 30 }),
  lastOnlineOkAt: now - 40 * 86400000,
});
ev = license.evaluate();
check('gd=30：离线 40 天 → 要求联网', ev.ok === false && ev.status === 'need-online', `${ev.status}/宽限${ev.graceDays}天`);

// ---- B：离线授权串（不联网、跳过心跳、不受宽限约束） ----
const offlineCode = 'STV-OFFL-INE0-0000-0001';
const offlineBlob = signLease({ v: 1, code: offlineCode, dev: deviceId, exp: 0, iat: now, lbl: '离线客户' });
const otherDeviceBlob = signLease({ v: 1, code: offlineCode, dev: 'deadbeef'.repeat(8), exp: 0, iat: now });
const expiredBlob = signLease({ v: 1, code: offlineCode, dev: deviceId, exp: now - 86400000, iat: now });

license.clear();
const imported = license.activateOffline(offlineBlob);
check('离线授权串导入成功', imported.ok === true && imported.offline === true, imported.error || imported.status);

ev = license.evaluate();
check('离线记录 → active 且不做宽限判定',
  ev.ok === true && ev.status === 'active' && ev.offline === true && ev.graceDays == null,
  `${ev.status}/grace=${ev.graceDays}`);

// 把最后在线时间抹成 0（离线导入就是这么写的）：仍应有效
license.write({ ...license.read(), lastOnlineOkAt: 0 });
ev = license.evaluate();
check('离线记录 lastOnlineOkAt=0 → 仍 active', ev.ok === true && ev.status === 'active', ev.status);

check('离线授权串签给别的设备 → 拒绝', license.activateOffline(otherDeviceBlob).ok === false);
check('离线授权串已过期 → 拒绝', license.activateOffline(expiredBlob).ok === false);
check('离线授权串是垃圾串 → 拒绝', license.activateOffline('not-a-lease').ok === false);
check('离线授权串为空 → 拒绝', license.activateOffline('').ok === false);

// ---- 契约闭环：命令行生成器（offline-license.mjs）→ 客户端导入 ----
// 这是「服务器没了也能发授权」的保底通道，两端格式必须严丝合缝。
try {
  const cliOut = execFileSync(
    process.execPath,
    [
      path.join(root, 'scripts', 'desktop', 'offline-license.mjs'),
      '--device', license.getDeviceId(),
      '--days', '30',
      '--label', 'CLI集成测试',
      '--json',
    ],
    { encoding: 'utf8', timeout: 30000 }
  );
  const cli = JSON.parse(cliOut);
  license.clear();
  const applied = license.activateOffline(cli.lease);
  const evCli = license.evaluate();
  check(
    'CLI 签发的离线串能被客户端导入',
    applied.ok === true && evCli.ok === true && evCli.offline === true,
    applied.error || `${evCli.status}/${evCli.label}`
  );
} catch (err) {
  check('CLI 签发的离线串能被客户端导入', false, err.message);
}

// ---- 打包形态：环境变量覆盖必须失效 ----
// 本机同时跑着完整 Next 服务端（会自生成密钥对），若打包版允许 env 覆盖
// 授权地址与公钥，"设两行环境变量指向本机 + 自助签发"就是现成的绕过开关。
writeLocal(base); // 有效租约
process.env.STRAVISION_LICENSE_SERVER = 'http://127.0.0.1:3000';
process.env.STRAVISION_LICENSE_PUBLIC_KEY = 'AAAA';

function reloadLicense(appMock) {
  Module._load = function (request, ...rest) {
    if (request === 'electron') return { app: appMock };
    return origLoad.call(this, request, ...rest);
  };
  for (const rel of ['desktop/lib/license.js', 'desktop/lib/config.js', 'desktop/lib/logger.js']) {
    delete require.cache[require.resolve(path.join(root, rel))];
  }
  return require(path.join(root, 'desktop', 'lib', 'license.js'));
}

const packaged = reloadLicense({
  isPackaged: true,
  name: 'Stravision',
  getVersion: () => '4.2.6',
  getPath: (name) => path.join(os.tmpdir(), 'stravision-lic-check', name),
});
check(
  '打包形态忽略授权服务地址覆盖',
  packaged.serverUrl() === 'https://stravision.site',
  packaged.serverUrl()
);
check('打包形态仍用内置公钥验签（env 公钥不生效）', packaged.evaluate().ok === true);

delete process.env.STRAVISION_LICENSE_SERVER;
delete process.env.STRAVISION_LICENSE_PUBLIC_KEY;

packaged.clear();
ev = packaged.evaluate();
check('无本地记录 → 未激活', ev.ok === false && ev.status === 'none', ev.status);

// ---- 报告 ----
function report() {
  let failed = 0;
  for (const r of results) {
    if (!r.pass) failed++;
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.extra ? `  [${r.extra}]` : ''}`);
  }
  console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`);
  process.exit(failed === 0 ? 0 : 1);
}

// ---- 心跳行为（异步）----
// 🚨 离线串的码**不在服务端库里**，若真发心跳会拿到 404 → 被归为"确定性失效" → 本地授权被清掉。
//    必须落在 skip 分支（不发起任何网络请求，所以秒回）。
(async () => {
  license.clear();
  license.activateOffline(offlineBlob);
  const hb = await license.heartbeat();
  check(
    '离线记录心跳被跳过（不会因 404 被清）',
    hb.ok === true && hb.skipped === true && hb.fatal === false,
    JSON.stringify(hb)
  );

  // 反证：在线记录遇到"网络不可达"必须判为可宽限（offline，不 fatal），不能清凭据。
  // 端口 1 必定连接被拒，结果确定且不依赖外网。
  process.env.STRAVISION_LICENSE_SERVER = 'http://127.0.0.1:1';
  writeLocal(base);
  const hb2 = await license.heartbeat();
  check(
    '在线记录网络不可达 → 不判失效（宽限兜底）',
    hb2.fatal === false && hb2.offline === true,
    JSON.stringify(hb2)
  );
  delete process.env.STRAVISION_LICENSE_SERVER;

  license.clear();
  report();
})();
