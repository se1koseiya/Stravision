/**
 * Orb 环绕彩带 + 轨道粒子的纯计算模块
 *
 * 原实现内联在 components/smoothui/berry-orb.tsx（Grok Orb 移植版）。
 * 吉祥物与旧 orb 两套渲染都要用，故抽出为纯函数 + 配置；
 * DOM 读写仍由各自渲染层负责（每帧 setAttribute，避免 React 重渲染）。
 *
 * 视觉语义：表情切换时的一次性环绕彩带（前后景分层，Z 深度切分），
 * 以及常态环绕的两颗粒子。
 */

export const HEAD_CENTER = 114.2705;

const HUMMING_START = 0.8;
const TRAIL_MAX_LIFE = 9;
const RETRACTION_START = TRAIL_MAX_LIFE * 0.55;
const RETRACTION_DURATION = 0.5;
const MAX_SAMPLE_ANGLE = 0.09;

export interface TrailConfig {
  arc: number;
  baseHue: number;
  baseWidth: number;
  follow: number;
  hueSpan: number;
  hueVelocity: number;
  lambdaOffset: number;
  lambdaVelocity: number;
  radius: number;
  radiusVelocity: number;
  roll: number;
  spawnDelay: number;
  tilt: number;
}

/** 三个轨道平面 × 各三条彩带，取自原站同分布区间的稳定采样 */
export const TRAIL_CONFIGS: TrailConfig[] = [
  { arc: 2.72, baseHue: 79, baseWidth: 6.3, follow: 0.84, hueSpan: -74, hueVelocity: 24, lambdaOffset: 0.08, lambdaVelocity: 0.78, radius: 115.2, radiusVelocity: 1.4, roll: -0.31, spawnDelay: 0, tilt: 0.23 },
  { arc: 3.18, baseHue: 122, baseWidth: 6.8, follow: 0.76, hueSpan: 61, hueVelocity: -31, lambdaOffset: 0.14, lambdaVelocity: 1.02, radius: 116.6, radiusVelocity: 0.5, roll: 0.78, spawnDelay: 0.07, tilt: 0.4 },
  { arc: 2.38, baseHue: 160, baseWidth: 5.9, follow: 0.92, hueSpan: 89, hueVelocity: 38, lambdaOffset: 0.04, lambdaVelocity: 0.57, radius: 114.9, radiusVelocity: 2.1, roll: 1.86, spawnDelay: 0.15, tilt: 0.47 },
  { arc: 3.34, baseHue: 204, baseWidth: 7.1, follow: 0.8, hueSpan: -48, hueVelocity: -20, lambdaOffset: 0.16, lambdaVelocity: 0.91, radius: 134.2, radiusVelocity: 1.8, roll: -0.25, spawnDelay: 0.235, tilt: 0.2 },
  { arc: 2.9, baseHue: 244, baseWidth: 6.5, follow: 0.88, hueSpan: 82, hueVelocity: 29, lambdaOffset: 0.1, lambdaVelocity: 0.64, radius: 135.8, radiusVelocity: 0.9, roll: 0.83, spawnDelay: 0.315, tilt: 0.37 },
  { arc: 2.46, baseHue: 286, baseWidth: 5.7, follow: 0.74, hueSpan: -92, hueVelocity: -40, lambdaOffset: 0.06, lambdaVelocity: 1.08, radius: 135.1, radiusVelocity: 2.3, roll: 1.93, spawnDelay: 0.385, tilt: 0.44 },
  { arc: 3.06, baseHue: 322, baseWidth: 6.9, follow: 0.94, hueSpan: 58, hueVelocity: 21, lambdaOffset: 0.13, lambdaVelocity: 0.52, radius: 154.6, radiusVelocity: 0.3, roll: -0.36, spawnDelay: 0.475, tilt: 0.27 },
  { arc: 2.58, baseHue: 7, baseWidth: 6, follow: 0.78, hueSpan: -69, hueVelocity: -27, lambdaOffset: 0.02, lambdaVelocity: 0.87, radius: 153.4, radiusVelocity: 1.6, roll: 0.72, spawnDelay: 0.555, tilt: 0.34 },
  { arc: 3.26, baseHue: 45, baseWidth: 7.3, follow: 0.86, hueSpan: 94, hueVelocity: 35, lambdaOffset: 0.11, lambdaVelocity: 0.69, radius: 155.1, radiusVelocity: 2.4, roll: 1.8, spawnDelay: 0.64, tilt: 0.49 },
];

