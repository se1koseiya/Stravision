/**
 * 桌面端**静态引导页**的验证（无 Electron、无图形界面）：
 *   · desktop/ui/splash.html   启动画面（bootstrap 第 0 步）
 *   · desktop/ui/activate.html 激活窗口（bootstrap 第 1 步的授权关卡）
 *
 * ⚠️ 这两页**必须保持静态**：它们跑在 Next 服务拉起之前，窗口里根本加载不到 React 路由。
 *    所以走 file:// 加载，本脚本**不需要任何服务**。
 *    （对照组：desktop/verify-setup.mjs 验的是 React 向导，必须先起 Next。）
 *
 * 🚨 两页共享 assets/material.css（沉浸光感的唯一来源仍是 components/device/material-css.ts）。
 *    本脚本因此也是**材质漂移的守门人** —— 它按 material-css.ts 的数值逐条断言，
 *    两边不一致时直接红。改了那边，务必回来跑一次。
 *
 * 用 mock 的 window.stravisionDesktop 桥接把页面跑在无头 Chrome 里，断言四类东西：
 *
 *   ① 业务流程  激活页：设备指纹回显 / 默认离线态 / 分段切换 / 提交阈值 /
 *               在线&离线两条链路 / 失败兜底文案 / 退出与日志按钮
 *               启动页：进度与文案回显 / 出错态展开动作键 / 重试复位 / 打开日志
 *   ② 沉浸光感  计算样式里 backdrop-filter 必须同时有 blur 与 saturate；卡片的第三层内辉、
 *               控件的强内缘光、滑块亮于滑槽、按压的 ③弹性 ④点光源 都要有真实证据
 *   ③ 一层容器  面板内部除「交互控件」与「图标基座」外不允许出现任何圆角盒子，
 *               且最大嵌套深度 ≤ 2（铁律「不要圆角矩形套圆角矩形」的量化写法）
 *   ④ 版式体检  左栏无圆角（不是"第二个圆角矩形"）/ 面板圆角 = 20px /
 *               资源路径可解析 / 无横向与文本越界
 *
 * 用法：
 *   node desktop/verify-static-ui.mjs                 # 不带截图
 *   node desktop/verify-static-ui.mjs --shots         # 截图写 tmp-desktop-shots/
 *
 * 依赖：puppeteer-core（未随仓库安装）。两种解析方式：
 *   · 项目里装了 → 直接用；
 *   · 没装 → 用 PUPPETEER_CORE_ROOT 指向一个装了它的目录，例如
 *     PUPPETEER_CORE_ROOT=/path/to/node-workspace node desktop/verify-static-ui.mjs
 *
 * --shots 输出的 PNG 刻意放在 desktop/ 之外：electron-builder 的 files 含
 * `desktop/**\/*`，放里面会把截图一并打进 asar。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TARGET = path.join(__dirname, 'ui', 'activate.html');
const SPLASH = path.join(__dirname, 'ui', 'splash.html');
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(ROOT, 'tmp-desktop-shots');

const WINDOW_W = 940;
const WINDOW_H = 660;
const SPLASH_W = 440;
const SPLASH_H = 300;

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
          '   要么指向一个已安装它的目录：PUPPETEER_CORE_ROOT=/path/to/ws node desktop/verify-activate.mjs\n' +
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

/* ------------------------------------------------------------------ 断言工具 */

let failures = 0;
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function check(label, ok, detail) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

/* ------------------------------------------------------------------ 页面审计 */

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
        border: s.borderTopColor,
        shadow: s.boxShadow.replace(/\s+/g, ' '),
      };
    };
    const pressEl = document.querySelector('#btn-submit');
    return {
      rail: pick('aside.aside'),
      panel: pick('section.panel'),
      field: pick('input#code'),
      seg: pick('.tabs'),
      thumb: pick('.tab.active'),
      brand: pick('#btn-submit'),
      pressCount: document.querySelectorAll('.mat-press').length,
      press: pressEl
        ? {
            pos: getComputedStyle(pressEl).position,
            afterContent: getComputedStyle(pressEl, '::after').content,
            afterBlend: getComputedStyle(pressEl, '::after').mixBlendMode,
            radiusVar: getComputedStyle(pressEl).getPropertyValue('--mgr').trim() || '(未注册)',
          }
        : null,
    };
  });

/**
 * ③按压弹性 + ④按压点光源的**真实按下**取证。
 * ⚠️ 不能靠读 CSS 下结论：`:active` 是运行时状态，
 *    所以这里真的把指针移上去按住，再读 scale / filter / ::after 的 opacity。
 *    （scale 是独立属性，transform 通道被动画占用也抢不走 —— 见 activate.html 的注释。）
 *
 * ⚠️⚠️ 松开前必须把指针**移出控件**：否则 mouse.up() 落在按钮上会真的触发一次点击，
 *      把页面推进到「提交完成」态 —— 后续所有断言与截图就都在错的页面上做（踩过）。
 *      onHold 回调在「按住中」执行，想截按压态就在那里截。
 */
