/**
 * 本地服务配置向导的验证（无 Electron、无图形界面）。
 *
 * ⚠️ 2026-10-07 起向导**不再是静态页** —— desktop/ui/setup.html 已删除，
 *    改为 Next 路由 /desktop-setup（app/desktop-setup/page.tsx）。
 *    原因见该文件头：向导跑在 bootstrap 第 8 步，此时 Next 已就绪，
 *    所以它可以是一个普通路由，从而复用设计系统，而不是手抄一份 HTML。
 *    ⇒ 本脚本因此需要**一个跑着的 Next 服务**才能验证。
 *
 * 用 mock 的 window.stravisionDesktop 桥接把 /desktop-setup 跑在无头 Chrome 里，
 * 亮/暗两套主题各走一遍，断言三类东西：
 *
 *   ① 业务流程  回显正确 / 分步校验拦截 / 保存 payload 六段完整 /
 *               首启与应用内两种退出语义（skipAiSetup vs closeSetup）
 *   ② 沉浸光感  计算样式里 backdrop-filter 必须同时有 blur 与 saturate
 *               （材质本体的判据，见 components/device/material-css.ts；
 *                只截图说"看起来像"不算验收）
 *   ③ 一层容器  面板内部**除交互控件外不允许出现任何圆角盒子**，
 *               且最大嵌套深度 ≤ 2（铁律「不要圆角矩形套圆角矩形」的量化写法）
 *
 * 用法：
 *   # 先起一个带独立 distDir 的 dev 服务（别占用户的 3000）
 *   NEXT_DIST_DIR=.next/probe NEXT_PUBLIC_STRAVISION_DESKTOP=1 npx next dev -p 3110
 *   curl -s -o /dev/null "http://127.0.0.1:3110/desktop-setup?mode=first-run"  # 预热，否则首个 goto 等编译
 *
 *   node desktop/verify-setup.mjs                 # 默认 http://127.0.0.1:3110
 *   SETUP_BASE_URL=http://127.0.0.1:3110 node desktop/verify-setup.mjs --shots
 *
 * 依赖：puppeteer-core（未随仓库安装）。两种解析方式：
 *   · 项目里装了 → 直接用；
 *   · 没装 → 用 PUPPETEER_CORE_ROOT 指向一个装了它的目录，例如
 *     PUPPETEER_CORE_ROOT=/path/to/node-workspace node desktop/verify-setup.mjs
 *
 * --shots 输出的 PNG 刻意放在 desktop/ 之外：electron-builder 的 files 含
 * `desktop/**\/*`，放里面会把截图一并打进 asar。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = process.env.SETUP_BASE_URL || 'http://127.0.0.1:3110';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'tmp-desktop-shots');
const THEMES = (process.env.PROBE_THEMES || 'light,dark').split(',').map((s) => s.trim());

/* ------------------------------------------------------------------ 依赖解析 */