export const TRAIL_STOP_OFFSETS = [0, 0.25, 0.5, 0.75, 1] as const;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function smoothstep(value: number) {
  const c = clamp(value, 0, 1);
  return c * c * (3 - 2 * c);
}

function integralEaseInOutCubic(value: number) {
  return value <= 0.5 ? Math.pow(value, 4) : value - 0.5 + Math.pow(1 - value, 4);
}

function hummingSpinAngle(time: number) {
  if (time <= 0) return 0;
  if (time < 0.5) return 3.5 * integralEaseInOutCubic(time / 0.5);
  const firstStageAngle = 1.75;
  if (time < 1.3) {
    const progress = (time - 0.5) / 0.8;
    return firstStageAngle + 5.6 * progress - 4.32 * integralEaseInOutCubic(progress);
  }
  const secondStageAngle = firstStageAngle + 3.44;
  return secondStageAngle + 1.6 * (time - 1.3) + 0.6 * (Math.cos(0.65) - Math.cos(0.5 * time));
}

export function projectOrbit(
  lambda: number,
  radius: number,
  tilt: number,
  roll: number,
  centerY: number = HEAD_CENTER
) {
  const horizontal = radius * Math.sin(lambda);
  const vertical = -radius * Math.cos(lambda) * Math.sin(tilt);
  const cosRoll = Math.cos(roll);
  const sinRoll = Math.sin(roll);
  return {
    x: HEAD_CENTER + horizontal * cosRoll - vertical * sinRoll,
    y: centerY + horizontal * sinRoll + vertical * cosRoll,
    z: Math.cos(lambda) * Math.cos(tilt),
  };
}

export function trailLifeAt(time: number, spawnDelay: number) {
  return time - HUMMING_START - 0.3 - spawnDelay;
}

export function trailRetractionAt(life: number) {
  return clamp((life - RETRACTION_START) / RETRACTION_DURATION, 0, 1);
}

function trailLambdaAt(life: number, config: TrailConfig) {
  const spawnTime = 0.3 + config.spawnDelay;
  const currentTime = spawnTime + Math.max(life, 0);
  const spinAtSpawn = hummingSpinAngle(spawnTime);
  return (
    spinAtSpawn -
    config.lambdaOffset +
    (hummingSpinAngle(currentTime) - spinAtSpawn) * config.follow +
    config.lambdaVelocity * Math.max(life, 0)
  );
}

export function trailVisibleArc(life: number, config: TrailConfig) {
  if (life <= 0) return 0;
  const initialLambda = trailLambdaAt(0, config);
  const currentLambda = trailLambdaAt(life, config);
  const travelled = Math.abs(currentLambda - initialLambda);
  const retraction = trailRetractionAt(life);
  const retractionEase = retraction * retraction * (3 - 2 * retraction);
  return Math.min(travelled, config.arc * (1 - retractionEase));
}

export function hslColor(hue: number, saturation: number, lightness: number) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
  let red = 0, green = 0, blue = 0;
  if (sector < 1) { red = chroma; green = secondary; }
  else if (sector < 2) { red = secondary; green = chroma; }
  else if (sector < 3) { green = chroma; blue = secondary; }
  else if (sector < 4) { green = secondary; blue = chroma; }
  else if (sector < 5) { red = secondary; blue = chroma; }
  else { red = chroma; blue = secondary; }
  const offset = lightness - chroma / 2;
  return `rgb(${Math.round((red + offset) * 255)},${Math.round((green + offset) * 255)},${Math.round((blue + offset) * 255)})`;
}