const pressTest = async (page, sel, onHold) => {
  const handle = await page.$(sel);
  const box = await handle.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await wait(90);
  const held = await page.evaluate((s) => {
    const el = document.querySelector(s);
    const cs = getComputedStyle(el);
    const after = getComputedStyle(el, '::after');
    return {
      active: el.matches(':active'),
      scale: cs.scale,
      filter: cs.filter,
      afterOpacity: parseFloat(after.opacity),
      afterDisplay: after.display,
    };
  }, sel);
  if (onHold) await onHold();
  // 移出控件再松开 → 不产生 click 副作用（点击由 [4]/[5] 显式触发）
  await page.mouse.move(cx, Math.max(2, cy - 240));
  await page.mouse.up();
  await wait(160);
  const released = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return { scale: getComputedStyle(el).scale, afterOpacity: parseFloat(getComputedStyle(el, '::after').opacity) };
  }, sel);
  return { held, released };
};

/**
 * 「一层容器」量化检查。
 * 盒子 := 有可见底色(alpha≥.05) 且 圆角 ≥6px 的元素。
 * 面板内部只允许两类例外（铁律原文：「是"元素"不是"盒子"」）：
 *   ① 交互控件  ② 图标基座(.sec-ico)
 */
const auditBoxes = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('section.panel');
    if (!panel) return { boxes: [], offenders: ['未找到 section.panel'] };
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
    const kindOf = (el) => {
      const cls = el.className?.toString() || '';
      if (/sec-ico/.test(cls)) return 'icon';
      if (/mat-(seg|field|brand|ghost|thumb)|tabs/.test(cls)) return 'control';
      if (['button', 'input', 'textarea', 'select'].includes(el.tagName.toLowerCase())) return 'control';
      return 'other';
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
        cls: el.className?.toString().slice(0, 60),
        radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
        depth,
        kind: kindOf(el),
      });
    }
    return {
      boxes,
      offenders: boxes.filter((b) => b.kind === 'other').map((b) => `${b.tag}.${b.cls}`),
    };
  });

/** 溢出体检：页面横向 / main 内后代 / 文本节点 rect 越界 */
const auditOverflow = (page) =>
  page.evaluate(() => {
    const bad = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      bad.push(`页面横向溢出 ${root.scrollWidth} > ${root.clientWidth}`);
    }
    const aside = document.querySelector('aside');
    if (aside && aside.getBoundingClientRect().width < 280) bad.push('左栏宽度 < 280');
    const main = document.querySelector('main');
    if (main && main.getBoundingClientRect().width < 500) bad.push('右栏宽度 < 500');

    const viewportW = window.innerWidth;
    if (main) {
      for (const el of main.querySelectorAll('*')) {
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          if (getComputedStyle(el).overflowX === 'visible') {
            bad.push(`元素横向溢出: <${el.tagName.toLowerCase()} class="${el.className?.toString().slice(0, 60)}">`);
          }
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

/** 资源解析：两张图必须真的解码出像素（否则是路径写错/文件丢了） */
const auditAssets = (page) =>
  page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map((i) => ({
      src: i.getAttribute('src'),
      ok: i.complete && i.naturalWidth > 0,
      size: `${i.naturalWidth}x${i.naturalHeight}`,
    }));
  });

/* ------------------------------------------------------------------ 主流程 */

const puppeteer = await loadPuppeteer();

if (!fs.existsSync(TARGET)) {
  console.error(`\n❌ 找不到 ${TARGET}`);
  process.exit(2);
}
const FILE_URL = pathToFileURL(TARGET).href;

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
    '--allow-file-access-from-files',
  ],
});

const DEVICE_ID = 'STV-DEV-3F2A9C71-B4E8-4D06-9A15-77C2E0B91D84';

const openPage = async (behavior = {}) => {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  await page.setViewport({ width: WINDOW_W, height: WINDOW_H });
  await page.evaluateOnNewDocument(
    (b, deviceId) => {
      window.__calls = { quit: 0, logs: 0 };
      window.stravisionDesktop = {
        isDesktop: true,
        licenseInfo: async () => ({ deviceId }),
        licenseActivate: async (code) => {
          window.__calls.online = code;
          return b.onlineOk ? { ok: true } : { ok: false, error: '授权码无效或已被使用' };
        },
        licenseActivateOffline: async (blob) => {
          window.__calls.offline = blob;
          return b.offlineOk ? { ok: true } : { ok: false, error: '离线授权串签名不匹配' };
        },
        licenseQuit: async () => {
          window.__calls.quit++;
          return { ok: true };
        },
        openLogs: async () => {
          window.__calls.logs++;
          return { ok: true };
        },
      };
    },
    behavior,
    DEVICE_ID,
  );
  await page.goto(FILE_URL, { waitUntil: 'load' });
  await wait(700); // 等极光动画与图片就位
  return page;
};

