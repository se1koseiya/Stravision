// 生成技术手册配图（SVG 源文件，随后渲染为 PNG）
// 风格：学术论文线稿 —— 单色墨线、衬线字体、无圆角色块、单一强调色、含图例与量化刻度。
// 输出：docs/figures/fig*.svg（宽度统一 820，配合 docx 内 16cm 版心）

import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "docs/figures";
mkdirSync(OUT, { recursive: true });

/* ───────────── 基础样式常量 ───────────── */
const S = {
  ink: "#111111",
  g1: "#333333",
  g2: "#5f5f5f",
  g3: "#8a8a8a",
  hair: "#b8b8b8",
  line: "#1a1a1a",
  fill: "#ffffff",
  tint: "#f4f4f4",
  tint2: "#e8e8e8",
  accent: "#14584a",
  accentTint: "#eef3f1",
};
const FF = "'Times New Roman','SimSun','Songti SC',serif";
const MONO = "'Consolas','Courier New',monospace";

/* ───────────── 图元工具 ───────────── */
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function textW(str, size) {
  let w = 0;
  for (const ch of String(str)) {
    w += ch.codePointAt(0) > 0x2e80 ? size : size * 0.5;
  }
  return w;
}

function T(x, y, s, o = {}) {
  const {
    size = 12,
    fill = S.ink,
    anchor = "middle",
    weight = 400,
    italic = false,
    ls = 0,
    rotate = null,
    family = FF,
  } = o;
  const a = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${family}"`,
    `font-size="${size}"`,
    `fill="${fill}"`,
    `text-anchor="${anchor}"`,
    `font-weight="${weight}"`,
  ];
  if (italic) a.push('font-style="italic"');
  if (ls) a.push(`letter-spacing="${ls}"`);
  if (rotate !== null) a.push(`transform="rotate(${rotate} ${x} ${y})"`);
  return `<text ${a.join(" ")}>${esc(s)}</text>`;
}

function rect(x, y, w, h, o = {}) {
  const { fill = "none", stroke = S.line, sw = 1, dash = null, rx = 0 } = o;
  let a = `x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"`;
  if (stroke) a += ` stroke="${stroke}" stroke-width="${sw}"`;
  if (dash) a += ` stroke-dasharray="${dash}"`;
  if (rx) a += ` rx="${rx}"`;
  return `<rect ${a}/>`;
}

function ln(x1, y1, x2, y2, o = {}) {
  const { dash = null, sw = 1, stroke = S.line, mk = null, head = "ah" } = o;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${
    dash ? ` stroke-dasharray="${dash}"` : ""
  }${mk ? ` marker-end="url(#${head})"` : ""}/>`;
}

function path(d, o = {}) {
  const { dash = null, sw = 1, stroke = S.line, mk = null, head = "ah", fill = "none" } = o;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${
    dash ? ` stroke-dasharray="${dash}"` : ""
  }${mk ? ` marker-end="url(#${head})"` : ""}/>`;
}

const DTAG = "5 3.2";

/** 折线箭头 */
function poly(pts, o = {}) {
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return path(d, o);
}

/** 节点框：可含构造型 / 主名 / 英文 / 代码路径 */
function node(x, y, w, h, o = {}) {
  const { cn, en, mono, stereo, accent = false, fill = S.fill, sw = 1 } = o;
  const st = accent ? S.accent : S.line;
  let g = rect(x, y, w, h, {
    fill: accent ? S.accentTint : fill,
    stroke: st,
    sw: accent ? 1.4 : sw,
  });
  const L = [];
  if (stereo) L.push({ t: `«${stereo}»`, s: 10, f: S.g2, ital: true });
  if (cn) L.push({ t: cn, s: 13.5, w: 600, f: S.ink });
  if (en) L.push({ t: en, s: 10.5, f: S.g2, ital: true });
  if (mono) L.push({ t: mono, s: 10, f: S.g3, fam: MONO });
  const gaps = 3.2;
  const hs = L.map((l) => l.s * 1.42);
  const total = hs.reduce((a, b) => a + b, 0) + gaps * (L.length - 1);
  let cy = y + h / 2 - total / 2;
  L.forEach((l, i) => {
    g += T(x + w / 2, cy + hs[i] * 0.76, l.t, {
      size: l.s,
      fill: l.f,
      weight: l.w || 400,
      italic: !!l.ital,
      family: l.fam || FF,
    });
    cy += hs[i] + gaps;
  });
  return g;
}

/** 起止符（圆角矩形） */
function terminator(x, y, w, h, label) {
  return (
    rect(x, y, w, h, { fill: S.tint2, stroke: S.line, rx: h / 2 }) +
    T(x + w / 2, y + h / 2 + 4.6, label, { size: 12.5, weight: 600 })
  );
}

