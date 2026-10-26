/**
 * 莓小智吉祥物（Berry Mascot）几何与表情数据
 *
 * 造型源自平台 logo：玫红渐变莓体 + 顶部三片绿叶 + 乳白面罩 + 吊眼角 + 小尖嘴。
 * 表情系统接入 lib/ai/orb-expression.ts 的 12 种姿态 + 5 个状态别名，
 * 但把「眼部路径逐点插值」换成「面部参数化姿态」：
 * 眼睑开合 / 外眼角高度 / 注视偏移 / 嘴形 / 腮红 / 身体弹性 / 叶子摆动，
 * 全部数值字段，逐帧 rAF 插值 —— 天然支持过冲、不对称表情与程序化说话嘴动。
 *
 * 坐标系统：viewBox 0 0 228.541 228.541（与原 Grok orb 一致，便于复用外壳与彩带）。
 *
 * 造型要点（照着 logo 校准，勿凭感觉改）：
 * - 果体是「上宽下略收」的浆果形，不是正圆；左上有一团明显柔光
 * - 面罩占果体宽度 ~63%，上缘平、两侧有肩、下巴圆
 * - 眼睛是**细长刀片状吊眼**（高宽比 ≈ 0.35）：上缘斜直、下缘圆凸、内尖外钝
 * - 嘴角默认**下垂**（logo 的傲娇感），微笑时上翘
 */

import type { GrokOrbExpression } from "@/lib/ai/orb-expression";

export const MASCOT_VIEW = 228.541;
export const MASCOT_CX = 114.2705;

/* -------------------------------------------------------------------------- */
/* 几何：果体 / 叶子 / 面罩                                                     */
/* -------------------------------------------------------------------------- */

/** 果体轮廓：上宽下略收的浆果（心形）轮廓，宽 199.5 / 高 180 */
export const MASCOT_BODY_PATH = `
  M114.2705 46
  C134 46 158 54 176 56
  C194 72 210 96 214 126
  C218 164 208 186 192 196
  C176 216 150 226 114.2705 226
  C78.5 226 52.5 216 36.5 196
  C20.5 186 10.5 164 14.5 126
  C18.5 96 34.5 72 52.5 56
  C70.5 54 94.5 46 114.2705 46
  Z
`;

/** 单片叶子（局部坐标：叶柄在原点，叶尖朝 -y） */
export const MASCOT_LEAF_PATH = `
  M0 0
  C-18 -13 -21 -40 0 -56
  C21 -40 18 -13 0 0
  Z
`;

/** 叶脉（局部坐标） */
export const MASCOT_LEAF_VEIN_PATH = `M0 -6 Q-1.6 -29 0 -50`;

export interface LeafPlacement {
  x: number;
  y: number;
  /** 静态倾角（度，顺时针为正） */
  rotate: number;
  scale: number;
  /** 摆动周期（秒）与相位 */
  period: number;
  phase: number;
  /** 摆动幅度（度） */
  amp: number;
  /** 叶片渐变深浅（0=深 1=浅） */
  tone: number;
}

/** 三片叶子的摆放：左、中、右（顺序即渲染顺序，中间叶压在最上层） */
export const MASCOT_LEAVES: readonly LeafPlacement[] = [
  { x: 103.5, y: 70, rotate: -46, scale: 0.86, period: 5.4, phase: 0.6, amp: 4.2, tone: 0.22 },
  { x: 125.0, y: 70, rotate: 43, scale: 0.84, period: 4.6, phase: 2.1, amp: 4.4, tone: 0.5 },
  { x: 114.2705, y: 62, rotate: 1, scale: 0.92, period: 6.8, phase: 0, amp: 2.6, tone: 0.85 },
] as const;

/**
 * 面罩（乳白脸部区域）：宽 125.5 / 高 98
 * 上缘平、两侧有肩、下巴圆 —— 比纯椭圆更像「头盔开口」。
 */
export const MASCOT_FACE_PATH = `
  M114.2705 101
  C134 101 152 105 165 117
  C174 132 177 142 177 152
  C177 166 173 176 166 182
  C152 193 134 199 114.2705 199
  C94.5 199 76.5 193 62.5 182
  C54.5 176 51.5 166 51.5 152
  C51.5 142 54.5 132 63.5 117
  C76.5 105 94.5 101 114.2705 101
  Z
`;