try {
  console.log(`\n=============== 激活窗口 ${WINDOW_W}x${WINDOW_H} ===============`);
  console.log(`  · ${FILE_URL}`);

  /* ---------- [1] 静态结构与版式 ---------- */
  console.log('\n[1] 版式 / 材质 / 一层容器');
  const page = await openPage({ offlineOk: true, onlineOk: true });
  await shot(page, 'activate-default');

  const assets = await auditAssets(page);
  console.log(`  · 图片 ${assets.map((a) => `${a.src}=${a.ok ? a.size : '❌未加载'}`).join('  ')}`);
  check('品牌图标与吉祥物都已解码', assets.length === 2 && assets.every((a) => a.ok), JSON.stringify(assets));
  check(
    '资源走 ui/assets/ 相对路径',
    assets.every((a) => String(a.src).startsWith('assets/')),
    assets.map((a) => a.src).join(','),
  );

  // ⚠️ 先让焦点离开输入框再读材质：页面默认会聚焦输入框，此时 .panel:focus-within
  //    会把描边切成品牌色 —— 那是刻意的高亮反馈，不是材质漂移。静止态才该拿来对值。
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await wait(160);
  const mat = await auditMaterial(page);
  console.log(`    左栏   ${mat.rail?.backdrop}  r=${mat.rail?.radius}  bg=${mat.rail?.bg}`);
  console.log(`    面板   ${mat.panel?.backdrop}  r=${mat.panel?.radius}  bg=${mat.panel?.bg}`);
  console.log(`    输入框 ${mat.field?.backdrop}`);
  console.log(`    滑槽   ${mat.seg?.backdrop}`);
  console.log(`    滑块   ${mat.thumb?.backdrop}`);
  console.log(`    主按钮 ${mat.brand?.backdrop}  bg=${mat.brand?.bg}`);
  const hasMat = (m) => /blur/.test(m?.backdrop || '') && /saturate/.test(m?.backdrop || '');
  check('左栏有材质（blur+saturate）', hasMat(mat.rail), mat.rail?.backdrop);
  check('左栏无圆角（不是"第二个圆角矩形"）', mat.rail?.radius === '0px', mat.rail?.radius);
  check('面板有材质（blur+saturate）', hasMat(mat.panel), mat.panel?.backdrop);
  check('面板圆角 = 20px', mat.panel?.radius === '20px', mat.panel?.radius);
  check('输入框吃到材质', hasMat(mat.field), mat.field?.backdrop);
  check('分段滑槽是凹槽材质', hasMat(mat.seg), mat.seg?.backdrop);
  check('分段滑块有材质', hasMat(mat.thumb), mat.thumb?.backdrop);
  // —— 逐值对齐 material-css.ts（手写副本最容易在这里悄悄漂移）——
  check(
    '面板描边对齐唯一来源（--mat-border .58）',
    /rgba\(255, 255, 255, 0\.58\)/.test(mat.panel?.border || ''),
    mat.panel?.border,
  );
  check(
    '卡片材质带第三层内辉（光在介质里漫反射，漏了会"发干"）',
    /24px -10px/.test(mat.panel?.shadow || ''),
    mat.panel?.shadow,
  );
  check(
    '控件内缘光强于卡片（--mat-edge .72/.64）',
    /rgba\(255, 255, 255, 0\.72\)/.test(mat.field?.shadow || '') &&
      /rgba\(255, 255, 255, 0\.64\)/.test(mat.field?.shadow || ''),
    mat.field?.shadow,
  );
  check(
    '滑块比滑槽亮（空间化的物理判据）',
    (() => {
      const a = (s) => {
        const m = String(s || '').match(/rgba?\(([^)]+)\)/);
        if (!m) return 0;
        const p = m[1].split(',').map((v) => parseFloat(v.trim()));
        return (p[3] === undefined ? 1 : p[3]) * (p[0] + p[1] + p[2]) / 3;
      };
      return a(mat.thumb?.bg) > a(mat.seg?.bg);
    })(),
    `thumb=${mat.thumb?.bg} > groove=${mat.seg?.bg}`,
  );
  // 默认态 #btn-submit 是 disabled → 材质被撤掉（只留实色灰），这是刻意设计
  check('禁用态按钮撤掉材质（读得出"按不动"）', !hasMat(mat.brand), mat.brand?.backdrop);
  console.log(
    `  · .mat-press 挂了 ${mat.pressCount} 个 / 主按钮 position=${mat.press?.pos}` +
      ` / ::after blend=${mat.press?.afterBlend} / @property --mgr=${mat.press?.radiusVar}`,
  );
  check('按压反馈已挂到控件上（≥3 个）', mat.pressCount >= 3, `${mat.pressCount} 个`);
  check('按压点光源的 ::after 存在', mat.press?.afterContent !== 'none', mat.press?.afterContent);
  check('点光源走 plus-lighter（把光"加"上去）', mat.press?.afterBlend === 'plus-lighter', mat.press?.afterBlend);
  check('涟漪半径已用 @property 注册（否则无法插值）', /px$/.test(mat.press?.radiusVar || ''), mat.press?.radiusVar);
  check('按压反馈的定位上下文就位', mat.press?.pos === 'relative', mat.press?.pos);

  // 聚焦反馈：面板描边切成品牌色（focus-within）
  await page.focus('#blob');
  await wait(160);
  const focusedBorder = await page.$eval('section.panel', (el) => getComputedStyle(el).borderTopColor);
  check('聚焦时面板描边切成品牌色（focus-within 反馈）', /rgba\(5, 150, 105/.test(focusedBorder), focusedBorder);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await wait(140);

  const bq = await auditBoxes(page);
  console.log(
    `  · 面板内圆角盒子 ${bq.boxes.length} 个：` +
      bq.boxes.map((b) => `${b.tag}[${b.kind === 'other' ? '❌非控件' : b.kind === 'icon' ? '图标基座' : '控件'}]d${b.depth}`).join(' '),
  );
  const maxDepth = Math.max(0, ...bq.boxes.map((b) => b.depth));
  check('面板内无"非控件/非图标基座"盒子', bq.offenders.length === 0, bq.offenders.join(' | '));
  check('无三级嵌套（最大深度 ≤2）', maxDepth <= 2, `max=${maxDepth}`);

  const ov = await auditOverflow(page);
  check('无溢出', ov.length === 0, ov.join(' | '));

  /* ---------- [2] 绑定与默认态 ---------- */
  console.log('\n[2] 设备指纹回显 / 默认离线态');
  const dev = await page.$eval('#device-id', (el) => el.textContent.trim());
  const crumb = await page.$eval('#crumb-step', (el) => el.textContent.trim());
  const onlineHidden = await page.$eval('#panel-online', (el) => el.hidden);
  const offlineHidden = await page.$eval('#panel-offline', (el) => el.hidden);
  const submit0 = await page.$eval('#btn-submit', (el) => ({ disabled: el.disabled, text: el.textContent.trim() }));
  console.log(`  · device-id = ${dev}`);
  console.log(`  · crumb = ${crumb} / online.hidden=${onlineHidden} / offline.hidden=${offlineHidden}`);
  check('设备指纹已回显（走 licenseInfo 桥接）', dev === DEVICE_ID, dev);
  check('默认落在线离线授权串', crumb === '离线授权串', crumb);
  check('默认只显示离线面板', onlineHidden === true && offlineHidden === false, `online=${onlineHidden} offline=${offlineHidden}`);
  check('空输入时提交按钮禁用', submit0.disabled === true && submit0.text === '激活', JSON.stringify(submit0));

  /* ---------- [3] 提交阈值 ---------- */
  console.log('\n[3] 输入阈值（离线 ≥40 / 在线 ≥12）');
  await page.type('#blob', 'x'.repeat(30));
  await wait(120);
  const at30 = await page.$eval('#btn-submit', (el) => el.disabled);
  await page.type('#blob', 'y'.repeat(20));
  await wait(120);
  const at50 = await page.$eval('#btn-submit', (el) => el.disabled);
  check('离线串 30 字仍禁用', at30 === true, `disabled=${at30}`);
  check('离线串 50 字放开', at50 === false, `disabled=${at50}`);

  /* ---------- [3b] 按压反馈（真实按住） ---------- */
  console.log('\n[3b] 按压反馈：③ 弹性 + ④ 点光源（真的按住读运行时状态）');
  const press = await pressTest(page, '#btn-submit', () => shot(page, 'activate-press'));
  console.log(
    `  · 按住中 :active=${press.held.active} scale=${press.held.scale} filter=${press.held.filter}` +
      ` ::after.opacity=${press.held.afterOpacity}`,
  );
  console.log(`  · 松开后 scale=${press.released.scale} ::after.opacity=${press.released.afterOpacity}`);
  check('按住时命中 :active', press.held.active === true, String(press.held.active));
  check(
    '③ 按压弹性：scale 缩到 <1（走独立 scale 属性，不被 transform 通道抢走）',
    parseFloat(press.held.scale) < 1 && parseFloat(press.held.scale) > 0.9,
    press.held.scale,
  );
  check('③ 按压压暗：filter 带 brightness(<1)', /brightness\(0?\.9/.test(press.held.filter), press.held.filter);
  check('④ 按压点光源：按住时 ::after 可见', press.held.afterOpacity > 0 && press.held.afterDisplay !== 'none', `opacity=${press.held.afterOpacity}`);
  check(
    '④ 涟漪式：松开后归零，不留常驻白光',
    press.released.afterOpacity === 0,
    `opacity=${press.released.afterOpacity}`,
  );
  // ⚠️ 松开后 scale 的计算值是 `none`（未声明即"不缩放"），不是 1 —— 归一化再比
  const scaleNum = (v) => {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 1 : n;
  };
  check(
    '松开后回弹到原始尺寸',
    Math.abs(scaleNum(press.released.scale) - 1) < 0.02,
    `${press.released.scale} → ${scaleNum(press.released.scale)}`,
  );
  // 按压不应把页面推进到提交完成态（probe 的松手位置必须移出控件）
  const afterPress = await page.$eval('#btn-submit', (el) => ({ text: el.textContent.trim(), disabled: el.disabled }));
  check('按压不产生点击副作用（仍停在未提交态）', afterPress.text === '激活', JSON.stringify(afterPress));

  /* ---------- [4] 离线激活链路 ---------- */
  console.log('\n[4] 离线激活（本地验签）');
  await page.click('#btn-submit');
  await wait(400);
  const offMsg = await page.$eval('#msg', (el) => ({ text: el.textContent.trim(), cls: el.className }));
  const offBtn = await page.$eval('#btn-submit', (el) => el.textContent.trim());
  const offCall = await page.evaluate(() => window.__calls.offline);
  console.log(`  · msg = ${offMsg.text} (${offMsg.cls}) / button = ${offBtn}`);
  check('调用了 licenseActivateOffline 且带上原串', typeof offCall === 'string' && offCall.length >= 40, String(offCall).slice(0, 24) + '…');
  check('成功态文案', /导入成功|正在启动/.test(offMsg.text) && /ok/.test(offMsg.cls), `${offMsg.text}|${offMsg.cls}`);
  check('按钮切到结果文案', offBtn === '导入成功', offBtn);
  await shot(page, 'activate-offline-done');
  await page.close();

  /* ---------- [5] 在线切换 + 激活链路 ---------- */
  console.log('\n[5] 在线激活链路');
  const p2 = await openPage({ offlineOk: true, onlineOk: true });
  await p2.click('.tab[data-mode="online"]');
  await wait(300);
  await shot(p2, 'activate-online');
  const crumb2 = await p2.$eval('#crumb-step', (el) => el.textContent.trim());
  const onlineShown = await p2.$eval('#panel-online', (el) => !el.hidden);
  const activeMode = await p2.$eval('.tab.active', (el) => el.dataset.mode);
  check('切到在线：面包屑更新', crumb2 === '在线激活', crumb2);
  check('切到在线：面板互换', onlineShown === true, `onlineShown=${onlineShown}`);
  check('选中态落在在线页签', activeMode === 'online', activeMode);

  await p2.type('#code', 'stv-abcd-1234');
  await wait(120);
  const lowDisabled = await p2.$eval('#btn-submit', (el) => el.disabled);
  const sanitized = await p2.$eval('#code', (el) => el.value);
  check('在线码 < 12 位（去符号后）仍禁用', lowDisabled === true, `disabled=${lowDisabled} value=${sanitized}`);
  await p2.type('#code', '-ef56-7890');
  await wait(120);
  const highDisabled = await p2.$eval('#btn-submit', (el) => el.disabled);
  check('补足后放开', highDisabled === false, `disabled=${highDisabled}`);
  const upper = await p2.$eval('#code', (el) => el.value);
  check('输入自动大写并剔除非法字符', /^[0-9A-Z-]+$/.test(upper) && upper === upper.toUpperCase(), upper);

  await p2.click('#btn-submit');
  await wait(400);
  const onMsg = await p2.$eval('#msg', (el) => el.textContent.trim());
  const onCall = await p2.evaluate(() => window.__calls.online);
  check('调用了 licenseActivate 且带原始码', typeof onCall === 'string' && onCall.includes('STV'), String(onCall));
  check('在线成功态文案', /激活成功/.test(onMsg), onMsg);
  await p2.close();

  /* ---------- [6] 失败兜底 ---------- */
  console.log('\n[6] 激活失败 → 兜底文案 + 标红');
  const p3 = await openPage({ offlineOk: false, onlineOk: false });
  await p3.type('#blob', 'invalid-blob-' + 'z'.repeat(40));
  await wait(120);
  await p3.click('#btn-submit');
  await wait(400);
  const failMsg = await p3.$eval('#msg', (el) => ({ text: el.textContent.trim(), cls: el.className }));
  const invalidCls = await p3.$eval('#blob', (el) => el.className);
  const failBtn = await p3.$eval('#btn-submit', (el) => ({ text: el.textContent.trim(), disabled: el.disabled }));
  console.log(`  · msg = ${failMsg.text} (${failMsg.cls})`);
  check('失败文案用 error 色', /error/.test(failMsg.cls), failMsg.cls);
  check('失败文案带服务端原因', /签名不匹配/.test(failMsg.text), failMsg.text);
  check('输入框被标红（.invalid）', /invalid/.test(invalidCls), invalidCls);
  check('按钮复位到「激活」且可重试', failBtn.text === '激活' && failBtn.disabled === false, JSON.stringify(failBtn));
  await shot(p3, 'activate-error');

  console.log('[6b] 在线失败必须引导去用离线串');
  const p4 = await openPage({ offlineOk: false, onlineOk: false });
  await p4.click('.tab[data-mode="online"]');
  await wait(200);
  await p4.type('#code', 'STV-BAD0-0000-0000');
  await wait(120);
  await p4.click('#btn-submit');
  await wait(400);
  const onFailMsg = await p4.$eval('#msg', (el) => el.textContent.trim());
  console.log(`  · msg = ${onFailMsg.replace(/\n+/g, ' ⏎ ').slice(0, 80)}`);
  check('在线失败提示切换到离线授权串', /离线授权串/.test(onFailMsg), onFailMsg.slice(0, 60));
  check('在线失败提示把指纹给管理员', /管理员|指纹/.test(onFailMsg), '');
  await p4.close();

  /* ---------- [7] 退出与日志 ---------- */
  console.log('\n[7] 退出 / 打开日志');
  await p3.click('#btn-close');
  await wait(200);
  const quitCalls = await p3.evaluate(() => window.__calls.quit);
  check('#btn-close 走 licenseQuit', quitCalls === 1, `quit=${quitCalls}`);
  await p3.click('#btn-logs');
  await wait(200);
  const logCalls = await p3.evaluate(() => window.__calls.logs);
  check('#btn-logs 走 openLogs', logCalls === 1, `logs=${logCalls}`);
  await p3.close();

  /* ---------- [8] 窄窗兜底 ---------- */
  console.log('\n[8] 窗口收窄到 1024x640（桌面端 minWidth 附近）');
  const p5 = await openPage({ offlineOk: true, onlineOk: true });
  await p5.setViewport({ width: 1024, height: 640 });
  await wait(400);
  const ovn = await auditOverflow(p5);
  check('窄窗下仍无溢出', ovn.length === 0, ovn.join(' | '));
  await shot(p5, 'activate-narrow-1024');
  await p5.close();

  /* ==================================================================
     启动画面（splash.html，440×300）
     它与激活页共享 assets/material.css，所以这里同样做材质断言。
     ================================================================== */
  console.log(`\n=============== 启动画面 ${SPLASH_W}x${SPLASH_H} ===============`);
  console.log(`  · ${pathToFileURL(SPLASH).href}`);

  if (!fs.existsSync(SPLASH)) {
    check('splash.html 存在', false, SPLASH);
  } else {
    const sp = await browser.newPage();
    sp.on('pageerror', (e) => errors.push(`[splash pageerror] ${e.message}`));
    sp.on('console', (m) => {
      if (m.type() === 'error') errors.push(`[splash] console: ${m.text().slice(0, 200)}`);
    });
    await sp.setViewport({ width: SPLASH_W, height: SPLASH_H });
    await sp.evaluateOnNewDocument(() => {
      window.__calls = { logs: 0, retry: 0 };
      window.stravisionDesktop = {
        isDesktop: true,
        // 页面把回调交进来 → 存起来供探针手动喂 payload
        onBootstrapStatus: (cb) => {
          window.__statusCb = cb;
        },
        openLogs: async () => {
          window.__calls.logs++;
        },
        retryBootstrap: async () => {
          window.__calls.retry++;
        },
      };
    });
    await sp.goto(pathToFileURL(SPLASH).href, { waitUntil: 'load' });
    await wait(700);
    await shot(sp, 'splash-default');

    console.log('\n[9] 极光 / 资源 / 初始态');
    const base = await sp.evaluate(() => {
      const aurora = document.querySelector('.aurora');
      const before = aurora ? getComputedStyle(aurora, '::before') : null;
      const imgs = Array.from(document.querySelectorAll('img')).map((i) => ({
        src: i.getAttribute('src'),
        ok: i.complete && i.naturalWidth > 0,
        size: `${i.naturalWidth}x${i.naturalHeight}`,
      }));
      const barEl = document.querySelector('.bar');
      const fillEl = document.querySelector('.bar-fill');
      return {
        beforeBg: before ? before.backgroundImage.replace(/\s+/g, ' ') : null,
        beforeAnim: before ? before.animationName : null,
        imgs,
        status: document.getElementById('status').textContent.trim(),
        actionsShown: getComputedStyle(document.getElementById('actions')).display !== 'none',
        trackBg: barEl ? getComputedStyle(barEl).backgroundColor : null,
        trackShadow: barEl ? getComputedStyle(barEl).boxShadow.replace(/\s+/g, ' ') : null,
        fillBg: fillEl ? getComputedStyle(fillEl).backgroundColor : null,
        statusCbBound: typeof window.__statusCb === 'function',
      };
    });
    console.log(`  · 极光 ::before animation=${base.beforeAnim} 径向渐变 ${(base.beforeBg?.match(/radial-gradient/g) || []).length} 团`);
    console.log(`  · 图片 ${base.imgs.map((a) => `${a.src}=${a.ok ? a.size : '❌未加载'}`).join('  ')}`);
    check(
      '极光是三团径向渐变（与 AI 助手首页同源）',
      (base.beforeBg?.match(/radial-gradient/g) || []).length === 3,
      `${(base.beforeBg?.match(/radial-gradient/g) || []).length} 团`,
    );
    check('极光在漂移（animation 已挂）', base.beforeAnim === 'aurora-drift', base.beforeAnim);
    check('品牌图标与吉祥物都已解码', base.imgs.length === 2 && base.imgs.every((a) => a.ok), JSON.stringify(base.imgs));
    check('onBootstrapStatus 已注册', base.statusCbBound === true, String(base.statusCbBound));
    check('初始无错误 → 动作键隐藏', base.actionsShown === false, `shown=${base.actionsShown}`);
    check('首屏文案', base.status.length > 0, base.status);
    console.log(`  · 进度槽 bg=${base.trackBg} / 填充 bg=${base.fillBg}`);
    check('进度槽走中性介质凹槽（不是纯黑蒙版）', /rgba\(120, 120, 128/.test(base.trackBg || ''), base.trackBg);
    check('进度槽带凹槽内阴影（上沿暗 / 下沿受光）', /inset/.test(base.trackShadow || ''), base.trackShadow);
    check('进度填充是品牌色', /rgb\(5, 150, 105\)/.test(base.fillBg || ''), base.fillBg);

    console.log('\n[10] 出错态 → 动作键材质与按压');
    await sp.evaluate(() => window.__statusCb({ text: '启动失败', error: 'listen EADDRINUSE 127.0.0.1:3110', progress: 62 }));
    await wait(400);
    await shot(sp, 'splash-error');

    const errState = await sp.evaluate(() => {
      const s = document.getElementById('status');
      // ⚠️ 进度填充的 id 是 `bar`，`bar-fill` 只是 class（别按 id 取，会拿到 null）
      const fill = document.getElementById('bar');
      const actions = document.getElementById('actions');
      const ghost = document.getElementById('btn-logs');
      const brand = document.getElementById('btn-retry');
      const pick = (el) => ({
        backdrop: (getComputedStyle(el).backdropFilter || 'none').replace(/\s+/g, ' '),
        bg: getComputedStyle(el).backgroundColor,
        radius: getComputedStyle(el).borderTopLeftRadius,
        border: getComputedStyle(el).borderTopColor,
        shadow: getComputedStyle(el).boxShadow.replace(/\s+/g, ' '),
      });
      return {
        text: s.textContent.trim(),
        isError: s.classList.contains('error'),
        hint: document.getElementById('hint').textContent.trim(),
        fillError: fill.classList.contains('error'),
        actionsShown: getComputedStyle(actions).display !== 'none',
        barWidth: fill.style.width,
        ghost: pick(ghost),
        brand: pick(brand),
      };
    });
    console.log(`  · status=${errState.text} (error=${errState.isError}) / hint=${errState.hint}`);
    console.log(`  · 进度 ${errState.barWidth} / 填充转为 danger=${errState.fillError} / 动作键显示=${errState.actionsShown}`);
    console.log(`    打开日志 ${errState.ghost.backdrop}  bg=${errState.ghost.bg}`);
    console.log(`    重试     ${errState.brand.backdrop}  bg=${errState.brand.bg}`);
    check('出错态文案与颜色就位', errState.text === '启动失败' && errState.isError === true, `${errState.text}|${errState.isError}`);
    check('错误详情写进 hint', /EADDRINUSE/.test(errState.hint), errState.hint);
    check('进度条转为 danger 语义色', errState.fillError === true, String(errState.fillError));
    check('出错态展开动作键', errState.actionsShown === true, `shown=${errState.actionsShown}`);
    check('「打开日志」吃到幽灵材质', hasMat(errState.ghost), errState.ghost.backdrop);
    check('「打开日志」是低 alpha 介质（不是平白 86%）', /rgba\(255, 255, 255, 0\.3\)/.test(errState.ghost.bg), errState.ghost.bg);
    check('「重试」吃到品牌材质（边缘光 > 0）', hasMat(errState.brand), errState.brand.backdrop);
    check(
      '「重试」描边是白受光边而非灰描边',
      /rgba\(255, 255, 255, 0\.28\)/.test(errState.brand.border || ''),
      errState.brand.border,
    );
    check(
      '「重试」是品牌实底（不能靠降不透明度换光感）',
      /rgba\(0, 140, 80, 0\.94\)/.test(errState.brand.bg || ''),
      errState.brand.bg,
    );

    const spPress = await pressTest(sp, '#btn-retry', () => shot(sp, 'splash-press'));
    console.log(
      `  · 按住中 scale=${spPress.held.scale} ::after.opacity=${spPress.held.afterOpacity}` +
        ` / 松开后 ::after.opacity=${spPress.released.afterOpacity}`,
    );
    check('启动页也有按压弹性', parseFloat(spPress.held.scale) < 1 && parseFloat(spPress.held.scale) > 0.9, spPress.held.scale);
    check('启动页也有按压点光源（松开归零）', spPress.held.afterOpacity > 0 && spPress.released.afterOpacity === 0, `${spPress.held.afterOpacity}→${spPress.released.afterOpacity}`);

    const ovSp = await auditOverflow(sp);
    check('启动页 440×300 无溢出', ovSp.length === 0, ovSp.join(' | '));

    // 吉祥物是**刻意出血**在右下角的（right:-4px / bottom:-10px）—— 量一下别切多了
    const mascotBox = await sp.evaluate(() => {
      const m = document.querySelector('.mascot');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      return {
        bleedRight: Math.round(r.right - window.innerWidth),
        bleedBottom: Math.round(r.bottom - window.innerHeight),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });
    console.log(
      `  · 吉祥物 ${mascotBox?.w}x${mascotBox?.h}，右出血 ${mascotBox?.bleedRight}px / 下出血 ${mascotBox?.bleedBottom}px`,
    );
    check(
      '吉祥物按设计小出血（右 ≤6px / 下 ≤12px，不能被切掉半张脸）',
      !!mascotBox && mascotBox.bleedRight <= 6 && mascotBox.bleedBottom <= 12,
      JSON.stringify(mascotBox),
    );

    console.log('\n[11] 重试复位 / 打开日志桥接');
    await sp.click('#btn-retry');
    await wait(300);
    const afterRetry = await sp.evaluate(() => ({
      retry: window.__calls.retry,
      text: document.getElementById('status').textContent.trim(),
      isError: document.getElementById('status').classList.contains('error'),
      shown: getComputedStyle(document.getElementById('actions')).display !== 'none',
      barWidth: document.getElementById('bar').style.width,
    }));
    console.log(`  · 重试后 status=${afterRetry.text} error=${afterRetry.isError} 动作键=${afterRetry.shown} 进度=${afterRetry.barWidth}`);
    check('「重试」调用了 retryBootstrap', afterRetry.retry === 1, `retry=${afterRetry.retry}`);
    check('重试复位了错误态与动作键', afterRetry.isError === false && afterRetry.shown === false, JSON.stringify(afterRetry));
    check('重试把进度条打回 4%', afterRetry.barWidth === '4%', afterRetry.barWidth);

    await sp.evaluate(() => window.__statusCb({ text: '又失败了', error: 'boom' }));
    await wait(250);
    await sp.click('#btn-logs');
    await wait(250);
    const logs = await sp.evaluate(() => window.__calls.logs);
    check('「打开日志」走 openLogs 桥接', logs === 1, `logs=${logs}`);

    await sp.close();
  }
} finally {
  await browser.close();
}

const realErrors = [...new Set(errors)];
if (realErrors.length) {
  console.log(`\n❌ 静态引导页 JS 错误:\n${realErrors.slice(0, 8).join('\n')}`);
  failures++;
} else {
  console.log('\n✅ 静态引导页无 JS 错误（splash + activate）');
}

console.log(`\n================== 结果：${failures ? `❌ ${failures} 项未通过` : '✅ 全部通过'} ==================`);
process.exit(failures ? 1 : 0);