/** 判定菱形 */
function diamond(cx, cy, w, h, label, sub) {
  let g = path(
    `M${cx},${cy - h / 2} L${cx + w / 2},${cy} L${cx},${cy + h / 2} L${cx - w / 2},${cy} Z`,
    { fill: S.fill, stroke: S.line }
  );
  const dy = sub ? -3 : 4.6;
  g += T(cx, cy + dy, label, { size: 11.5, weight: 600 });
  if (sub) g += T(cx, cy + 11, sub, { size: 9.5, fill: S.g2, italic: true });
  return g;
}

/** 带白底的线上标注（用于切断线条） */
function onLine(x, y, s, o = {}) {
  const size = o.size || 10.5;
  const w = textW(s, size) + 8;
  return (
    rect(x - w / 2, y - size * 0.72 - 2.5, w, size * 1.44 + 5, { fill: "#ffffff", stroke: null }) +
    T(x, y, s, { size, fill: o.fill || S.g1, italic: o.italic !== false })
  );
}

/** 图例 */
function legend(x, y, items, o = {}) {
  const size = o.size || 10.5;
  const gap = o.gap || 26;
  let g = "";
  let cx = x;
  for (const it of items) {
    const gy = y - 4;
    if (it.kind === "solid") g += ln(cx, gy, cx + 22, gy, { sw: 1.1, mk: true });
    else if (it.kind === "dash") g += ln(cx, gy, cx + 22, gy, { sw: 1, dash: DTAG, mk: true });
    else if (it.kind === "box") g += rect(cx, gy - 6, 22, 12, { fill: S.fill });
    else if (it.kind === "tint") g += rect(cx, gy - 6, 22, 12, { fill: S.tint2 });
    else if (it.kind === "accent") g += rect(cx, gy - 6, 22, 12, { fill: S.accentTint, stroke: S.accent, sw: 1.4 });
    g += T(cx + 28, y, it.text, { size, anchor: "start", fill: S.g1 });
    cx += 28 + textW(it.text, size) + gap;
  }
  return g;
}