/** ESM 裸导入不走 NODE_PATH，所以要给一条显式回退路径 */
async function loadPuppeteer() {
  try {
    return (await import('puppeteer-core')).default;
  } catch (err) {
    const root = process.env.PUPPETEER_CORE_ROOT;
    if (!root) {
      console.error(
        '\n❌ 找不到 puppeteer-core。\n' +
          '   要么在项目里安装：pnpm add -D puppeteer-core\n' +
          '   要么指向一个已安装它的目录：PUPPETEER_CORE_ROOT=/path/to/ws node desktop/verify-setup.mjs\n' +
          `   （原始错误：${err.code || err.message}）`,
      );
      process.exit(2);
    }
    return createRequire(path.join(root, 'package.json'))('puppeteer-core');
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error('未找到 Chrome / Edge，可用 CHROME_PATH 指定');
  return hit;
}

/* ------------------------------------------------------------------ mock 桥接 */

const MOCK_SETTINGS = {
  ai: {
    providerId: 'aliyun-bailian',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    model: '',
    defaultModelId: 'qwen-plus',
  },
  mqtt: {
    mode: 'local', host: '', port: 11883, username: '', password: '',
    subscribeTopic: 'farm/up', publishTopic: 'farm/down',
    useSSL: false, keepalive: 60, reconnectPeriod: 5000,
  },
  voice: { dashscopeApiKey: '' },
  secrets: { jwtSecret: '', internalApiSecret: '' },
  env: [{ key: 'MQTT_CLIENT_ID', value: 'stravision-desktop' }],
  personal: { assistantName: '莓小智', userAddress: '', theme: 'system' },
};

const MOCK_PRESETS = [
  { id: 'aliyun-bailian', name: '阿里云百炼（DashScope）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', keyHint: 'sk-…', consoleUrl: 'https://bailian.console.aliyun.com/', models: [] },
  { id: 'zhipu', name: '智谱 GLM（BigModel）', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', keyHint: 'x.x', consoleUrl: '', models: [] },
  { id: 'custom-openai', name: '自定义 OpenAI 兼容端点', baseUrl: '', keyHint: 'sk-…', consoleUrl: '', models: [] },
];

const MOCK_AI_PROVIDERS = [
  {
    id: 'aliyun-bailian',
    name: '阿里云百炼（DashScope）',
    apiKey: 'sk-1a2b3c4d5e6f7g8h9i0j',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    isDefault: true,
    models: [{ id: 'qwen-plus', name: 'Qwen Plus' }, { id: 'qwen-max', name: 'Qwen Max' }],
  },
];

/* ------------------------------------------------------------------ 断言工具 */

let failures = 0;
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function check(label, ok, detail) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ 页面探针 */

/**
 * 等待条件：**按钮出现且不再 disabled**。
 * ⚠️ 只等 #title 出现是不够的 —— 首屏 render 就有 #title，但此刻 loading 仍为 true，
 *    #btn-next 处于 disabled，点击会静默失效，后续断言全部超时（踩过）。
 */
const WAIT_READY = () => {
  const b = document.getElementById('btn-next');
  return !!b && !b.disabled;
};

const auditTheme = (page) =>
  page.evaluate(() => {
    const rootDiv = document.querySelector('div.h-screen');
    const canvas = document.querySelector('canvas');
    return {
      htmlClass: document.documentElement.className,
      prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      rootBg: rootDiv ? getComputedStyle(rootDiv).backgroundColor : null,
      canvasCount: document.querySelectorAll('canvas').length,
      canvasSize: canvas
        ? `${canvas.getBoundingClientRect().width}x${canvas.getBoundingClientRect().height}`
        : null,
    };
  });

/** 沉浸光感的计算样式证据：backdrop-filter 必须同时有 blur 与 saturate */
const auditMaterial = (page) =>
  page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        backdrop: (s.backdropFilter || s.webkitBackdropFilter || 'none').replace(/\s+/g, ' '),
        bg: s.backgroundColor,
        radius: s.borderTopLeftRadius,
      };
    };
    return {
      matLevel: document.documentElement.getAttribute('data-mat-level') || '(未设置→自适应)',
      rail: pick('aside'),
      panel: pick('section.ds-panel'),
      input: pick('input.ds-ctrl'),
      brand: pick('#btn-next'),
    };
  });

/**
 * 「一层容器」量化检查。
 * 盒子 := 有可见底色(alpha≥.05) 且 圆角 ≥6px 的元素。
 * 面板内部只允许交互控件是盒子（图标基座不在此列，本页没有）。
 */
const auditBoxes = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('section.ds-panel');
    if (!panel) return { boxes: [], offenders: ['未找到 .ds-panel'] };
    const alphaOf = (bg) => {
      const m = String(bg).match(/^rgba?\(([^)]+)\)$/);
      if (!m) return String(bg) === 'transparent' ? 0 : 1;
      const parts = m[1].split(',').map((v) => v.trim());
      return parts.length === 4 ? parseFloat(parts[3]) : 1;
    };
    const isBox = (el) => {
      const s = getComputedStyle(el);
      return alphaOf(s.backgroundColor) >= 0.05 && (parseFloat(s.borderTopLeftRadius) || 0) >= 6;
    };
    const boxes = [];
    for (const el of panel.querySelectorAll('*')) {
      if (!isBox(el)) continue;
      let depth = 1;
      for (let p = el.parentElement; p && p !== panel; p = p.parentElement) {
        if (isBox(p)) depth++;
      }
      boxes.push({
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString().slice(0, 70),
        radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
        depth,
        isControl: /dc-ctrl/.test(el.className?.toString() || ''),
      });
    }
    return { boxes, offenders: boxes.filter((b) => !b.isControl).map((b) => `${b.tag}.${b.cls}`) };
  });