function appendRibbonContour(
  target: string[],
  start: number,
  end: number,
  pointCount: number,
  xs: number[],
  ys: number[],
  leftXs: number[],
  leftYs: number[],
  rightXs: number[],
  rightYs: number[]
) {
  const f = (n: number) => n.toFixed(2);
  target.push(`M${f(leftXs[start])} ${f(leftYs[start])}`);
  for (let i = start + 1; i <= end; i++) {
    target.push(`L${f(leftXs[i])} ${f(leftYs[i])}`);
  }
  if (end === pointCount - 1) {
    const previous = Math.max(end - 1, 0);
    const dx = xs[end] - xs[previous];
    const dy = ys[end] - ys[previous];
    const length = Math.hypot(dx, dy) || 1;
    const capRadius = Math.hypot(leftXs[end] - xs[end], leftYs[end] - ys[end]) || 0.2;
    target.push(
      `Q${f(xs[end] + (dx / length) * capRadius * 2)} ${f(ys[end] + (dy / length) * capRadius * 2)} ${f(rightXs[end])} ${f(rightYs[end])}`
    );
  } else {
    target.push(`L${f(rightXs[end])} ${f(rightYs[end])}`);
  }
  for (let i = end - 1; i >= start; i--) {
    target.push(`L${f(rightXs[i])} ${f(rightYs[i])}`);
  }
  if (start === 0) {
    const next = Math.min(start + 1, pointCount - 1);
    const dx = xs[next] - xs[start];
    const dy = ys[next] - ys[start];
    const length = Math.hypot(dx, dy) || 1;
    const capRadius = Math.hypot(leftXs[start] - xs[start], leftYs[start] - ys[start]) || 0.2;
    target.push(
      `Q${f(xs[start] - (dx / length) * capRadius * 2)} ${f(ys[start] - (dy / length) * capRadius * 2)} ${f(leftXs[start])} ${f(leftYs[start])}`
    );
  } else {
    target.push(`L${f(leftXs[start])} ${f(leftYs[start])}`);
  }
  target.push("Z");
}

export interface TrailFrame {
  /** 后景 / 前景路径 d（空串 = 该层无内容） */
  back: string;
  front: string;
  opacity: number;
  /** 渐变端点与 5 个色标 */
  gradient: { x1: number; y1: number; x2: number; y2: number } | null;
  stops: string[];
}

/**
 * 计算单条彩带在当前时刻的几何。
 * @param trailT 彩带计时（秒，< 0 表示尚未触发）
 * @param centerY 环绕中心 Y（吉祥物 / 球体中心不同）
 */