/** 果体左上柔光（logo 里最显眼的一团高光） */
export const MASCOT_HIGHLIGHT = { cx: 74, cy: 90, rx: 38, ry: 26, rotate: -32 } as const;

/* -------------------------------------------------------------------------- */
/* 几何：眼睛 / 嘴巴 / 腮红                                                     */
/* -------------------------------------------------------------------------- */

export const EYE_GEOMETRY = {
  leftCx: 88,
  rightCx: 141,
  cy: 150,
  /** 长 42 / 高 24 → 视觉高宽比 ≈ 0.35 的细长吊眼 */
  w: 42,
  h: 24,
} as const;

export const MOUTH_GEOMETRY = { cx: MASCOT_CX, cy: 182, w: 24, h: 15 } as const;

export const BLUSH_GEOMETRY = {
  leftCx: 70,
  rightCx: 158.5,
  cy: 171,
  rx: 14,
  ry: 9,
} as const;

export type MouthShape = "arc" | "oval" | "wave" | "flat";

/** wave / flat 用描边绘制，其余用填充 */
export function isStrokedMouth(shape: MouthShape): boolean {
  return shape === "wave" || shape === "flat";
}

export interface EyeShape {
  /** 上睑下垂 0（全开）.. 0.55（闭合） */
  lidTop: number;
  /** 下睑上抬 0..0.55（笑眼时下睑上抬形成弯月） */
  lidBottom: number;
  /**
   * 眼角高度偏移（单位 = 眼高）：
   * + 更吊（外眼角上抬、内眼角下压）；- 下垂眼（外眼角下压、内眼角上抬）。
   */
  tilt: number;
}

/**
 * 生成眼睛路径（局部坐标，原点 = 眼中心，+x 朝外眼角方向）。
 *
 * 形状：**刀片状吊眼** —— 上缘从内眼角(低、尖)斜直上行到外眼角(高、圆钝)，
 * 下缘向外下方饱满凸出。左眼由渲染层 scale(-1, 1) 镜像复用同一条路径。
 */