/** 溢出体检（三层）：页面横向 / main 内所有后代 / 文本节点 rect 越界 */
const auditOverflow = (page) =>
  page.evaluate(() => {
    const bad = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      bad.push(`页面横向溢出 ${root.scrollWidth} > ${root.clientWidth}`);
    }
    const aside = document.querySelector('aside');
    if (aside && aside.getBoundingClientRect().width < 280) bad.push('左栏宽度 < 280');

    const viewportW = window.innerWidth;
    for (const el of document.querySelectorAll('main *')) {
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        if (getComputedStyle(el).overflowX === 'visible') {
          bad.push(`元素横向溢出: <${el.tagName.toLowerCase()} class="${el.className?.toString().slice(0, 60)}">`);
        }
      }
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent?.trim();
      if (!t) continue;
      const r = n.parentElement?.getBoundingClientRect();
      if (!r) continue;
      if (r.right > viewportW + 1 || r.left < -1) {
        bad.push(`文本越界 "${t.slice(0, 24)}" (left=${Math.round(r.left)} right=${Math.round(r.right)})`);
      }
    }
    return [...new Set(bad)].slice(0, 8);
  });

/* ------------------------------------------------------------------ 主流程 */

const puppeteer = await loadPuppeteer();

if (!(await reachable(`${BASE}/desktop-setup?mode=first-run`))) {
  console.error(
    `\n❌ ${BASE}/desktop-setup 不可达。\n` +
      '   本脚本需要**一个跑着的 Next 服务**（向导已改为路由，不再是静态页）。\n' +
      '   启动示例：\n' +
      '     NEXT_DIST_DIR=.next/probe NEXT_PUBLIC_STRAVISION_DESKTOP=1 npx next dev -p 3110\n' +
      '   再预热一次（避免首个 goto 等编译）：\n' +
      '     curl -s -o /dev/null "http://127.0.0.1:3110/desktop-setup?mode=first-run"\n',
  );
  process.exit(2);
}

if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
  console.log(`  · ${name}.png`);
};

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--proxy-server=direct://',
    '--proxy-bypass-list=*',
    // PixelBlast 是 WebGL 着色器；无头下走 SwiftShader 软渲染
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});