/** 画布外壳 */
function svg(w, h, body) {
  const mk = (id, c) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.4" markerHeight="6.4" orient="auto-start-reverse"><path d="M0,0L10,5L0,10Z" fill="${c}"/></marker>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>${mk("ah", S.line)}${mk("ahg", S.g2)}${mk("aha", S.accent)}</defs>
<rect width="${w}" height="${h}" fill="#ffffff"/>
${body}
</svg>`;
}

/* ═════════════ 图 1  业务闭环五段流水线 ═════════════ */
function fig1() {
  const W = 820, H = 262;
  const st = [
    ["接入与鉴权", "Access & Auth", "middleware.ts"],
    ["上下文装配", "Context Build", "lib/ai/context"],
    ["模型决策", "Inference", "route.ts"],
    ["工具执行", "Tool Exec", "TOOL_CAPABILITIES"],
    ["结果回灌", "Compaction", "compactToolResult"],
  ];
  const bw = 125, gap = 32, x0 = 34, by = 62, bh = 80;
  let g = "";
  st.forEach(([cn, en, mono], i) => {
    const x = x0 + i * (bw + gap);
    const cx = x + bw / 2;
    g += T(cx, by - 12, `S${i + 1}`, { size: 11, weight: 600, fill: S.g2, ls: 0.6 });
    g += node(x, by, bw, bh, { cn, en, mono, accent: i >= 2 && i <= 3 });
    if (i < st.length - 1) {
      g += ln(x + bw + 3, by + bh / 2, x + bw + gap - 4, by + bh / 2, { sw: 1.1, mk: true });
    }
  });
  // 反馈回环
  const c3 = x0 + 2 * (bw + gap) + bw / 2;
  const c5 = x0 + 4 * (bw + gap) + bw / 2;
  g += poly(
    [
      [c5, by + bh + 2],
      [c5, 202],
      [c3, 202],
      [c3, by + bh + 6],
    ],
    { dash: DTAG, sw: 1, mk: true, head: "ah" }
  );
  g += onLine(560, 202, "观测结果回灌 · 至多 5 轮");
  g += legend(34, 236, [
    { kind: "solid", text: "数据与请求流向" },
    { kind: "dash", text: "反馈与控制回环" },
    { kind: "accent", text: "决策与执行中枢" },
  ]);
  return svg(W, H, g);
}

/* ═════════════ 图 2  四层架构 ═════════════ */
function fig2() {
  const W = 820, H = 618;
  const bands = [
    {
      label: "接入层",
      en: "Access",
      boxes: [
        { cn: "Web 与移动端", en: "Next.js Client", mono: "app/(routes)" },
        { cn: "桌面端", en: "Electron 44", mono: "desktop/main" },
        { cn: "设备与网关", en: "MQTT 5 / TLS", mono: "8883 · 11883" },
      ],
    },
    {
      label: "应用层",
      en: "Application",
      boxes: [
        { cn: "路由与页面", en: "77 routes", mono: "app/" },
        { cn: "接口层", en: "198 handlers", mono: "app/api/**/route.ts" },
        { cn: "中间件与流式", en: "SSE / Guard", mono: "middleware.ts" },
      ],
    },
    {
      label: "领域层",
      en: "Domain",
      boxes: [
        { cn: "AI 执行链", en: "Agent Loop", mono: "lib/ai/**" },
        { cn: "业务模块", en: "Domain Services", mono: "lib/services/**" },
        { cn: "工具注册表", en: "59 tools / 14 groups", mono: "lib/ai/tools" },
      ],
    },
    {
      label: "基础设施",
      en: "Infrastructure",
      boxes: [
        { cn: "PostgreSQL", en: "55 tables", mono: ":5432 / :5433" },
        { cn: "Redis · Valkey", en: "Cache / HITL", mono: ":6379" },
        { cn: "对象与文件", en: "uploads / logs", mono: "fs.readFile" },
      ],
    },
  ];
  const bx = 32, bw = 756, strip = 62, gap = 26, bh = 104;
  const by0 = 62;
  let g = "";
  bands.forEach((b, i) => {
    const y = by0 + i * (bh + gap);
    g += rect(bx, y, bw, bh, { fill: "#fff", stroke: S.line });
    g += rect(bx, y, strip, bh, { fill: S.tint, stroke: S.line });
    g += T(bx + strip / 2, y + bh / 2, b.label, { size: 12.5, weight: 600, rotate: -90 });
    // 内容三栏（可用宽度 = 756 - 62 - 20 = 674）
    const cx0 = bx + strip + 16;
    const cw = 209, cgap = 19;
    b.boxes.forEach((bxx, j) => {
      const x = cx0 + j * (cw + cgap);
      g += node(x, y + 19, cw, bh - 38, bxx);
    });
    // 层间协议标注
    if (i < bands.length - 1) {
      const my = y + bh + gap / 2;
      const labels = ["HTTP / SSE（请求—响应）", "进程内函数调用（TypeScript 同构）", "SQL / RESP / MQTT（连接池）"];
      g += ln(bx + 4, my, bx + bw - 4, my, { sw: 0.7, stroke: S.hair });
      g += onLine(bx + bw / 2, my + 3.6, labels[i], { size: 10, fill: S.g2 });
    }
  });
  // 依赖方向
  const ax = 792;
  g += ln(ax, by0 + 4 * bh + 3 * gap, ax, by0 - 6, { sw: 1, mk: true, head: "ahg" });
  g += T(ax + 14, by0 + 2 * bh + 1.5 * gap, "依赖方向", { size: 10, fill: S.g2, rotate: -90, italic: true });
  return svg(W, H, g);
}

/* ═════════════ 图 3  本地一体化运行拓扑 ═════════════ */
function fig3() {
  const W = 820, H = 572;
  let g = "";
  // 外部：模型供应商
  g += node(56, 20, 220, 52, { stereo: "external", cn: "大模型供应商 API", en: "HTTPS / SSE" });
  // 边界
  const bX = 32, bY = 96, bW = 756, bH = 344;
  g += rect(bX, bY, bW, bH, { stroke: S.g1, sw: 1.1, dash: "6 4" });
  g += T(bX + 4, bY - 8, "单机边界（用户主机 · Windows / macOS / Linux）", {
    size: 10.5, anchor: "start", fill: S.g2, italic: true,
  });
  // Tier A
  g += node(56, 118, 320, 76, { stereo: "process", cn: "Electron 主进程", en: "窗口 / 托盘 / 更新 / 窗口命令", mono: "desktop/main.ts" });
  g += node(420, 118, 344, 76, { stereo: "browser", cn: "渲染进程（React 界面）", en: "Next.js Client", mono: "app/(routes)" });
  g += ln(380, 156, 416, 156, { sw: 1.1, mk: true });
  g += T(398, 148, "IPC", { size: 9.5, fill: S.g2, italic: true });
  // Tier B
  g += node(56, 234, 708, 70, { stereo: "process", cn: "Next.js 服务进程（内嵌 HTTP :3000）", en: "App Router · 198 API handlers · Agent Loop", accent: true });
  // Tier C
  g += node(56, 336, 200, 82, { stereo: "datastore", cn: "PostgreSQL 16", en: "55 表", mono: ":5433" });
  g += node(286, 336, 200, 82, { stereo: "broker", cn: "aedes MQTT Broker", en: "MQTT 3.1.1", mono: ":11883" });
  g += node(516, 336, 248, 82, { stereo: "datastore", cn: "应用数据目录", en: "uploads / logs / pgdata", mono: "APPDATA/stravision" });
  // 纵向连接
  g += ln(206, 194, 206, 230, { sw: 1, mk: true });
  g += ln(590, 194, 590, 230, { sw: 1, mk: true });
  g += ln(156, 304, 156, 332, { sw: 1, mk: true });
  g += ln(386, 304, 386, 332, { sw: 1, mk: true });
  g += ln(640, 304, 640, 332, { sw: 1, mk: true });
  g += T(216, 222, "启动 / 监管", { size: 9.5, fill: S.g2, italic: true, anchor: "start" });
  g += T(598, 214, "fetch / SSE", { size: 9.5, fill: S.g2, italic: true, anchor: "start" });
  // 出站：模型供应商（走左侧通道并跨越单机边界）
  g += poly([[56, 269], [16, 269], [16, 46], [52, 46]], { sw: 1, mk: true, head: "ahg", dash: DTAG });
  // 设备（边界外）
  const dev = ["摄像头 / RTSP", "环境传感器", "执行器 / 继电器"];
  dev.forEach((d, i) => {
    const x = 165 + i * 170;
    g += node(x, 486, 150, 56, { stereo: "device", cn: d });
  });
  g += ln(386, 418, 386, 482, { sw: 1, mk: true, head: "ahg", dash: DTAG });
  g += T(394, 468, "MQTT over TLS :8883", { size: 9.5, fill: S.g2, anchor: "start", italic: true });
  g += legend(32, 556, [
    { kind: "solid", text: "进程内 / 本地连接" },
    { kind: "dash", text: "跨边界网络连接" },
  ]);
  return svg(W, H, g);
}

/* ═════════════ 图 4  云端集中运行拓扑 ═════════════ */
function fig4() {
  const W = 820, H = 500;
  let g = "";
  g += node(300, 20, 220, 50, { stereo: "external", cn: "浏览器 / 桌面端", en: "TLS 客户端" });
  const bX = 32, bY = 96, bW = 756, bH = 330;
  g += rect(bX, bY, bW, bH, { stroke: S.g1, sw: 1.1, dash: "6 4" });
  g += T(bX + 4, bY - 8, "app-network（Docker 桥接网络）", { size: 10.5, anchor: "start", fill: S.g2, italic: true });
  // 入口
  g += node(300, 116, 220, 70, { stereo: "container", cn: "反向代理 nginx", en: "TLS 终止 · proxy_pass", mono: ":443 / :80", accent: true });
  g += ln(410, 72, 410, 112, { sw: 1, mk: true });
  g += T(418, 88, "HTTPS", { size: 9.5, fill: S.g2, anchor: "start", italic: true });
  // 应用层
  g += node(56, 220, 220, 78, { stereo: "container", cn: "web（Next.js）", en: "standalone 运行时", mono: ":3000" });
  g += node(300, 220, 220, 78, { stereo: "container", cn: "yjs-ws", en: "协作文档服务", mono: "WebSocket" });
  g += node(544, 220, 220, 78, { stereo: "container", cn: "onlyoffice", en: "在线文档转换", mono: ":8080" });
  g += poly([[380, 186], [380, 206], [166, 206], [166, 216]], { sw: 1, mk: true });
  g += ln(410, 186, 410, 216, { sw: 1, mk: true });
  g += poly([[440, 186], [440, 206], [654, 206], [654, 216]], { sw: 1, mk: true });
  // 数据层
  g += node(56, 330, 220, 74, { stereo: "container", cn: "PostgreSQL 18", en: "55 表 · 主库", mono: ":5432" });
  g += node(300, 330, 220, 74, { stereo: "container", cn: "Valkey / Redis", en: "缓存 · HITL 传输", mono: ":6379" });
  g += node(544, 330, 220, 74, { stereo: "volume", cn: "uploads 数据卷", en: "对话附件与产物", mono: "bind mount" });
  g += ln(166, 298, 166, 326, { sw: 1, mk: true });
  g += ln(410, 298, 410, 326, { sw: 1, mk: true });
  g += ln(654, 298, 654, 326, { sw: 1, mk: true });
  g += T(174, 318, "SQL", { size: 9.5, fill: S.g2, anchor: "start", italic: true });
  g += T(418, 318, "RESP", { size: 9.5, fill: S.g2, anchor: "start", italic: true });
  g += T(662, 318, "挂载", { size: 9.5, fill: S.g2, anchor: "start", italic: true });
  g += legend(32, 470, [
    { kind: "box", text: "应用容器" },
    { kind: "accent", text: "唯一公网入口" },
    { kind: "solid", text: "网络调用" },
  ]);
  return svg(W, H, g);
}

/* ═════════════ 图 5  AI 子系统组件架构 ═════════════ */
function figAgentArch() {
  const W = 820, H = 760;
  let g = "";
  // 外部
  g += node(300, 8, 230, 46, { stereo: "external", cn: "调用端", en: "React 渲染进程 · SSE 客户端" });
  g += node(570, 8, 190, 46, { stereo: "external", cn: "大模型供应商 API", en: "HTTPS · 三协议" });
  // 边界
  const bX = 32, bY = 74, bW = 748, bH = 562;
  g += rect(bX, bY, bW, bH, { stroke: S.g1, sw: 1.1, dash: "6 4" });
  g += T(bX + 4, bY - 8, "AI 子系统边界（lib/ai/** · app/api/chat/route.ts，运行于同一进程内）", {
    size: 10, anchor: "start", fill: S.g2, italic: true,
  });

  // 主流水线
  g += node(300, 96, 230, 60, { stereo: "stage", cn: "请求准入", en: "鉴权 · 参数 · 配额预扣" });
  g += node(300, 180, 230, 60, { stereo: "stage", cn: "上下文装配", en: "buildContext() → 系统提示" });
  g += node(300, 264, 230, 60, { stereo: "stage", cn: "模型推理", en: "流式 · 三协议 · ≤ 5 轮", accent: true });
  g += node(300, 384, 230, 60, { stereo: "stage", cn: "工具执行", en: "并行调度 · 设备 / 库表 / 文件", accent: true });
  g += node(300, 468, 230, 60, { stereo: "stage", cn: "结果回灌", en: "compactToolResult() 四档" });
  g += node(300, 552, 230, 60, { stereo: "stage", cn: "结算与落库", en: "额度流水 · 会话持久化" });

  // 左列：上下文侧能力
  g += node(56, 180, 200, 60, { stereo: "policy", cn: "预算与压缩", en: "四档分配 · 阈值 0.60" });
  g += node(56, 264, 200, 60, { stereo: "policy", cn: "技能与角色", en: "技能注入 · 多角色人格" });
  g += node(56, 552, 200, 60, { stereo: "memory", cn: "记忆体系", en: "三层记忆 · 异步抽取" });

  // 右列：执行侧能力
  g += node(570, 264, 190, 60, { stereo: "adapter", cn: "供应商适配", en: "白名单 · 降级不兼容" });
  g += node(570, 468, 190, 60, { stereo: "hitl", cn: "挂起管理", en: "用户输入 · 前端工具" });

  // 登记表（唯一源常量）
  const rx = 570, ry = 352, rw = 190, rh = 100;
  g += rect(rx, ry, rw, rh, { fill: S.tint, stroke: S.line });
  g += T(rx + rw / 2, ry + 18, "工具决策依据", { size: 11, weight: 600 });
  const rows = [
    ["TOOL_REGISTRY", "59 工具 / 14 组"],
    ["RISK_REGISTRY", "不可重试 / 禁用 / 确认"],
    ["CAPABILITIES", "资源槽 → 并行 ∨ 串行"],
  ];
  rows.forEach(([k, v], idx) => {
    const yy = ry + 38 + idx * 22;
    g += T(rx + 10, yy, k, { size: 8.5, anchor: "start", family: MONO, fill: S.g1 });
    g += T(rx + 10, yy + 11, v, { size: 8.5, anchor: "start", fill: S.g2 });
  });

  // 主干
  g += ln(415, 54, 415, 92, { sw: 1.1, mk: true });
  g += ln(415, 156, 415, 176, { sw: 1.1, mk: true });
  g += ln(415, 240, 415, 260, { sw: 1.1, mk: true });
  g += ln(415, 324, 415, 380, { sw: 1.1, mk: true });
  g += T(423, 356, "有 tool_calls", { size: 9.5, fill: S.g2, anchor: "start", italic: true });
  g += ln(415, 444, 415, 464, { sw: 1.1, mk: true });
  g += ln(415, 528, 415, 548, { sw: 1.1, mk: true });

  // 左列连接
  g += ln(260, 210, 296, 210, { sw: 1, mk: true, head: "ahg" });
  g += ln(260, 294, 296, 294, { sw: 1, mk: true, head: "ahg" });
  g += ln(260, 582, 296, 582, { sw: 1, mk: true, head: "ahg" });

  // 右列连接
  g += ln(534, 294, 566, 294, { sw: 1, mk: true });
  g += ln(534, 400, 566, 400, { sw: 1, mk: true });
  g += poly([[570, 486], [552, 486], [552, 414], [534, 414]], { sw: 1, mk: true });
  g += poly([[665, 264], [665, 58]], { sw: 1, mk: true, dash: DTAG, head: "ahg" });

  // 回环：回灌后进入下一轮
  g += poly([[296, 498], [278, 498], [278, 318], [296, 318]], { sw: 1, dash: DTAG, mk: true, head: "ahg" });
  g += T(272, 408, "回灌后进入下一轮（i ≤ 5）", { size: 9.5, fill: S.g2, rotate: -90, italic: true });

  // 边界外：状态存储
  g += node(400, 664, 360, 56, { stereo: "datastore", cn: "状态存储", en: "PostgreSQL（会话与额度）· Redis（HITL 传输）" });
  g += ln(415, 612, 415, 660, { sw: 1, mk: true, dash: "6 4", head: "ahg" });

  // 图例
  g += legend(32, 742, [
    { kind: "solid", text: "同步调用" },
    { kind: "dash", text: "回环与事件" },
    { kind: "tint", text: "登记表（唯一源常量）" },
    { kind: "accent", text: "决策与执行中枢" },
  ]);
  return svg(W, H, g);
}

/* ═════════════ 图 6  AI 对话主循环 ═════════════ */
function fig5() {
  const W = 820, H = 690;
  let g = "";
  const cy = 410;
  g += terminator(300, 30, 220, 44, "接收用户消息");
  g += node(280, 100, 260, 58, { cn: "鉴权与配额预扣", en: "Auth · Quota Reserve" });
  g += node(280, 182, 260, 58, { cn: "上下文装配", en: "buildContext()" });
  g += node(280, 264, 260, 58, { cn: "模型流式调用", en: "Stream Inference" });
  g += diamond(410, cy, 250, 84, "存在 tool_calls ？", "判定本轮是否需要工具");
  g += node(560, 372, 240, 78, { cn: "工具执行", en: "并行调度 · 59 个 MCP 工具", mono: "TOOL_CAPABILITIES", accent: true });
  g += node(560, 470, 240, 52, { cn: "确认请求挂起", en: "HITL · 最长 5 min" });
  g += node(560, 542, 240, 52, { cn: "结果压缩回灌", en: "compactToolResult()" });
  g += node(280, 486, 260, 58, { cn: "流式输出与落库", en: "SSE → sessions" });
  g += terminator(340, 578, 140, 42, "结束");
  // 主干
  g += ln(410, 74, 410, 96, { sw: 1.1, mk: true });
  g += ln(410, 158, 410, 178, { sw: 1.1, mk: true });
  g += ln(410, 240, 410, 260, { sw: 1.1, mk: true });
  g += ln(410, 322, 410, 364, { sw: 1.1, mk: true });
  // 分支：是
  g += ln(535, cy, 556, cy, { sw: 1.1, mk: true });
  g += T(545, cy - 9, "是", { size: 11, weight: 600 });
  g += ln(680, 452, 680, 466, { sw: 1, mk: true, dash: DTAG, head: "ahg" });
  g += ln(680, 522, 680, 538, { sw: 1, mk: true });
  // 分支：否
  g += ln(410, 452, 410, 482, { sw: 1.1, mk: true });
  g += T(420, 474, "否", { size: 11, weight: 600 });
  g += ln(410, 544, 410, 574, { sw: 1.1, mk: true });
  // 回环
  g += poly([[680, 594], [680, 660], [170, 660], [170, 211], [276, 211]], { sw: 1, dash: DTAG, mk: true, head: "ahg" });
  g += onLine(430, 660, "i ← i + 1（i ≤ 5，否则强制收敛）", { size: 10.5 });
  // 左侧阶段标注
  const marks = [
    [129, "① 准入"],
    [211, "② 装配"],
    [293, "③ 决策"],
    [411, "④ 执行"],
    [515, "⑤ 输出"],
  ];
  marks.forEach(([yy, t]) => (g += T(56, yy, t, { size: 10, fill: S.g3, anchor: "start", italic: true })));
  return svg(W, H, g);
}

/* ═════════════ 图 6  工具并行调度 ═════════════ */
function fig6() {
  const W = 820, H = 534;
  let g = "";
  // —— (a) 资源槽占用矩阵 ——
  g += T(32, 40, "（a）资源槽占用判定", { size: 12, weight: 600, anchor: "start" });
  const cols = ["数据库写", "设备控制", "摄像头", "MQTT 发布", "文件系统"];
  const cx = [300, 382, 464, 546, 628];
  const rows = [
    ["query_devices", [1]],
    ["control_device", [1, 3]],
    ["capture_camera_frame", [0, 2]],
    ["write_changelog", [0, 4]],
  ];
  const ry = [112, 152, 192, 232];
  cols.forEach((c, i) => g += T(cx[i], 84, c, { size: 10.5, fill: S.g1 }));
  g += ln(272, 92, 660, 92, { sw: 1, stroke: S.line });
  rows.forEach(([name, slots], r) => {
    g += T(264, ry[r] + 4, name, { size: 10.5, anchor: "end", family: MONO, fill: S.g1 });
    g += ln(272, ry[r] + 18, 660, ry[r] + 18, { sw: 0.6, stroke: S.hair });
    slots.forEach((s) =>
      g += `<circle cx="${cx[s]}" cy="${ry[r]}" r="4" fill="${S.ink}"/>`
    );
  });
  g += T(272, 272, "● 表示该工具独占的资源槽；任两工具槽集无交集即可同轮并行。", {
    size: 10, fill: S.g2, anchor: "start", italic: true,
  });
  // 判定箭头
  g += poly([[668, 176], [700, 176], [700, 120], [742, 120]], { sw: 1, mk: true, head: "ahg" });
  g += T(752, 116, "无交集", { size: 10, anchor: "start", fill: S.g1 });
  g += T(752, 130, "→ 并行", { size: 10, anchor: "start", fill: S.accent, weight: 600 });
  g += poly([[668, 200], [706, 200], [706, 244], [742, 244]], { sw: 1, mk: true, head: "ahg" });
  g += T(752, 240, "有交集", { size: 10, anchor: "start", fill: S.g1 });
  g += T(752, 254, "→ 串行", { size: 10, anchor: "start", fill: S.accent, weight: 600 });

  // —— (b) 时间线 ——
  g += T(32, 316, "（b）两种调度策略的执行时间线（同一轮 4 个工具调用）", { size: 12, weight: 600, anchor: "start" });
  const X0 = 200, SC = 48; // 1 s = 48 px
  const tx = (t) => X0 + t * SC;
  const bars = [
    { y: 348, h: 26, label: "串行执行", segs: [[0, 2.4, "查询"], [2.4, 5.4, "控制"], [5.4, 9.0, "抓帧"], [9.0, 10.0, "写库"]], end: 10.0 },
    { y: 404, h: 22, label: "并行 · 槽 A", segs: [[0, 2.4, "查询"], [2.4, 5.4, "控制"]], end: 5.4 },
    { y: 442, h: 22, label: "并行 · 槽 B", segs: [[0, 3.6, "抓帧"], [3.6, 4.6, "写库"]], end: 4.6 },
  ];
  bars.forEach((b) => {
    g += T(X0 - 12, b.y + b.h / 2 + 4, b.label, { size: 10.5, anchor: "end", fill: S.g1 });
    b.segs.forEach(([t0, t1, name], i) => {
      const x1 = tx(t0), x2 = tx(t1);
      g += rect(x1, b.y, x2 - x1, b.h, { fill: i % 2 ? S.tint2 : S.tint, stroke: S.line, sw: 0.9 });
      g += T((x1 + x2) / 2, b.y + b.h / 2 + 3.8, name, { size: 9.5, fill: S.g1 });
    });
    // 完成时刻虚线
    g += ln(tx(b.end), b.y - 6, tx(b.end), b.y + b.h + 6, { sw: 0.9, dash: "4 3", stroke: S.accent });
    g += T(tx(b.end) + 4, b.y - 10, `${b.end.toFixed(1)} s`, { size: 9.5, anchor: "start", fill: S.accent });
  });
  // 坐标轴
  const AY = 490;
  g += ln(X0, AY, tx(12), AY, { sw: 1.1 });
  for (let t = 0; t <= 12; t += 2) {
    g += ln(tx(t), AY, tx(t), AY + 5, { sw: 1 });
    g += T(tx(t), AY + 18, String(t), { size: 9.5, fill: S.g2 });
  }
  g += T(tx(12) + 14, AY + 18, "t / s", { size: 10, anchor: "start", fill: S.g1, italic: true });
  // 结论
  g += T(32, 526, "同轮并行将本轮工具耗时由 10.0 s 压缩至 5.4 s（加速比 1.85×），收益来自「抓帧 / 写库」与「设备控制」互不占槽。", {
    size: 10, fill: S.g2, anchor: "start", italic: true,
  });
  return svg(W, 548, g);
}

/* ═════════════ 图 7  上下文预算与压缩 ═════════════ */
function fig7() {
  const W = 820, H = 500;
  let g = "";
  // —— (a) 输入预算四档分配 ——
  g += T(32, 40, "（a）输入预算的四档分配（以 128k 上下文窗口为例）", { size: 12, weight: 600, anchor: "start" });
  const X0 = 120, BW = 640, BY = 96, BH = 50;
  const zones = [
    [0, 0.30, "身份与约束", "0.30", "38.4k"],
    [0.30, 0.55, "固定上下文", "0.25", "32.0k"],
    [0.55, 0.75, "工作区", "0.20", "25.6k"],
    [0.75, 1.0, "历史对话", "0.25", "32.0k"],
  ];
  zones.forEach(([a, b, cn, p, tk], i) => {
    const x = X0 + a * BW, w = (b - a) * BW;
    g += rect(x, BY, w, BH, { fill: i % 2 ? S.tint : S.fill, stroke: S.line, sw: 1 });
    g += T(x + w / 2, BY + 21, cn, { size: 11, weight: 600 });
    g += T(x + w / 2, BY + 37, `${p}　${tk}`, { size: 9.5, fill: S.g2, italic: true });
  });
  // 刻度
  [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
    const x = X0 + p * BW;
    g += ln(x, BY + BH, x, BY + BH + 5, { sw: 1 });
    g += T(x, BY + BH + 19, `${Math.round(p * 100)}%`, { size: 9.5, fill: S.g2 });
  });
  g += T(X0 - 10, BY + BH / 2 + 4, "输入窗口", { size: 10.5, anchor: "end", fill: S.g1 });
  // 压缩触发线与目标线
  const trig = X0 + 0.6 * BW;
  g += ln(trig, BY - 16, trig, BY + BH + 5, { sw: 1.1, dash: "4 3", stroke: S.accent });
  g += T(trig, BY - 26, "压缩触发 0.60", { size: 10, anchor: "middle", fill: S.accent, weight: 600 });
  const tgt = X0 + 0.35 * BW;
  g += ln(tgt, BY - 16, tgt, BY + BH + 5, { sw: 1, dash: "4 3", stroke: S.accent });
  g += T(tgt, BY - 26, "压缩目标 0.35", { size: 10, anchor: "middle", fill: S.accent });

  // —— (b) 压缩状态机 ——
  g += T(32, 262, "（b）预算驱动的历史压缩流程", { size: 12, weight: 600, anchor: "start" });
  g += node(32, 288, 168, 62, { cn: "装配上下文", en: "estimateContextTokens" });
  g += node(228, 288, 168, 62, { cn: "预算检测", en: "> 窗口 × 0.60 ？" });
  g += node(424, 288, 168, 62, { cn: "摘要压缩", en: "保留近 6 条原文", accent: true });
  g += node(620, 288, 168, 62, { cn: "输出与落库", en: "SSE / sessions" });
  g += ln(200, 319, 224, 319, { sw: 1.1, mk: true });
  g += ln(396, 319, 420, 319, { sw: 1.1, mk: true });
  g += T(408, 310, "是", { size: 9.5, fill: S.g1, italic: true });
  g += ln(592, 319, 616, 319, { sw: 1.1, mk: true });
  g += T(604, 310, "完成", { size: 9.5, fill: S.g1, italic: true });
  // 否分支走上侧
  g += poly([[312, 288], [312, 254], [704, 254], [704, 284]], { sw: 1, mk: true, head: "ahg" });
  g += onLine(508, 254, "否：未超阈值，直接输出", { size: 10 });
  // 失败分支
  g += ln(508, 350, 508, 402, { sw: 1, dash: DTAG, mk: true, head: "ahg" });
  g += rect(300, 402, 416, 46, { fill: S.fill, stroke: S.g1, sw: 1, dash: "4 3" });
  g += T(508, 421, "降级路径：摘要模型失败时插入原始截断摘要，并下发 SSE 事件", { size: 10, fill: S.g1 });
  g += T(508, 436, "context_compress_failed（前端提示「上下文已压缩」，不中断本轮）", { size: 9.5, fill: S.g2, italic: true });
  return svg(W, H, g);
}

/* ───────────── 输出 ───────────── */
const figs = {
  "fig1-loop": [fig1(), 820, 262],
  "fig2-layers": [fig2(), 820, 618],
  "fig3-local": [fig3(), 820, 572],
  "fig4-cloud": [fig4(), 820, 500],
  "fig5-agent-arch": [figAgentArch(), 820, 760],
  "fig6-agent-loop": [fig5(), 820, 690],
  "fig7-tool-dispatch": [fig6(), 820, 548],
  "fig8-context": [fig7(), 820, 500],
};
for (const [name, [body]] of Object.entries(figs)) {
  writeFileSync(`${OUT}/${name}.svg`, body, "utf8");
  console.log(`wrote ${OUT}/${name}.svg  (${(body.length / 1024).toFixed(1)} KB)`);
}
