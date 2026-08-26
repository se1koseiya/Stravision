"use client";

/**
 * BerryOrb v4 —— 基于 Grok Orb（x.ai/bot）的 Web SVG 移植版
 *
 * 移植自 ngocdevv/grok-bot-emoji（MIT License）：https://github.com/ngocdevv/grok-bot-emoji
 * 原实现基于 React Native Skia + Reanimated；本文件改为纯 SVG + requestAnimationFrame：
 * - 眼部路径插值：所有 eye path 结构一致（1M + 47L + 1Z），逐点坐标 lerp
 * - 自然模式：下/上眼位在 13.6s 周期内缓慢往返 + 眨眼过冲
 * - 表情模式：每个表情按姿态序列循环（保持 + 0.72s 平滑变形）
 * - 表情切换：320ms cubic-bezier(0.77, 0, 0.175, 1) 跨表情路径变形
 * - 轨迹彩带：表情切换时的一次性环绕彩带（前后景分层）
 *
 * 外观适配本项目：蓝白主题（dark/light）、柔和光晕、光标视差。
 * 对外保持 BerryOrbProps 兼容（size/className/isActive/theme/expression）。
 */

import { cn } from "@/lib/utils";
import { toGrokExpression, type OrbExpression } from "@/lib/ai/orb-expression";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  GROK_BODY_PATH,
  GROK_EYE_LOWER_LEFT_PATH,
  GROK_EYE_LOWER_RIGHT_PATH,
  GROK_EYE_UPPER_LEFT_PATH,
  GROK_EYE_UPPER_RIGHT_PATH,
  GROK_ORB_EXPRESSION_SEQUENCES,
  GROK_ORB_EXPRESSION_TIMING_RANGES,
  GROK_ORB_POSES,
} from "./grok-orb-data";

export type BerryOrbProps = {
  size?: string;
  className?: string;
  isActive?: boolean;
  theme?: "dark" | "light";
  /** 表情：12 种 Grok 姿态 + 5 个遗留状态别名（idle/thinking/working/speaking/listening） */
  expression?: OrbExpression;
  /** 冻结动画在参考姿态上 */
  paused?: boolean;
  /** 表情切换时的环绕彩带；默认尺寸 ≥ 96px 时开启 */
  trails?: boolean;
};

// ---------------------------------------------------------------------------
// 几何常量（与 x.ai 原始节奏一致）
// ---------------------------------------------------------------------------

const BODY_CENTER = 114.2705;
const EYE_ORIGIN_X = 114.2705;
const EYE_ORIGIN_Y = 92;
const ORBIT_CENTER_X = 114.25;
const ORBIT_CENTER_Y = 106.25;
const ORBIT_RADIUS_X = 148.45;
const ORBIT_RADIUS_Y = 56.45;
const ORBIT_SPEED = 1.55096587;
const PARTICLE_MIN_RADIUS = 4.13;
const PARTICLE_RADIUS_RANGE = 3.37;
const PARTICLE_MIN_OPACITY = 0.685;
const PARTICLE_OPACITY_RANGE = 0.315;

const EYE_CYCLE_DURATION = 13.6;
const MORPH_UP_START = 3.35;
const MORPH_UP_END = 4.15;
const MORPH_DOWN_START = 9.25;
const MORPH_DOWN_END = 10.05;
const EXPRESSION_MORPH_DURATION = 320; // ms
const EXPRESSION_POSE_MORPH_DURATION = 0.72; // s
const CADENCE_VARIATIONS = [0.18, 0.72, 0.42, 0.9, 0.58] as const;

// ---------------------------------------------------------------------------
// 路径数据：解析为坐标数组（结构统一，可逐点插值）
// ---------------------------------------------------------------------------

function parsePolyline(d: string): Float64Array {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  const out = new Float64Array(nums!.length);
  for (let i = 0; i < nums!.length; i++) out[i] = parseFloat(nums![i]);
  return out;
}