const injectBridge = (page, extra) =>
  page.evaluateOnNewDocument(
    (settings, presets, aiProviders, extraCfg) => {
      window.__calls = {};
      window.stravisionDesktop = {
        isDesktop: true,
        getBackendInfo: async () => ({}),
        getDesktopSettings: async () => ({
          ok: true,
          settings,
          presets,
          aiProviders,
          defaultModelId: 'qwen-plus',
          info: { ports: { next: 3110 } },
        }),
        saveDesktopSettings: async (payload) => {
          window.__calls.saved = payload;
          return { ok: true, restartRequired: extraCfg.restartRequired };
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
      };
    },
    MOCK_SETTINGS,
    MOCK_PRESETS,
    MOCK_AI_PROVIDERS,
    extra,
  );

const openPage = async (extra) => {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`[${extra.theme}] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${extra.theme}] console: ${m.text().slice(0, 200)}`);
  });
  await page.setViewport({ width: 940, height: 660 });
  // 关键：next-themes 的 defaultTheme="system" 靠 matchMedia 判定 → 必须先模拟
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: extra.theme }]);
  await injectBridge(page, extra);
  await page.goto(`${BASE}/desktop-setup?mode=${extra.mode}`, { waitUntil: 'domcontentloaded' });
  try {
    // ⚠️ polling 显式给间隔：默认 raf 轮询在 WebGL/软渲染页面上可能被饿死（本项目有 PixelBlast）。
    await page.waitForFunction(WAIT_READY, { timeout: 60000, polling: 250 });
  } catch (err) {
    // 超时不能只丢一个 TimeoutError —— 把现场 dump 出来，否则根本不知道是哪个环节没就绪
    const dump = await page
      .evaluate(() => ({
        url: location.href,
        readyState: document.readyState,
        hasBridge: typeof window.stravisionDesktop,
        bridgeKeys: window.stravisionDesktop ? Object.keys(window.stravisionDesktop) : [],
        hasBtn: !!document.getElementById('btn-next'),
        btnDisabled: document.getElementById('btn-next')?.disabled ?? null,
        hasPanel: !!document.querySelector('section.ds-panel'),
        text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
      }))
      .catch((e) => `(evaluate 也失败：${e.message})`);
    console.error(`\n❌ [${extra.theme}/${extra.mode}] 等待 #btn-next 就绪超时，现场：\n${JSON.stringify(dump, null, 1)}`);
    if (errors.length) console.error(`\n该页已捕获的错误（最多 10 条）：\n${errors.slice(-10).join('\n')}`);
    throw err;
  }
  await wait(900); // 等背景动画与图片就位
  return page;
};