export function buildEyePath(s: EyeShape): string {
  const hw = EYE_GEOMETRY.w / 2;
  const h = EYE_GEOMETRY.h;
  const tilt = s.tilt * h;

  // 外眼角：圆钝的「刀柄」（上端高、下端收）
  const otX = hw * 0.9, otY = -h * 0.3 - tilt * 0.58;
  const ocX = hw * 1.1, ocY = -h * 0.02 - tilt * 0.44;
  const obX = hw * 0.84, obY = h * 0.22 - tilt * 0.3;
  // 内眼角：尖锐的「刀尖」
  const niX = -hw, niY = h * 0.3 + tilt * 0.44;
  // 上睑：靠近直线（略上凸）；lidTop 0.5 时压到中线形成闭眼细缝
  const ucX = -hw * 0.12, ucY = -h * 0.36 + s.lidTop * h * 0.92;
  // 下睑：明显下凸；lidBottom 上抬形成笑眼弯月
  const lcX = hw * 0.04, lcY = h * 0.66 - s.lidBottom * h * 1.12;

  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(niX)} ${f(niY)}` +
    `Q${f(ucX)} ${f(ucY)} ${f(otX)} ${f(otY)}` +
    `Q${f(ocX)} ${f(ocY)} ${f(obX)} ${f(obY)}` +
    `Q${f(lcX)} ${f(lcY)} ${f(niX)} ${f(niY)}` +
    "Z"
  );
}

/**
 * 生成嘴巴路径（局部坐标，原点 = 嘴中心）。
 * curve：**正 = 嘴角上翘（微笑）**，负 = 嘴角下垂（撇嘴 / 难过）；open：张口量 0..1。
 */
export function buildMouthPath(shape: MouthShape, curve: number, open: number): string {
  const hw = MOUTH_GEOMETRY.w / 2;
  const h = MOUTH_GEOMETRY.h;
  const f = (n: number) => n.toFixed(2);
  const y0 = -h * 0.1;

  if (shape === "oval") {
    const rx = hw * (0.24 + 0.32 * open);
    const ry = h * (0.36 + 0.5 * open);
    return (
      `M${f(-rx)} 0` +
      `A${f(rx)} ${f(ry)} 0 1 0 ${f(rx)} 0` +
      `A${f(rx)} ${f(ry)} 0 1 0 ${f(-rx)} 0Z`
    );
  }

  if (shape === "wave") {
    // 龇牙：上齿锯齿线（描边）
    const t = h * (0.28 + 0.22 * open);
    return (
      `M${f(-hw)} ${f(y0)}` +
      `L${f(-hw * 0.5)} ${f(y0 - t)}` +
      `L0 ${f(y0)}` +
      `L${f(hw * 0.5)} ${f(y0 - t)}` +
      `L${f(hw)} ${f(y0)}`
    );
  }

  if (shape === "flat") {
    return `M${f(-hw * 0.62)} ${f(y0)}L${f(hw * 0.62)} ${f(y0)}`;
  }

  // arc：上下两条二次曲线围成的月牙（两端收尖，像 logo 的小尖嘴）
  const dipUpper = curve * h * 0.92;
  const dipLower = dipUpper + h * (0.16 + 0.8 * open);
  return (
    `M${f(-hw)} ${f(y0)}` +
    `Q0 ${f(dipUpper)} ${f(hw)} ${f(y0)}` +
    `Q0 ${f(dipLower)} ${f(-hw)} ${f(y0)}` +
    "Z"
  );
}

/* -------------------------------------------------------------------------- */
/* 表情姿态                                                                     */
/* -------------------------------------------------------------------------- */

export interface FacePose {
  /* ── 眼睛 ── */
  lidTop: number;
  lidBottom: number;
  tilt: number;
  scaleX: number;
  scaleY: number;
  /** 注视偏移（viewBox 单位），在自然漂移之上叠加 */
  gazeX: number;
  gazeY: number;
  /* ── 嘴巴 ── */
  mouthShape: MouthShape;
  /** 正 = 微笑上翘 / 负 = 撇嘴下垂 */
  mouthCurve: number;
  mouthOpen: number;
  /* ── 面部与身体 ── */
  /** 腮红强度 0..1 */
  blush: number;
  /** 身体纵向偏移（负 = 上浮） */
  bob: number;
  /** 身体缩放：>1 压扁变胖、<1 拉长 */
  squash: number;
  /** 抖动强度 0..1（生气等情绪微颤） */
  jitter: number;
  /** 叶子摆动倍率（困倦时更小） */
  leaf: number;
  /** 眨眼间隔倍率（困倦时更长） */
  blinkRate: number;
}

/** 一帧关键姿态：hold 秒内保持，向后一帧平滑变形 */
export interface MascotKeyframe {
  hold: number;
  pose: FacePose;
  /** 左右眼局部覆盖（不对称表情：怀疑 / 俏皮眨眼 / 困惑） */
  left?: Partial<FacePose>;
  right?: Partial<FacePose>;
}

/** 基准姿态：自然放松，嘴角保留 logo 的微下垂（傲娇感） */
export const MASCOT_BASE_POSE: FacePose = {
  lidTop: 0.06,
  lidBottom: 0.04,
  tilt: 0,
  scaleX: 1,
  scaleY: 1,
  gazeX: 0,
  gazeY: 0,
  mouthShape: "arc",
  mouthCurve: -0.44,
  mouthOpen: 0.1,
  blush: 0.16,
  bob: 0,
  squash: 1,
  jitter: 0,
  leaf: 1,
  blinkRate: 1,
};

export const p = (o: Partial<FacePose>): FacePose => ({ ...MASCOT_BASE_POSE, ...o });

/**
 * 表情 → 关键帧序列。
 * 序列会循环播放（渲染层自动把首帧接回末尾，保证循环无缝）。
 */
export const MASCOT_EXPRESSIONS: Record<GrokOrbExpression, MascotKeyframe[]> = {
  natural: [
    { hold: 3.2, pose: p({}) },
    { hold: 2.6, pose: p({ gazeX: 0.9, gazeY: -0.5, bob: -1.1, mouthOpen: 0.13 }) },
    { hold: 3.4, pose: p({ gazeX: -0.8, gazeY: 0.4, bob: 0.9, tilt: -0.06 }) },
  ],
  happy: [
    { hold: 1.5, pose: p({ lidBottom: 0.42, lidTop: 0.02, scaleY: 0.94, mouthCurve: 0.7, mouthOpen: 0.5, blush: 0.62, bob: -3.2, squash: 1.035, gazeY: -1.2 }) },
    { hold: 0.9, pose: p({ lidBottom: 0.32, scaleY: 1.04, mouthCurve: 0.56, mouthOpen: 0.34, blush: 0.5, bob: -5.4, squash: 0.975, tilt: 0.1 }) },
    { hold: 1.4, pose: p({ lidBottom: 0.44, scaleY: 0.93, mouthCurve: 0.74, mouthOpen: 0.56, blush: 0.66, bob: -2.4, squash: 1.045 }) },
  ],
  surprised: [
    { hold: 1.1, pose: p({ scaleX: 1.06, scaleY: 1.34, lidTop: 0, lidBottom: 0, mouthShape: "oval", mouthCurve: 0, mouthOpen: 0.7, blush: 0.32, bob: -4.2, squash: 0.96, leaf: 1.5 }) },
    { hold: 0.55, pose: p({ scaleX: 1.02, scaleY: 1.12, mouthShape: "oval", mouthCurve: 0, mouthOpen: 0.44, blush: 0.26, bob: -1.2, squash: 1.02, leaf: 1.9 }) },
  ],
  focused: [
    { hold: 2.1, pose: p({ lidTop: 0.26, scaleY: 0.86, tilt: 0.12, gazeY: 0.7, mouthCurve: -0.28, mouthOpen: 0.05, blush: 0.06, bob: -0.6, leaf: 0.7 }) },
    { hold: 1.3, pose: p({ lidTop: 0.18, scaleY: 0.92, tilt: 0.06, gazeX: 0.9, gazeY: 0.5, mouthCurve: -0.16, mouthOpen: 0.05, blush: 0.06, leaf: 0.6 }) },
  ],
  curious: [
    { hold: 1.4, pose: p({ scaleY: 1.1, tilt: 0.16, gazeX: 2.2, gazeY: -1.1, mouthCurve: -0.2, mouthOpen: 0.14, blush: 0.2, bob: -1.6, squash: 1.02, leaf: 1.35 }) },
    { hold: 1.1, pose: p({ scaleY: 1.02, tilt: 0.1, gazeX: -1.8, gazeY: -0.6, mouthCurve: -0.08, mouthOpen: 0.1, blush: 0.17, bob: -0.4, leaf: 1.5 }) },
    { hold: 1.6, pose: p({ scaleY: 1.14, tilt: 0.22, gazeX: 1.2, gazeY: -1.6, mouthShape: "oval", mouthOpen: 0.24, blush: 0.22, bob: -2.2, squash: 0.99, leaf: 1.6 }) },
  ],
  sleepy: [
    { hold: 2.4, pose: p({ lidTop: 0.46, lidBottom: 0.1, scaleY: 0.84, tilt: -0.2, gazeY: 1.4, mouthShape: "flat", mouthOpen: 0, mouthCurve: -0.3, blush: 0.22, bob: 2.6, squash: 0.975, leaf: 0.34, blinkRate: 2.2 }) },
    { hold: 1.6, pose: p({ lidTop: 0.54, lidBottom: 0.16, scaleY: 0.82, tilt: -0.26, gazeY: 1.9, mouthShape: "flat", mouthOpen: 0, mouthCurve: -0.24, blush: 0.24, bob: 4.2, squash: 0.955, leaf: 0.28, blinkRate: 2.6 }) },
    { hold: 1.2, pose: p({ lidTop: 0.34, lidBottom: 0.08, scaleY: 0.92, tilt: -0.14, gazeY: 0.9, mouthShape: "oval", mouthOpen: 0.22, mouthCurve: -0.36, blush: 0.2, bob: 1.2, squash: 0.99, leaf: 0.5, blinkRate: 1.8 }) },
  ],
  skeptical: [
    {
      hold: 1.8,
      pose: p({ lidTop: 0.22, scaleY: 0.9, tilt: -0.12, gazeX: -1.4, mouthCurve: -0.62, mouthOpen: 0.14, blush: 0.14, bob: -0.8 }),
      left: { lidTop: 0.02, scaleY: 1.04, tilt: 0.2 },
    },
    {
      hold: 1.4,
      pose: p({ lidTop: 0.18, scaleY: 0.92, tilt: -0.08, gazeX: 1.6, mouthCurve: -0.4, mouthOpen: 0.12, blush: 0.14, bob: 0.4 }),
      right: { lidTop: 0.02, scaleY: 1.02, tilt: 0.22 },
    },
  ],
  angry: [
    { hold: 0.7, pose: p({ lidTop: 0.34, scaleY: 0.76, tilt: -0.44, mouthShape: "wave", mouthOpen: 0.5, mouthCurve: -0.7, blush: 0.38, bob: -1.4, squash: 1.02, jitter: 1, leaf: 2.4 }) },
    { hold: 0.6, pose: p({ lidTop: 0.4, scaleY: 0.7, tilt: -0.52, mouthShape: "wave", mouthOpen: 0.62, mouthCurve: -0.8, blush: 0.44, bob: 0.9, squash: 0.98, jitter: 1.25, leaf: 2.9 }) },
  ],
  confused: [
    {
      hold: 1.5,
      pose: p({ lidTop: 0.14, scaleY: 0.96, tilt: -0.06, gazeX: -2.2, gazeY: 0.6, mouthShape: "arc", mouthCurve: -0.5, mouthOpen: 0.18, blush: 0.18, bob: -0.6, jitter: 0.18 }),
      left: { scaleY: 1.16, tilt: 0.28, lidTop: 0.02 },
      right: { scaleY: 0.8, lidTop: 0.3, tilt: -0.26 },
    },
    {
      hold: 1.5,
      pose: p({ lidTop: 0.14, scaleY: 0.96, tilt: -0.06, gazeX: 2.2, gazeY: 0.6, mouthShape: "arc", mouthCurve: 0.2, mouthOpen: 0.22, blush: 0.18, bob: 0.4, jitter: 0.18 }),
      left: { scaleY: 0.8, lidTop: 0.3, tilt: -0.26 },
      right: { scaleY: 1.16, tilt: 0.28, lidTop: 0.02 },
    },
  ],
  sad: [
    { hold: 2.1, pose: p({ lidTop: 0.32, lidBottom: 0.04, scaleY: 0.88, tilt: -0.5, gazeY: 1.1, mouthCurve: -0.92, mouthOpen: 0.22, blush: 0.3, bob: 3.2, squash: 0.972, leaf: 0.42, blinkRate: 1.6 }) },
    { hold: 1.5, pose: p({ lidTop: 0.38, lidBottom: 0.06, scaleY: 0.84, tilt: -0.56, gazeY: 1.8, mouthCurve: -1, mouthOpen: 0.28, blush: 0.34, bob: 4.6, squash: 0.96, leaf: 0.36, blinkRate: 2 }) },
  ],
  playful: [
    {
      hold: 1.3,
      pose: p({ lidBottom: 0.28, scaleY: 0.96, tilt: 0.14, gazeX: 1.4, gazeY: -0.6, mouthCurve: 0.6, mouthOpen: 0.46, blush: 0.46, bob: -2.6, squash: 1.03, leaf: 1.6 }),
      right: { lidTop: 0.5, lidBottom: 0.5, scaleY: 0.16 },
    },
    {
      hold: 1.1,
      pose: p({ lidBottom: 0.34, scaleY: 0.94, tilt: 0.18, gazeX: -1.4, gazeY: -0.8, mouthCurve: 0.7, mouthOpen: 0.54, blush: 0.5, bob: -3.8, squash: 1.04, leaf: 1.8 }),
      left: { lidTop: 0.5, lidBottom: 0.5, scaleY: 0.16 },
    },
  ],
  shy: [
    { hold: 2.2, pose: p({ lidTop: 0.38, lidBottom: 0.12, scaleY: 0.86, tilt: -0.34, gazeX: -1.9, gazeY: 1.2, mouthCurve: -0.18, mouthOpen: 0.18, blush: 0.96, bob: 1.6, squash: 0.978, leaf: 0.6, blinkRate: 1.4 }) },
    { hold: 1.4, pose: p({ lidTop: 0.46, lidBottom: 0.16, scaleY: 0.82, tilt: -0.44, gazeX: -2.4, gazeY: 1.8, mouthCurve: 0.02, mouthOpen: 0.14, blush: 0.88, bob: 2.6, squash: 0.965, leaf: 0.5, blinkRate: 1.5 }) },
  ],
};

/** 表情序列总时长（含首帧回环），供渲染层取模 */
export const MASCOT_EXPRESSION_CYCLES: Record<string, { holds: number[]; total: number }> = (() => {
  const out: Record<string, { holds: number[]; total: number }> = {};
  for (const [id, frames] of Object.entries(MASCOT_EXPRESSIONS)) {
    const holds = frames.map((f) => f.hold);
    out[id] = { holds, total: holds.reduce((a, b) => a + b, 0) };
  }
  return out;
})();

/* -------------------------------------------------------------------------- */
/* 配色                                                                         */
/* -------------------------------------------------------------------------- */

export interface MascotTheme {
  /** 果体主渐变（亮 → 深） */
  body: [string, string];
  /** 果体中调色（radial 渐变的中间停点） */
  bodyMid: string;
  /** 果体边缘光 */
  bodyRim: string;
  /** 果体高光 */
  gloss: string;
  /** 叶子渐变 */
  leaf: [string, string];
  /** 面罩（脸部） */
  face: string;
  /** 面罩边缘 */
  faceRim: string;
  /** 眼睛 / 嘴巴 */
  ink: string;
  /** 腮红 */
  blush: string;
  /** 环绕粒子 */
  particle: string;
  haloActive: string;
  haloInactive: string;
}

export const MASCOT_THEME_LIGHT: MascotTheme = {
  body: ["#FF8FB4", "#C4125A"],
  bodyMid: "#F0367F",
  bodyRim: "rgba(176,8,68,0.22)",
  gloss: "rgba(255,255,255,0.62)",
  leaf: ["#63B93A", "#A6DC63"],
  face: "#FFF9F5",
  faceRim: "rgba(242,150,178,0.5)",
  ink: "#C51C5E",
  blush: "#FF7d9d",
  particle: "rgba(255,255,255,0.92)",
  haloActive: "radial-gradient(circle, rgba(255,70,130,0.30) 0%, rgba(255,150,185,0.14) 42%, transparent 70%)",
  haloInactive: "radial-gradient(circle, rgba(255,70,130,0.16) 0%, rgba(255,180,200,0.08) 42%, transparent 70%)",
};

export const MASCOT_THEME_DARK: MascotTheme = {
  body: ["#FF7EA8", "#A50F46"],
  bodyMid: "#E22A72",
  bodyRim: "rgba(255,120,165,0.3)",
  gloss: "rgba(255,255,255,0.5)",
  leaf: ["#54A62F", "#8BC94E"],
  face: "#F8F1EC",
  faceRim: "rgba(186,108,133,0.46)",
  ink: "#AE1250",
  blush: "#EE6A8E",
  particle: "rgba(255,190,215,0.9)",
  haloActive: "radial-gradient(circle, rgba(255,80,140,0.38) 0%, rgba(190,30,90,0.16) 42%, transparent 70%)",
  haloInactive: "radial-gradient(circle, rgba(255,80,140,0.2) 0%, rgba(190,30,90,0.08) 42%, transparent 70%)",
};

/* -------------------------------------------------------------------------- */
/* 工具                                                                         */
/* -------------------------------------------------------------------------- */

function hexLuminance(color: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * 保证「眼睛/嘴」在面罩上可见：调用方传入的 palette 若把 ink 设成与 face 同亮
 * （例如旧的绿色标 palette 用 #FFFFFF 当眼睛），自动回退到品牌深色，避免「白眼白脸」。
 */
export function ensureInkContrast(ink: string, face: string, fallback: string): string {
  const a = hexLuminance(ink);
  const b = hexLuminance(face);
  if (a === null || b === null) return ink;
  return Math.abs(a - b) >= 0.22 ? ink : fallback;
}

/** 把 6 位 hex 按比例压暗（用于从果体深色派生眼睛/嘴巴的兜底色） */
export function darkenHex(hex: string, amount = 0.3): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const scale = 1 - amount;
  const r = Math.max(0, Math.round(((n >> 16) & 255) * scale));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * scale));
  const b = Math.max(0, Math.round((n & 255) * scale));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