export function computeTrailFrame(
  trailT: number,
  config: TrailConfig,
  centerY: number = HEAD_CENTER
): TrailFrame {
  const empty: TrailFrame = { back: "", front: "", opacity: 0, gradient: null, stops: [] };
  const life = trailLifeAt(trailT, config.spawnDelay);
  const retraction = trailRetractionAt(life);
  const visibleArc = trailVisibleArc(life, config);

  if (trailT < 0 || life <= 0 || retraction >= 1 || visibleArc < 0.025) return empty;

  const currentLambda = trailLambdaAt(life, config);
  const radius = config.radius + config.radiusVelocity * life;
  const pointCount = Math.min(48, Math.max(2, Math.ceil(visibleArc / MAX_SAMPLE_ANGLE) + 1));

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const leftXs: number[] = [];
  const leftYs: number[] = [];
  const rightXs: number[] = [];
  const rightYs: number[] = [];
  let pathLength = 0;

  for (let j = 0; j < pointCount; j++) {
    const progress = j / (pointCount - 1);
    const lambda = currentLambda - visibleArc * (1 - progress);
    const point = projectOrbit(lambda, radius, config.tilt, config.roll, centerY);
    xs.push(point.x);
    ys.push(point.y);
    zs.push(point.z);
    if (j > 0) pathLength += Math.hypot(point.x - xs[j - 1], point.y - ys[j - 1]);
  }

  const headDepth = 0.72 + 0.28 * clamp(zs[pointCount - 1], 0, 1);
  const growth = smoothstep(clamp(life / 0.34, 0, 1));
  const rawWidth = Math.max(
    config.baseWidth * headDepth * 1.7 * growth * (1 - 0.72 * retraction * retraction),
    0.5
  );
  const width = Math.min(rawWidth, pathLength * 0.34);

  for (let j = 0; j < pointCount; j++) {
    const prev = Math.max(j - 1, 0);
    const next = Math.min(j + 1, pointCount - 1);
    const dx = xs[next] - xs[prev];
    const dy = ys[next] - ys[prev];
    const length = Math.hypot(dx, dy) || 1;
    const halfWidth = (width * (0.5 + 0.5 * (j / (pointCount - 1)))) / 2;
    const normalX = (-dy / length) * halfWidth;
    const normalY = (dx / length) * halfWidth;
    leftXs.push(xs[j] + normalX);
    leftYs.push(ys[j] + normalY);
    rightXs.push(xs[j] - normalX);
    rightYs.push(ys[j] - normalY);
  }

  const backParts: string[] = [];
  const frontParts: string[] = [];
  let groupStart = 0;
  while (groupStart < pointCount) {
    const groupIsFront = zs[groupStart] >= 0;
    let groupEnd = groupStart;
    while (groupEnd + 1 < pointCount && (zs[groupEnd + 1] >= 0) === groupIsFront) {
      groupEnd++;
    }
    const target = groupIsFront ? frontParts : backParts;
    const expandedStart = Math.max(groupStart - 1, 0);
    const expandedEnd = Math.min(groupEnd + 1, pointCount - 1);
    if (expandedEnd > expandedStart) {
      appendRibbonContour(
        target, expandedStart, expandedEnd, pointCount,
        xs, ys, leftXs, leftYs, rightXs, rightYs
      );
    }
    groupStart = groupEnd + 1;
  }

  const startPoint =
    visibleArc > 0
      ? projectOrbit(currentLambda - visibleArc, radius, config.tilt, config.roll, centerY)
      : { x: HEAD_CENTER, y: centerY };
  const endPoint = projectOrbit(currentLambda, radius, config.tilt, config.roll, centerY);

  const movingHue = config.baseHue + config.hueVelocity * Math.max(life, 0);
  const stops = [
    hslColor(movingHue, 0.56, 0.56),
    hslColor(movingHue + config.hueSpan * 0.25, 0.56, 0.59),
    hslColor(movingHue + config.hueSpan * 0.5, 0.56, 0.62),
    hslColor(movingHue + config.hueSpan * 0.75, 0.56, 0.64),
    hslColor(movingHue + config.hueSpan, 0.56, 0.67),
  ];

  return {
    back: backParts.join(""),
    front: frontParts.join(""),
    opacity: Math.min(1, life / 0.26),
    gradient: {
      x1: startPoint.x, y1: startPoint.y,
      x2: endPoint.x, y2: endPoint.y,
    },
    stops,
  };
}

/* -------------------------------------------------------------------------- */
/* 轨道粒子                                                                     */
/* -------------------------------------------------------------------------- */

export interface ParticleOrbit {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  speed: number;
  minRadius: number;
  radiusRange: number;
  minOpacity: number;
  opacityRange: number;
}

export const PARTICLE_ORBIT_DEFAULT: ParticleOrbit = {
  cx: 114.25,
  cy: 106.25,
  rx: 148.45,
  ry: 56.45,
  speed: 1.55096587,
  minRadius: 4.13,
  radiusRange: 3.37,
  minOpacity: 0.685,
  opacityRange: 0.315,
};

export function updateParticleElement(
  el: SVGCircleElement | null,
  orbit: ParticleOrbit,
  angle: number,
  boost: number
) {
  if (!el) return;
  const x = orbit.cx + orbit.rx * Math.cos(angle);
  const y = orbit.cy + orbit.ry * Math.sin(angle);
  const depth = (1 - Math.sin(angle)) * 0.5;
  el.setAttribute("cx", x.toFixed(2));
  el.setAttribute("cy", y.toFixed(2));
  el.setAttribute("r", (orbit.minRadius + orbit.radiusRange * depth).toFixed(2));
  el.setAttribute(
    "opacity",
    Math.min(1, (orbit.minOpacity + orbit.opacityRange * depth) * boost).toFixed(3)
  );
}

/** 围绕吉祥物果体（中心偏下）的粒子轨道 */
export const PARTICLE_ORBIT_MASCOT: ParticleOrbit = {
  cx: 114.2705,
  cy: 138,
  rx: 126,
  ry: 44,
  speed: 1.35,
  minRadius: 4.2,
  radiusRange: 3.4,
  minOpacity: 0.6,
  opacityRange: 0.4,
};

/** 彩带环绕中心（吉祥物果体中心略偏下） */
export const TRAIL_CENTER_Y_MASCOT = 138;
