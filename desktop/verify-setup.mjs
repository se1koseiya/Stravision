/**
 * 本地服务配置向导的逻辑验证（无 Electron、无图形界面）。
 *
 * 用 mock 的 window.stravisionDesktop 桥接把 desktop/ui/setup.html 跑在无头 Chrome 里，
 * 走完三步流程并断言：
 *   - 回显正确（AI 供应商 / QTT 模式 / 环境变量行）
 *   - 分步校验（AI Key 可留空、remote 模式必填项）
 *   - 保存 payload 结构完整
 *   - 结果态不会把用户困死（关闭出口始终存在）
 *
 * 用法：
 *   node desktop/verify-setup.mjs            # 逻辑断言
 *   node desktop/verify-setup.mjs --shots    # 额外输出三步截图到 desktop/.shots/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE = `file://${path.join(__dirname, 'ui', 'setup.html').replace(/\\/g, '/')}`;
const SHOTS = process.argv.includes('--shots');
// 截图刻意放在 desktop/ 之外：electron-builder 的 files 含 `desktop/**/*`，
// 放里面会把 PNG 一并打进 asar。
const SHOT_DIR = path.join(__dirname, '..', 'tmp-desktop-shots');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('未找到 Chrome / Edge 可执行文件，无法运行向导验证');
  return found;
}

let failures = 0;
function check(ok, label, detail = '') {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const MOCK_SETTINGS = {
  ai: { providerId: 'aliyun-bailian', baseUrl: '', apiKey: 'sk-existing-key', model: 'qwen-plus' },
  mqtt: {
    mode: 'local',
    host: '127.0.0.1',
    port: 11883,
    username: '',
    password: '',
    subscribeTopic: 'stravision/devices/+/data',
    publishTopic: 'stravision/devices/control',
    useSSL: false,
    keepalive: 60,
    reconnectPeriod: 5000,
  },
  voice: { dashscopeApiKey: '' },
  secrets: { jwtSecret: '', internalApiSecret: '' },
  env: [{ key: 'GUARDIAN_CHECK_CRON', value: '*/5 * * * *' }],
};

// 主进程 settings-get 会把 data/ai-providers-config.json 的供应商清单（key 脱敏）一并回显
const MOCK_AI_PROVIDERS = [
  {
    id: 'aliyun-bailian',
    name: '阿里云百炼（DashScope）',
    type: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'sk-e*************-key',
    enabled: true,
    isDefault: true,
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', enabled: true },
      { id: 'qwen-max', name: 'Qwen Max', enabled: true },
    ],
  },
];
const MOCK_DEFAULT_MODEL = 'qwen-plus';

const MOCK_PRESETS = [
  {
    id: 'aliyun-bailian',
    name: '阿里云百炼（DashScope）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    keyHint: 'sk-…',
    consoleUrl: 'https://bailian.console.aliyun.com/',
    models: [{ id: 'qwen-max', name: 'Qwen Max' }],
  },
  { id: 'zhipu', name: '智谱 GLM（BigModel）', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', keyHint: 'x.x', consoleUrl: '', models: [] },
  { id: 'custom-openai', name: '自定义 OpenAI 兼容端点', baseUrl: '', keyHint: 'sk-…', consoleUrl: '', models: [] },
];

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 460, height: 680 });

  // 必须在页面脚本之前注入 mock 桥接
  await page.evaluateOnNewDocument((settings, presets, aiProviders, defaultModelId) => {
    window.__restartRequired = true;
    window.__calls = {};
    window.stravisionDesktop = {
      isDesktop: true,
      getDesktopSettings: async () => ({
        ok: true,
        settings,
        presets,
        aiProviders,
        defaultModelId,
        info: { serverRoot: '/mock/server', dataRoot: '/mock/data', ports: { next: 3000 }, isPackaged: true },
      }),
      saveDesktopSettings: async (payload) => {
        window.__calls.saved = payload;
        return { ok: true, restartRequired: window.__restartRequired };
      },
      aiProviderDelete: async (id) => {
        window.__calls.deleted = id;
        return { ok: true };
      },
      skipAiSetup: async () => {
        window.__calls.skipped = true;
        return { ok: true };
      },
      closeSetup: async () => {
        window.__calls.closed = true;
        return { ok: true };
      },
      relaunch: async () => {
        window.__calls.relaunched = true;
        return { ok: true };
      },
      getAiPresets: async () => presets,
      onBootstrapStatus: () => {},
    };
  }, MOCK_SETTINGS, MOCK_PRESETS, MOCK_AI_PROVIDERS, MOCK_DEFAULT_MODEL);

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const shot = async (name) => {
    if (!SHOTS) return;
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
  };

  const text = (sel) => page.$eval(sel, (el) => el.textContent.trim());
  const visible = (sel) => page.$eval(sel, (el) => !el.classList.contains('hidden'));
  const click = (sel) => page.click(sel);
  const type = async (sel, v) => {
    await page.$eval(sel, (el) => {
      el.value = '';
    });
    await page.type(sel, v);
  };

  /* ---------- 首屏：应用内模式 ---------- */
  console.log('\n[1] 应用内打开（mode=settings）');
  await page.goto(`${PAGE}?mode=settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('preset').options.length > 0, { timeout: 5000 });

  check((await text('#title')) === '本地服务配置', '标题为"本地服务配置"', await text('#title'));
  check((await text('#btn-skip')) === '关闭', '关闭出口存在', await text('#btn-skip'));
  check((await page.$eval('#preset', (el) => el.value)) === 'aliyun-bailian', 'AI 供应商回显');
  check((await page.$eval('#apiKey', (el) => el.value)) === 'sk-existing-key', 'AI Key 回显');
  check((await page.$eval('#baseUrl', (el) => el.value)).includes('dashscope'), 'Base URL 由预置填充');
  check((await page.$eval('#mqttSub', (el) => el.value)) === 'stravision/devices/+/data', '订阅主题回显');
  check((await page.$eval('#mqtt-remote', (el) => el.classList.contains('hidden'))) === true, '内置模式下隐藏 remote 字段');
  check((await page.$$('#env-list .env-row')).length === 1, '环境变量行回显');
  check(
    (await page.$eval('#env-list .env-row .k', (el) => el.value)) === 'GUARDIAN_CHECK_CRON',
    '环境变量 KEY 回显',
  );
  check(errors.length === 0, '无页面 JS 异常', errors.join(' | ') || 'none');
  await shot('01-step1');

  /* ---------- 已配置供应商管理区（adminUI 融合） ---------- */
  console.log('\n[1b] 已配置供应商管理区');
  check(
    (await page.$eval('#prov-section', (el) => el.style.display)) !== 'none',
    '有供应商时管理区可见',
  );
  check((await page.$$('#prov-list .prov-row')).length === 1, '供应商行渲染');
  check((await text('#prov-list .prov-row .name')).includes('阿里云百炼'), '供应商名回显');
  check((await text('#prov-list .prov-row .meta')).includes('*'), 'Key 脱敏回显');
  check((await text('#prov-list .prov-row .badge')) === '默认', '默认徽章');
  check((await page.$eval('#defaultModel', (el) => el.tagName)) === 'INPUT', '默认模型为自由输入框（非预设下拉）');
  check((await page.$eval('#defaultModel', (el) => el.value)) === 'qwen-plus', '默认模型回显');
  check(
    (await page.$$eval('#defaultModelList option', (els) => els.length)) === 2,
    'datalist 候选 = 各供应商启用模型',
  );
  {
    // 自由填写预设外模型 id（如 zai-org/GLM-5.3）不被 UI 限制；测完还原保证后续 payload 断言
    await page.$eval('#defaultModel', (el) => { el.value = 'zai-org/GLM-5.3'; });
    check((await page.$eval('#defaultModel', (el) => el.value)) === 'zai-org/GLM-5.3', '可自由填写预设外模型 id');
    await page.$eval('#defaultModel', (el) => { el.value = 'qwen-plus'; });
  }
  page.on('dialog', (d) => d.accept());
  await page.click('#prov-list .prov-row .icon-btn');
  await page.waitForFunction(() => window.__calls.deleted === 'aliyun-bailian', { timeout: 2000 });
  check(true, '删除走 aiProviderDelete 并携带 provider id');

  /* ---------- 步骤 1 校验：AI Key 允许留空 ---------- */
  console.log('\n[2] AI Key 留空可继续（不强制配置 AI）');
  await type('#apiKey', '');
  await click('#btn-next');
  await page.waitForFunction(() => document.querySelector('.pane[data-pane="1"]').classList.contains('active'), { timeout: 3000 });
  check(true, 'Key 留空仍进入第 2 步');
  check((await text('#err')) === '', '无错误提示');
  await shot('02-step2-local');

  /* ---------- 步骤 2：remote 必填校验 ---------- */
  console.log('\n[3] 消息服务校验');
  await page.click('#mqtt-mode button[data-mode="remote"]');
  await page.waitForFunction(() => !document.getElementById('mqtt-remote').classList.contains('hidden'), { timeout: 2000 });
  check(true, '切换到自建 broker 后字段展开');

  await type('#mqttHost', '');
  await click('#btn-next');
  check((await text('#err')).includes('服务器地址'), '空地址被拦下', await text('#err'));

  await type('#mqttHost', 'mqtt.example.com');
  await click('#btn-next');
  check((await text('#err')).includes('用户名'), '空用户名被拦下', await text('#err'));

  await type('#mqttUsername', 'device-user');
  await click('#btn-next');
  check((await text('#err')).includes('密码'), '空密码被拦下', await text('#err'));

  await type('#mqttPassword', 's3cret');
  await click('#btn-next');
  await page.waitForFunction(() => document.querySelector('.pane[data-pane="2"]').classList.contains('active'), { timeout: 3000 });
  check(true, '填全后进入第 3 步');
  await shot('03-step3');

  /* ---------- 步骤 3：环境变量名校验 ---------- */
  console.log('\n[4] 自定义环境变量校验');
  await page.click('#env-add');
  await page.waitForFunction(() => document.querySelectorAll('#env-list .env-row').length === 2, { timeout: 2000 });
  const lastKey = '#env-list .env-row:last-child .k';
  const lastVal = '#env-list .env-row:last-child .v';
  await page.type(lastKey, '1BAD-NAME');
  await page.type(lastVal, 'x');
  await click('#btn-next');
  check((await text('#err')).includes('不合法'), '非法变量名被拦下', await text('#err'));

  await type(lastKey, 'DEVICE_DEBUG');
  await click('#btn-next');
  await page.waitForFunction(() => !document.getElementById('btn-restart').classList.contains('hidden'), { timeout: 4000 });

  /* ---------- 保存 payload ---------- */
  console.log('\n[5] 保存 payload 与结果态');
  const payload = await page.evaluate(() => window.__calls.saved);
  const s = payload?.settings || {};
  check(Boolean(s), 'saveDesktopSettings 被调用');
  check(s.mqtt?.mode === 'remote', 'mqtt.mode = remote', s.mqtt?.mode);
  check(s.mqtt?.host === 'mqtt.example.com', 'mqtt.host 透传', s.mqtt?.host);
  check(s.mqtt?.port === 11883, 'mqtt.port 有默认值', String(s.mqtt?.port));
  check(s.mqtt?.subscribeTopic === 'stravision/devices/+/data', 'subscribeTopic 透传');
  check(s.mqtt?.publishTopic === 'stravision/devices/control', 'publishTopic 透传');
  check(s.env?.length === 2, '两个环境变量都收集到', String(s.env?.length));
  check(s.env?.[1]?.key === 'DEVICE_DEBUG', '新增变量被收集', JSON.stringify(s.env?.[1]));
  check(s.ai?.apiKey === '', 'AI Key 留空被如实上报（由主进程决定是否写）');
  check(s.ai?.defaultModelId === 'qwen-plus', '默认模型随 payload 上报（adminUI 融合）');
  check(s.voice && 'dashscopeApiKey' in s.voice, 'voice 段存在');
  check(s.secrets && 'jwtSecret' in s.secrets, 'secrets 段存在');

  check(Boolean(await visible('#btn-restart')), 'restartRequired=true → 显示"立即重启"');
  check(Boolean(await visible('#btn-skip')), '⚠️ 关闭出口仍然存在（不会被困死）');
  check((await page.$eval('#btn-skip', (el) => el.textContent.trim())) === '关闭', '按钮文案为"关闭"');
  check((await text('#subtitle')).includes('重启'), '提示语说明需重启', await text('#subtitle'));
  await shot('04-done-restart');

  console.log('\n[6] 关闭按钮走 closeSetup（不写跳过标记）');
  await click('#btn-skip');
  await page.waitForFunction(() => window.__calls.closed === true, { timeout: 2000 });
  check(true, '调用 closeSetup 而非 skipAiSetup');
  check(!(await page.evaluate(() => window.__calls.skipped)), '未写"跳过"标记');

  /* ---------- restartRequired=false 分支 ---------- */
  console.log('\n[7] restartRequired=false（只改 AI，即时生效）');
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 460, height: 680 });
  await page2.evaluateOnNewDocument((settings, presets) => {
    window.__restartRequired = false;
    window.__calls = {};
    window.stravisionDesktop = {
      isDesktop: true,
      getDesktopSettings: async () => ({ ok: true, settings, presets, info: { ports: { next: 3000 } } }),
      saveDesktopSettings: async (p) => {
        window.__calls.saved = p;
        return { ok: true, restartRequired: false };
      },
      closeSetup: async () => {
        window.__calls.closed = true;
      },
      skipAiSetup: async () => {},
      relaunch: async () => {
        window.__calls.relaunched = true;
      },
    };
  }, MOCK_SETTINGS, MOCK_PRESETS);
  await page2.goto(`${PAGE}?mode=settings`, { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction(() => document.getElementById('preset').options.length > 0, { timeout: 5000 });
  await page2.click('#btn-next');
  await page2.click('#btn-next');
  await page2.click('#btn-next');
  await page2.waitForFunction(() => document.getElementById('btn-next').classList.contains('hidden'), { timeout: 4000 });
  check(
    Boolean(await page2.$eval('#btn-restart', (el) => el.classList.contains('hidden'))),
    'restartRequired=false → 不显示"立即重启"',
  );
  check(!(await page2.$eval('#btn-skip', (el) => el.classList.contains('hidden'))), '仍有"关闭"出口');
  check((await page2.$eval('#subtitle', (el) => el.textContent)).includes('立即生效'), '提示语为"已立即生效"');

  /* ---------- 首启模式 ---------- */
  console.log('\n[8] 首启模式（mode=first-run）');
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 460, height: 680 });
  await page3.evaluateOnNewDocument((settings, presets) => {
    window.__calls = {};
    window.stravisionDesktop = {
      isDesktop: true,
      getDesktopSettings: async () => ({ ok: true, settings, presets, info: { ports: null } }),
      saveDesktopSettings: async (p) => {
        window.__calls.saved = p;
        return { ok: true, restartRequired: true };
      },
      skipAiSetup: async () => {
        window.__calls.skipped = true;
      },
      closeSetup: async () => {
        window.__calls.closed = true;
      },
      relaunch: async () => {},
    };
  }, MOCK_SETTINGS, MOCK_PRESETS);
  await page3.goto(`${PAGE}?mode=first-run`, { waitUntil: 'domcontentloaded' });
  await page3.waitForFunction(() => document.getElementById('preset').options.length > 0, { timeout: 5000 });
  check((await page3.$eval('#title', (el) => el.textContent)) === '配置本地服务', '首启标题为"配置本地服务"');
  check((await page3.$eval('#btn-skip', (el) => el.textContent.trim())) === '稍后配置', '首启按钮为"稍后配置"');
  check(
    (await page3.$eval('#mqttUsername', (el) => el.value)) === '',
    '首启不把内置凭据回显给用户',
  );
  await page3.click('#btn-skip');
  await page3.waitForFunction(() => window.__calls.skipped === true, { timeout: 2000 });
  check(true, '首启"稍后配置"走 skipAiSetup');
  check(!(await page3.evaluate(() => window.__calls.closed)), '未误调 closeSetup');
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'RESULT: ALL PASS ✅' : `RESULT: ${failures} FAILURE(S) ❌`}`);
process.exit(failures === 0 ? 0 : 1);