try {
  for (const theme of THEMES) {
    console.log(`\n=============== 主题：${theme} ===============`);

    /* ---------- 首启模式：两步 ---------- */
    console.log('[1] first-run 第 1 步（AI 助手）');
    const page = await openPage({ mode: 'first-run', restartRequired: false, theme });
    await shot(page, `ds-${theme}-step1`);

    const t = await auditTheme(page);
    console.log(`  · html=${t.htmlClass} prefersDark=${t.prefersDark} rootBg=${t.rootBg}`);
    console.log(`  · canvas=${t.canvasCount} 张 (${t.canvasSize})`);
    check('极光像素层存在', t.canvasCount >= 1, `${t.canvasCount} 张`);
    check('主题与模拟一致', t.prefersDark === (theme === 'dark'), `prefersDark=${t.prefersDark}`);

    const mat = await auditMaterial(page);
    console.log(`  · 材质等级 html[data-mat-level]=${mat.matLevel}`);
    console.log(`    左栏   ${mat.rail?.backdrop}  r=${mat.rail?.radius}  bg=${mat.rail?.bg}`);
    console.log(`    面板   ${mat.panel?.backdrop}  r=${mat.panel?.radius}  bg=${mat.panel?.bg}`);
    console.log(`    输入框 ${mat.input?.backdrop}`);
    console.log(`    主按钮 ${mat.brand?.backdrop}`);
    const hasMat = (m) => /blur/.test(m?.backdrop || '') && /saturate/.test(m?.backdrop || '');
    check('左栏有材质（blur+saturate）', hasMat(mat.rail), mat.rail?.backdrop);
    check('左栏无圆角（不是"第二个圆角矩形"）', mat.rail?.radius === '0px', mat.rail?.radius);
    check('面板有材质（blur+saturate）', hasMat(mat.panel), mat.panel?.backdrop);
    check('面板圆角 = 20px', mat.panel?.radius === '20px', mat.panel?.radius);
    check('控件也吃到材质（输入框）', /saturate/.test(mat.input?.backdrop || ''), mat.input?.backdrop);
    check('主按钮走品牌材质（自发光）', /saturate/.test(mat.brand?.backdrop || ''), mat.brand?.backdrop);

    const bq = await auditBoxes(page);
    console.log(
      `  · 面板内圆角盒子 ${bq.boxes.length} 个：` +
        bq.boxes.map((b) => `${b.tag}[${b.isControl ? '控件' : '❌非控件'}]d${b.depth}`).join(' '),
    );
    const maxDepth = Math.max(0, ...bq.boxes.map((b) => b.depth));
    check('面板内每个圆角盒子都是交互控件', bq.offenders.length === 0, bq.offenders.join(' | '));
    check('无三级嵌套（最大深度 ≤2）', maxDepth <= 2, `max=${maxDepth}`);

    const title = await page.$eval('#title', (el) => el.textContent.trim());
    const skipText = await page.$eval('#btn-skip', (el) => el.textContent.trim());
    const presetCount = await page.$$eval('#preset option', (o) => o.length);
    console.log(`  · #title = ${title} / #btn-skip = ${skipText} / #preset 选项 = ${presetCount}`);
    check('#title 正确', title === '配置本地服务', title);
    check('首启退出键文案', skipText === '稍后配置', skipText);
    check('服务商下拉有选项', presetCount === 3, `${presetCount} 项`);
    const ov1 = await auditOverflow(page);
    check('第 1 步无溢出', ov1.length === 0, ov1.join(' | '));

    console.log('[2] 第 2 步（外观与偏好）');
    await page.click('#btn-next');
    await wait(500);
    await shot(page, `ds-${theme}-step2`);
    const ov2 = await auditOverflow(page);
    check('第 2 步无溢出', ov2.length === 0, ov2.join(' | '));

    console.log('[3] 高级设置展开');
    const adv = await page.evaluateHandle(() =>
      Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('高级设置')),
    );
    check('高级设置折叠按钮存在', !!adv.asElement());
    if (adv.asElement()) {
      await adv.asElement().click();
      await wait(500);
      await shot(page, `ds-${theme}-step2-advanced`);
      const ov3 = await auditOverflow(page);
      check('高级设置展开无溢出', ov3.length === 0, ov3.join(' | '));

      // 高级内容在折叠线下方 → 必须滚动到底再验一次，否则等于没验
      await page.evaluate(() => {
        const s = document.querySelector('.ds-scroll');
        if (s) s.scrollTop = s.scrollHeight;
      });
      await wait(400);
      await shot(page, `ds-${theme}-advanced-bottom`);

      const segBox = await page.evaluate(() => {
        const seg = document.querySelector('.ds-segbar');
        if (!seg) return null;
        return {
          grooveBackdrop: getComputedStyle(seg).backdropFilter,
          grooveBg: getComputedStyle(seg).backgroundColor,
          thumbExists: !!document.querySelector('.dc-ctrl--thumb'),
        };
      });
      check(
        '分段控件存在且有凹槽材质',
        !!segBox && /saturate/.test(segBox.grooveBackdrop || ''),
        JSON.stringify(segBox),
      );

      // 把分段控件滚进视野再截一张（它本身在折叠线以下）
      await page.evaluate(() => {
        const seg = document.querySelector('.ds-segbar');
        const s = document.querySelector('.ds-scroll');
        if (!seg || !s) return;
        s.scrollTop += seg.getBoundingClientRect().top - s.getBoundingClientRect().top - 90;
      });
      await wait(350);
      await shot(page, `ds-${theme}-adv-seg`);

      const boxesAdv = await auditBoxes(page);
      check('展开高级后仍无"非控件盒子"', boxesAdv.offenders.length === 0, boxesAdv.offenders.join(' | '));
      const ov4 = await auditOverflow(page);
      check('展开高级后仍无溢出', ov4.length === 0, ov4.join(' | '));
    }

    await page.close();
  }

  /* ---------- 应用内模式：分步校验 + 保存结果态 ---------- */
  const theme0 = THEMES[0];
  console.log(`\n=============== 应用内模式（${theme0}） ===============`);

  console.log('[4] 服务商留空 → 应拦截');
  const pageV = await openPage({ mode: 'settings', restartRequired: true, theme: theme0 });
  await pageV.evaluate(() => {
    const sel = document.getElementById('preset');
    sel.value = '';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await pageV.click('#btn-next');
  await wait(350);
  const errMsg = await pageV.$eval('#err', (el) => el.textContent.trim());
  const stillStep1 = await pageV.$eval('#title', (el) => el.textContent.trim());
  console.log(`  · #err = ${errMsg}`);
  check('留空服务商被拦截', errMsg.length > 0, errMsg);
  check('校验失败不跳步', stillStep1 === '本地服务配置', stillStep1);
  await shot(pageV, `ds-${theme0}-validate-error`);
  await pageV.close();

  console.log('[5] settings 模式保存 → 结果态（restartRequired=true）');
  const page2 = await openPage({ mode: 'settings', restartRequired: true, theme: theme0 });
  const skip2 = await page2.$eval('#btn-skip', (el) => el.textContent.trim());
  check('应用内退出键文案为「关闭」', skip2 === '关闭', skip2);

  await page2.click('#btn-next'); // → 第 2 步
  await wait(400);
  await page2.click('#btn-next'); // → 保存
  await page2.waitForFunction(() => document.getElementById('btn-restart') !== null, { timeout: 20000 });
  await wait(500);
  await shot(page2, `ds-${theme0}-saved-restart`);

  const savedPayload = await page2.evaluate(() => window.__calls.saved);
  const segs = Object.keys(savedPayload?.settings || {});
  console.log(`  · 保存 payload 段: ${segs.join(', ')}`);
  const sub2 = await page2.$eval('#subtitle', (el) => el.textContent.trim());
  console.log(`  · #subtitle = ${sub2}`);
  check('保存 payload 有 settings', !!savedPayload?.settings);
  check(
    'payload 六段齐全',
    ['ai', 'mqtt', 'voice', 'secrets', 'env', 'personal'].every((k) => segs.includes(k)),
    segs.join(','),
  );
  check('结果态副标题提示重启', /重启/.test(sub2), sub2);
  const ovSaved = await auditOverflow(page2);
  check('结果态无溢出', ovSaved.length === 0, ovSaved.join(' | '));
  await page2.close();

  console.log('[6] first-run 模式保存 → 调 save 而不自行关窗');
  const page3 = await openPage({ mode: 'first-run', restartRequired: false, theme: theme0 });
  await page3.click('#btn-next');
  await wait(350);
  await page3.click('#btn-next');
  await wait(600);
  const calls3 = await page3.evaluate(() => ({ ...window.__calls }));
  check('首启保存调用了 saveDesktopSettings', !!calls3.saved);
  check('首启保存不自行关窗', !calls3.closed && !calls3.skipped, JSON.stringify(calls3).slice(0, 120));
  await page3.close();

  console.log('[7] 「稍后配置」写跳过标记 / 「关闭」只关窗');
  const page4 = await openPage({ mode: 'first-run', restartRequired: false, theme: theme0 });
  await page4.click('#btn-skip');
  await wait(400);
  const calls4 = await page4.evaluate(() => ({ ...window.__calls }));
  check('首启退出走 skipAiSetup', calls4.skipped === true, JSON.stringify(calls4));
  await page4.close();

  const page5 = await openPage({ mode: 'settings', restartRequired: false, theme: theme0 });
  await page5.click('#btn-skip');
  await wait(400);
  const calls5 = await page5.evaluate(() => ({ ...window.__calls }));
  check('应用内退出走 closeSetup', calls5.closed === true, JSON.stringify(calls5));
  await page5.close();
} finally {
  await browser.close();
}

/**
 * 过滤掉与向导改动无关的全局噪声：
 *  · 401 = 无登录态时任意页面都会发生的 /api/devices 拉取失败（探针没有 cookie）
 *  · Hydration failed / non-unique key = 项目既有的全局问题（components/device/material-css.ts
 *    的 <style> 内容里含 "<style>" 字面量、device-context 的 demo 数据），与向导页无关。
 */
const realErrors = [...new Set(errors)].filter(
  (e) => !/401|Failed to load resource|Hydration failed|same key|non-unique/i.test(e),
);
if (realErrors.length) {
  console.log(`\n❌ 向导页新增错误:\n${realErrors.slice(0, 8).join('\n')}`);
  failures++;
} else {
  console.log('\n✅ 向导页无新增 JS 错误（已滤掉 401 与全局 hydration 噪声）');
}

console.log(`\n================== 结果：${failures ? `❌ ${failures} 项未通过` : '✅ 全部通过'} ==================`);
process.exit(failures ? 1 : 0);