const LOWER_LEFT = parsePolyline(GROK_EYE_LOWER_LEFT_PATH);
const UPPER_LEFT = parsePolyline(GROK_EYE_UPPER_LEFT_PATH);
const LOWER_RIGHT = parsePolyline(GROK_EYE_LOWER_RIGHT_PATH);
const UPPER_RIGHT = parsePolyline(GROK_EYE_UPPER_RIGHT_PATH);

const POSE_POINTS = GROK_ORB_POSES.map((p) => ({
  left: parsePolyline(p.left),
  right: parsePolyline(p.right),
}));

type EyePair = { left: Float64Array; right: Float64Array };

/** 每个表情的循环姿态序列（末尾回到首姿态） */
const EXPRESSION_POSE_PATHS: Record<string, EyePair[]> = {};
const EXPRESSION_MOTIONS: Record<string, { durations: number[]; total: number }> = {};

{
  const ids = Object.keys(GROK_ORB_EXPRESSION_SEQUENCES);
  ids.forEach((expr, exprIdx) => {
    const seq = GROK_ORB_EXPRESSION_SEQUENCES[expr];
    EXPRESSION_POSE_PATHS[expr] = [...seq, seq[0]].map((i) => POSE_POINTS[i]);
    const [min, max] = GROK_ORB_EXPRESSION_TIMING_RANGES[expr];
    const durations = seq.map((_, poseIdx) => {
      const variation = CADENCE_VARIATIONS[(exprIdx + poseIdx) % CADENCE_VARIATIONS.length];
      return min + (max - min) * variation;
    });
    EXPRESSION_MOTIONS[expr] = {
      durations,
      total: durations.reduce((sum, d) => sum + d, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// 缓动与时间函数
// ---------------------------------------------------------------------------

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value: number) {
  const c = clamp(value, 0, 1);
  return c * c * (3 - 2 * c);
}

/** cubic-bezier(0.77, 0, 0.175, 1) —— 表情切换缓动 */
function expressionEasing(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x1 = 0.77, y1 = 0, x2 = 0.175, y2 = 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const sampleDX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleX(u) - t;
    if (Math.abs(x) < 1e-6) return sampleY(u);
    const d = sampleDX(u);
    if (Math.abs(d) < 1e-6) break;
    u -= x / d;
  }
  let lo = 0, hi = 1;
  u = t;
  for (let i = 0; i < 24; i++) {
    const x = sampleX(u);
    if (Math.abs(x - t) < 1e-6) break;
    if (x < t) lo = u;
    else hi = u;
    u = (lo + hi) / 2;
  }
  return sampleY(u);
}

/** 自然模式：0=下眼位，1=上眼位（13.6s 往返一次） */
function eyeMorphAt(time: number) {
  const local = time % EYE_CYCLE_DURATION;
  if (local < MORPH_UP_START) return 0;
  if (local < MORPH_UP_END) return smoothstep((local - MORPH_UP_START) / (MORPH_UP_END - MORPH_UP_START));
  if (local < MORPH_DOWN_START) return 1;
  if (local < MORPH_DOWN_END) {
    return 1 - smoothstep((local - MORPH_DOWN_START) / (MORPH_DOWN_END - MORPH_DOWN_START));
  }
  return 0;
}

function transitionAt(time: number) {
  const local = time % EYE_CYCLE_DURATION;
  if (local >= MORPH_UP_START && local < MORPH_UP_END) {
    return { isMorphingUp: true, progress: (local - MORPH_UP_START) / (MORPH_UP_END - MORPH_UP_START) };
  }
  if (local >= MORPH_DOWN_START && local < MORPH_DOWN_END) {
    return { isMorphingUp: false, progress: (local - MORPH_DOWN_START) / (MORPH_DOWN_END - MORPH_DOWN_START) };
  }
  return { isMorphingUp: false, progress: -1 };
}

/** 表情姿态值：段索引 + 段内变形进度（保持 → 0.72s 平滑变形） */
function animatedExpressionValueAt(
  time: number,
  durations: number[],
  totalDuration: number
) {
  let segmentTime = ((time % totalDuration) + totalDuration) % totalDuration;
  let poseIndex = 0;
  for (let i = 0; i < durations.length; i++) {
    if (segmentTime < durations[i]) {
      poseIndex = i;
      break;
    }
    segmentTime -= durations[i];
  }
  const segmentDuration = durations[poseIndex];
  const morphDuration = Math.min(EXPRESSION_POSE_MORPH_DURATION, segmentDuration * 0.42);
  const holdDuration = segmentDuration - morphDuration;
  const morphProgress = smoothstep((segmentTime - holdDuration) / morphDuration);
  return poseIndex + morphProgress;
}

// ---------------------------------------------------------------------------
// 眼部路径插值
// ---------------------------------------------------------------------------

function lerpPoints(out: Float64Array, a: Float64Array, b: Float64Array, t: number) {
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
}

function pointsToD(p: Float64Array): string {
  let d = `M${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  for (let i = 2; i < p.length; i += 2) {
    d += `L${p[i].toFixed(2)} ${p[i + 1].toFixed(2)}`;
  }
  return d + "Z";
}

function naturalPoseAt(morph: number, out: EyePair) {
  lerpPoints(out.left, LOWER_LEFT, UPPER_LEFT, morph);
  lerpPoints(out.right, LOWER_RIGHT, UPPER_RIGHT, morph);
}

function expressionPoseAt(expr: string, time: number, out: EyePair) {
  const paths = EXPRESSION_POSE_PATHS[expr] ?? EXPRESSION_POSE_PATHS.happy;
  const motion = EXPRESSION_MOTIONS[expr] ?? EXPRESSION_MOTIONS.happy;
  const v = animatedExpressionValueAt(time, motion.durations, motion.total);
  let i = Math.floor(v);
  let f = v - i;
  if (i > paths.length - 2) {
    i = paths.length - 2;
    f = 1;
  }
  lerpPoints(out.left, paths[i].left, paths[i + 1].left, f);
  lerpPoints(out.right, paths[i].right, paths[i + 1].right, f);
}

/** 初始静态姿态（SSR / 水合前的首帧） */
function staticPoseFor(expr: string): EyePair {
  if (expr === "natural") {
    return { left: LOWER_LEFT, right: LOWER_RIGHT };
  }
  const seq = GROK_ORB_EXPRESSION_SEQUENCES[expr] ?? GROK_ORB_EXPRESSION_SEQUENCES.happy;
  return POSE_POINTS[seq[0]];
}

// ---------------------------------------------------------------------------
// 轨迹彩带（表情切换时的一次性环绕动画）
// ---------------------------------------------------------------------------

const HEAD_CENTER = 114.2705;
const HUMMING_START = 0.8;
const TRAIL_MAX_LIFE = 9;
const RETRACTION_START = TRAIL_MAX_LIFE * 0.55;
const RETRACTION_DURATION = 0.5;
const MAX_SAMPLE_ANGLE = 0.09;

interface TrailConfig {
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
const TRAIL_CONFIGS: TrailConfig[] = [
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

function integralEaseInOutCubic(value: number) {
  return value <= 0.5
    ? Math.pow(value, 4)
    : value - 0.5 + Math.pow(1 - value, 4);
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
  return (
    secondStageAngle +
    1.6 * (time - 1.3) +
    0.6 * (Math.cos(0.65) - Math.cos(0.5 * time))
  );
}

function projectOrbit(lambda: number, radius: number, tilt: number, roll: number) {
  const horizontal = radius * Math.sin(lambda);
  const vertical = -radius * Math.cos(lambda) * Math.sin(tilt);
  const cosRoll = Math.cos(roll);
  const sinRoll = Math.sin(roll);
  return {
    x: HEAD_CENTER + horizontal * cosRoll - vertical * sinRoll,
    y: HEAD_CENTER + horizontal * sinRoll + vertical * cosRoll,
    z: Math.cos(lambda) * Math.cos(tilt),
  };
}

function trailLifeAt(time: number, spawnDelay: number) {
  return time - HUMMING_START - 0.3 - spawnDelay;
}

function trailRetractionAt(life: number) {
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

function trailVisibleArc(life: number, config: TrailConfig) {
  if (life <= 0) return 0;
  const initialLambda = trailLambdaAt(0, config);
  const currentLambda = trailLambdaAt(life, config);
  const travelled = Math.abs(currentLambda - initialLambda);
  const retraction = trailRetractionAt(life);
  const retractionEase = retraction * retraction * (3 - 2 * retraction);
  return Math.min(travelled, config.arc * (1 - retractionEase));
}

function hslColor(hue: number, saturation: number, lightness: number) {
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

// ---------------------------------------------------------------------------
// 主题配色（适配本项目蓝白视觉）
// ---------------------------------------------------------------------------

interface OrbPalette {
  bodyGradientStops: [string, string];
  bodyStroke?: string;
  eye: string;
  eyeActive: string;
  eyeGlow: string;
  particle: string;
  haloActive: string;
  haloInactive: string;
}

const PALETTES: Record<"dark" | "light", OrbPalette> = {
  dark: {
    bodyGradientStops: ["rgba(30,58,138,0.55)", "#020617"],
    eye: "#93c5fd",
    eyeActive: "#60a5fa",
    eyeGlow: "rgba(96,165,250,0.85)",
    particle: "#ffffff",
    haloActive:
      "radial-gradient(circle, rgba(96,165,250,0.25) 0%, rgba(34,211,238,0.1) 40%, transparent 70%)",
    haloInactive:
      "radial-gradient(circle, rgba(96,165,250,0.1) 0%, rgba(34,211,238,0.05) 40%, transparent 70%)",
  },
  light: {
    bodyGradientStops: ["#ffffff", "#dceafb"],
    bodyStroke: "rgba(147,197,253,0.7)",
    eye: "#3b82f6",
    eyeActive: "#2563eb",
    eyeGlow: "rgba(59,130,246,0.4)",
    particle: "#60a5fa",
    haloActive:
      "radial-gradient(circle, rgba(191,219,254,0.35) 0%, rgba(219,234,254,0.15) 40%, transparent 70%)",
    haloInactive:
      "radial-gradient(circle, rgba(191,219,254,0.15) 0%, rgba(219,234,254,0.06) 40%, transparent 70%)",
  },
};

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

const BerryOrb: React.FC<BerryOrbProps> = ({
  size = "192px",
  className,
  isActive = false,
  theme,
  expression,
  paused = false,
  trails,
}) => {
  const numericSize = parseFloat(size) || 192;
  const scale = numericSize / 192;
  const targetExpr = toGrokExpression(expression ?? (isActive ? "working" : "idle"));
  const trailsEnabled = trails ?? numericSize >= 96;
  const reduceMotion = useReducedMotion() ?? false;

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const effectiveTheme = theme || (mounted && resolvedTheme === "light" ? "light" : "dark");
  const palette = PALETTES[effectiveTheme];

  // ── 首帧静态姿态（水合前渲染；水合后由 rAF 接管） ──
  const initialPose = useMemo(() => staticPoseFor(targetExpr), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── refs（rAF 每帧写入，避免 React 重渲染） ──
  const leftEyePathRef = useRef<SVGPathElement>(null);
  const rightEyePathRef = useRef<SVGPathElement>(null);
  const eyePulseRef = useRef<SVGGElement>(null);
  const leftEyeGroupRef = useRef<SVGGElement>(null);
  const rightEyeGroupRef = useRef<SVGGElement>(null);
  const bodyGroupRef = useRef<SVGGElement>(null);
  const particle1Ref = useRef<SVGCircleElement>(null);
  const particle2Ref = useRef<SVGCircleElement>(null);
  const trailBackRefs = useRef<Array<SVGPathElement | null>>([]);
  const trailFrontRefs = useRef<Array<SVGPathElement | null>>([]);
  const trailGradientRefs = useRef<Array<SVGLinearGradientElement | null>>([]);
  const trailStopRefs = useRef<Array<Array<SVGStopElement | null>>>([]);

  const expressionStateRef = useRef({ from: targetExpr, to: targetExpr, start: -1 });
  const trailStartRef = useRef(-1);
  const lastTrailRef = useRef(0);
  const staticRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const trailsEnabledRef = useRef(trailsEnabled);
  const baseTimeRef = useRef(0);

  useEffect(() => {
    staticRef.current = paused || reduceMotion;
  }, [paused, reduceMotion]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    trailsEnabledRef.current = trailsEnabled;
  }, [trailsEnabled]);

  // 表情切换：记录 from/to 与切换时刻，并触发彩带（2.5s 防抖）
  useEffect(() => {
    const st = expressionStateRef.current;
    if (st.to !== targetExpr) {
      st.from = st.to;
      st.to = targetExpr;
      st.start = performance.now();
      const now = performance.now();
      if (trailsEnabled && now - lastTrailRef.current > 2500) {
        trailStartRef.current = now;
        lastTrailRef.current = now;
      }
    }
  }, [targetExpr, trailsEnabled]);

  // ── 主渲染循环 ──
  useEffect(() => {
    const fromBuf: EyePair = {
      left: new Float64Array(LOWER_LEFT.length),
      right: new Float64Array(LOWER_RIGHT.length),
    };
    const toBuf: EyePair = {
      left: new Float64Array(LOWER_LEFT.length),
      right: new Float64Array(LOWER_RIGHT.length),
    };
    const curBuf: EyePair = {
      left: new Float64Array(LOWER_LEFT.length),
      right: new Float64Array(LOWER_RIGHT.length),
    };

    baseTimeRef.current = performance.now();
    trailStartRef.current = performance.now();
    lastTrailRef.current = performance.now();

    const updateParticle = (el: SVGCircleElement | null, angle: number, boost: number) => {
      if (!el) return;
      const x = ORBIT_CENTER_X + ORBIT_RADIUS_X * Math.cos(angle);
      const y = ORBIT_CENTER_Y + ORBIT_RADIUS_Y * Math.sin(angle);
      const depth = (1 - Math.sin(angle)) * 0.5;
      el.setAttribute("cx", x.toFixed(2));
      el.setAttribute("cy", y.toFixed(2));
      el.setAttribute("r", (PARTICLE_MIN_RADIUS + PARTICLE_RADIUS_RANGE * depth).toFixed(2));
      el.setAttribute(
        "opacity",
        Math.min(1, (PARTICLE_MIN_OPACITY + PARTICLE_OPACITY_RANGE * depth) * boost).toFixed(3)
      );
    };

    const updateTrails = (now: number) => {
      const staticMode = staticRef.current;
      const trailT = staticMode ? -1 : (now - trailStartRef.current) / 1000;

      for (let i = 0; i < TRAIL_CONFIGS.length; i++) {
        const config = TRAIL_CONFIGS[i];
        const back = trailBackRefs.current[i];
        const front = trailFrontRefs.current[i];
        const life = trailLifeAt(trailT, config.spawnDelay);
        const retraction = trailRetractionAt(life);
        const visibleArc = trailVisibleArc(life, config);

        if (trailT < 0 || life <= 0 || retraction >= 1 || visibleArc < 0.025) {
          if (back?.getAttribute("d")) back.setAttribute("d", "");
          if (front?.getAttribute("d")) front.setAttribute("d", "");
          continue;
        }

        const currentLambda = trailLambdaAt(life, config);
        const radius = config.radius + config.radiusVelocity * life;
        const pointCount = Math.min(
          48,
          Math.max(2, Math.ceil(visibleArc / MAX_SAMPLE_ANGLE) + 1)
        );
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
          const point = projectOrbit(lambda, radius, config.tilt, config.roll);
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
              target,
              expandedStart,
              expandedEnd,
              pointCount,
              xs,
              ys,
              leftXs,
              leftYs,
              rightXs,
              rightYs
            );
          }
          groupStart = groupEnd + 1;
        }

        const opacity = Math.min(1, life / 0.26);
        if (back) {
          back.setAttribute("d", backParts.join(""));
          back.setAttribute("opacity", opacity.toFixed(3));
        }
        if (front) {
          front.setAttribute("d", frontParts.join(""));
          front.setAttribute("opacity", opacity.toFixed(3));
        }

        const gradient = trailGradientRefs.current[i];
        if (gradient) {
          const startPoint =
            visibleArc > 0
              ? projectOrbit(currentLambda - visibleArc, radius, config.tilt, config.roll)
              : { x: HEAD_CENTER, y: HEAD_CENTER };
          const endPoint = projectOrbit(currentLambda, radius, config.tilt, config.roll);
          gradient.setAttribute("x1", startPoint.x.toFixed(2));
          gradient.setAttribute("y1", startPoint.y.toFixed(2));
          gradient.setAttribute("x2", endPoint.x.toFixed(2));
          gradient.setAttribute("y2", endPoint.y.toFixed(2));
          const stops = trailStopRefs.current[i];
          if (stops) {
            const movingHue = config.baseHue + config.hueVelocity * Math.max(life, 0);
            const hues = [
              hslColor(movingHue, 0.56, 0.56),
              hslColor(movingHue + config.hueSpan * 0.25, 0.56, 0.59),
              hslColor(movingHue + config.hueSpan * 0.5, 0.56, 0.62),
              hslColor(movingHue + config.hueSpan * 0.75, 0.56, 0.64),
              hslColor(movingHue + config.hueSpan, 0.56, 0.67),
            ];
            for (let j = 0; j < 5; j++) {
              stops[j]?.setAttribute("stop-color", hues[j]);
            }
          }
        }
      }
    };

    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const staticMode = staticRef.current;
      const t = staticMode ? 0 : (now - baseTimeRef.current) / 1000;

      // 表情过渡进度
      const st = expressionStateRef.current;
      let transitionProgress = 1;
      if (st.start >= 0 && !staticMode) {
        const e = (now - st.start) / EXPRESSION_MORPH_DURATION;
        transitionProgress = e >= 1 ? 1 : expressionEasing(e);
      }
      const prevIsNatural = st.from === "natural";
      const toIsNatural = st.to === "natural";

      const morph = eyeMorphAt(t);

      if (prevIsNatural) naturalPoseAt(morph, fromBuf);
      else expressionPoseAt(st.from, t, fromBuf);
      if (toIsNatural) naturalPoseAt(morph, toBuf);
      else expressionPoseAt(st.to, t, toBuf);

      lerpPoints(curBuf.left, fromBuf.left, toBuf.left, transitionProgress);
      lerpPoints(curBuf.right, fromBuf.right, toBuf.right, transitionProgress);
      leftEyePathRef.current?.setAttribute("d", pointsToD(curBuf.left));
      rightEyePathRef.current?.setAttribute("d", pointsToD(curBuf.right));

      // 自然/预设权重（驱动眼部微移动）
      let naturalWeight = 0;
      if (prevIsNatural && toIsNatural) naturalWeight = 1;
      else if (prevIsNatural) naturalWeight = 1 - transitionProgress;
      else if (toIsNatural) naturalWeight = transitionProgress;
      const presetWeight = 1 - naturalWeight;

      const ltX =
        naturalWeight * (-4.05 + 0.22 * morph + 0.85 * Math.sin(t * 0.71)) +
        presetWeight * (0.68 * Math.sin(t * 0.71) + 0.2 * Math.sin(t * 1.31 + 0.4));
      const ltY =
        naturalWeight * (-2.9 + 4.25 * morph + 0.7 * Math.sin(t * 0.93 + 1.1)) +
        presetWeight * 0.5 * Math.sin(t * 0.93 + 1.1);
      const rtX =
        naturalWeight * (-5.6 + 1.1 * morph + 0.8 * Math.sin(t * 0.66 + 2.1)) +
        presetWeight * (0.64 * Math.sin(t * 0.66 + 2.1) + 0.18 * Math.sin(t * 1.23 + 1.7));
      const rtY =
        naturalWeight * (-2.1 + 2.6 * morph + 0.65 * Math.sin(t * 0.87 + 2.4)) +
        presetWeight * 0.46 * Math.sin(t * 0.87 + 2.4);
      leftEyeGroupRef.current?.setAttribute("transform", `translate(${ltX.toFixed(3)} ${ltY.toFixed(3)})`);
      rightEyeGroupRef.current?.setAttribute("transform", `translate(${rtX.toFixed(3)} ${rtY.toFixed(3)})`);

      // 眨眼过冲 + 表情切换脉冲
      const transition = transitionAt(t);
      const selectionPulse = Math.sin(Math.PI * transitionProgress);
      let sx = 1;
      let sy = 1;
      if (transition.progress < 0) {
        const s = 1 + 0.045 * selectionPulse;
        sx = s;
        sy = s;
      } else {
        const naturalPulse = Math.sin(Math.PI * transition.progress);
        const overshoot = 1 + 0.052 * naturalPulse + 0.045 * selectionPulse;
        const blink = transition.isMorphingUp ? Math.pow(naturalPulse, 10) * 0.58 : 0;
        sx = overshoot;
        sy = overshoot * (1 - blink);
      }
      eyePulseRef.current?.setAttribute(
        "transform",
        `translate(${EYE_ORIGIN_X} ${EYE_ORIGIN_Y}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-EYE_ORIGIN_X} ${-EYE_ORIGIN_Y})`
      );

      // 身体有机运动
      const btx = 1.4878 * Math.sin((Math.PI * 2 * t) / 18.29 - 3.0698);
      const bty = 1.4539 * Math.sin((Math.PI * 2 * t) / 7.835 - 0.828);
      const brot = 1.9847 * Math.sin((Math.PI * 2 * t) / 13.71 + 2.2731);
      bodyGroupRef.current?.setAttribute(
        "transform",
        `translate(${btx.toFixed(3)} ${bty.toFixed(3)}) rotate(${brot.toFixed(3)} ${BODY_CENTER} ${BODY_CENTER})`
      );

      // 环绕粒子
      const boost = isActiveRef.current ? 1.15 : 0.85;
      updateParticle(particle1Ref.current, t * ORBIT_SPEED + 0.42, boost);
      updateParticle(particle2Ref.current, t * ORBIT_SPEED + 0.42 + Math.PI, boost);

      // 轨迹彩带
      if (trailsEnabledRef.current) updateTrails(now);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── 光标视差（整体轻微跟随） ──
  const orbRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const parallaxX = useSpring(mouseX, springConfig);
  const parallaxY = useSpring(mouseY, springConfig);
  const rectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const invalidate = () => {
      rectRef.current = null;
    };
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      frameId = requestAnimationFrame(() => {
        if (!orbRef.current) return;
        if (!rectRef.current) rectRef.current = orbRef.current.getBoundingClientRect();
        const rect = rectRef.current;
        const deltaX = e.clientX - (rect.left + rect.width / 2);
        const deltaY = e.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(deltaX, deltaY);
        const maxDistance = 5 * scale;
        const factor = Math.min(distance / 250, 1);
        mouseX.set(distance === 0 ? 0 : (deltaX / distance) * maxDistance * factor);
        mouseY.set(distance === 0 ? 0 : (deltaY / distance) * maxDistance * factor);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, [mouseX, mouseY, scale]);

  const eyeFill = isActive ? palette.eyeActive : palette.eye;

  return (
    <motion.div
      ref={orbRef}
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* 外围光晕 */}
      <motion.div
        className="absolute inset-[-45%] rounded-full z-0 pointer-events-none"
        style={{ background: isActive ? palette.haloActive : palette.haloInactive, mixBlendMode: "screen" }}
        animate={{
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
          opacity: isActive ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5],
        }}
        transition={{ duration: isActive ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb 主体（含视差） */}
      <motion.div className="relative w-full h-full" style={{ x: parallaxX, y: parallaxY }}>
        <svg
          viewBox="0 0 228.541 228.541"
          width="100%"
          height="100%"
          style={{ overflow: "visible", display: "block" }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`${uid}-body`} cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor={palette.bodyGradientStops[0]} />
              <stop offset="100%" stopColor={palette.bodyGradientStops[1]} />
            </radialGradient>
            <clipPath id={`${uid}-clip`}>
              <path d={GROK_BODY_PATH} />
            </clipPath>
            <filter id={`${uid}-eye-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={palette.eyeGlow} />
            </filter>
            {trailsEnabled &&
              TRAIL_CONFIGS.map((_, i) => (
                <linearGradient
                  key={i}
                  id={`${uid}-trail-${i}`}
                  gradientUnits="userSpaceOnUse"
                  ref={(el) => {
                    trailGradientRefs.current[i] = el;
                  }}
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((offset, j) => (
                    <stop
                      key={j}
                      offset={offset}
                      ref={(el) => {
                        trailStopRefs.current[i] = trailStopRefs.current[i] || [];
                        trailStopRefs.current[i][j] = el;
                      }}
                    />
                  ))}
                </linearGradient>
              ))}
          </defs>

          {/* 背景彩带 */}
          {trailsEnabled && (
            <g>
              {TRAIL_CONFIGS.map((_, i) => (
                <path
                  key={i}
                  fill={`url(#${uid}-trail-${i})`}
                  opacity={0}
                  ref={(el) => {
                    trailBackRefs.current[i] = el;
                  }}
                />
              ))}
            </g>
          )}

          {/* 环绕粒子 */}
          <circle ref={particle1Ref} fill={palette.particle} opacity={0} />
          <circle ref={particle2Ref} fill={palette.particle} opacity={0} />

          {/* Orb 身体 + 眼睛 */}
          <g ref={bodyGroupRef}>
            <path
              d={GROK_BODY_PATH}
              fill={`url(#${uid}-body)`}
              stroke={palette.bodyStroke}
              strokeWidth={palette.bodyStroke ? 1.5 : 0}
            />
            <g clipPath={`url(#${uid}-clip)`}>
              <g ref={eyePulseRef}>
                <g ref={leftEyeGroupRef}>
                  <path
                    ref={leftEyePathRef}
                    d={pointsToD(initialPose.left)}
                    fill={eyeFill}
                    filter={`url(#${uid}-eye-glow)`}
                  />
                </g>
                <g ref={rightEyeGroupRef}>
                  <path
                    ref={rightEyePathRef}
                    d={pointsToD(initialPose.right)}
                    fill={eyeFill}
                    filter={`url(#${uid}-eye-glow)`}
                  />
                </g>
              </g>
            </g>
          </g>

          {/* 前景彩带 */}
          {trailsEnabled && (
            <g>
              {TRAIL_CONFIGS.map((_, i) => (
                <path
                  key={i}
                  fill={`url(#${uid}-trail-${i})`}
                  opacity={0}
                  ref={(el) => {
                    trailFrontRefs.current[i] = el;
                  }}
                />
              ))}
            </g>
          )}
        </svg>
      </motion.div>
    </motion.div>
  );
};

export default BerryOrb;
