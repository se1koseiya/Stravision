"use client";

/**
 * Grok Orb 渲染层（原 berry-orb 内部实现，2026-10-14 抽离）
 *
 * 移植自 ngocdevv/grok-bot-emoji（MIT License）：https://github.com/ngocdevv/grok-bot-emoji
 * 原实现基于 React Native Skia + Reanimated；本文件为纯 SVG + requestAnimationFrame：
 * - 眼部路径插值：所有 eye path 结构一致（1M + 47L + 1Z），逐点坐标 lerp
 * - 自然模式：下/上眼位在 13.6s 周期内缓慢往返 + 眨眼过冲
 * - 表情模式：每个表情按姿态序列循环（保持 + 0.72s 平滑变形）
 * - 表情切换：320ms cubic-bezier(0.77, 0, 0.175, 1) 跨表情路径变形
 * - 轨迹彩带：表情切换时的一次性环绕彩带（前后景分层）
 *
 * 对外由 components/smoothui/berry-orb.tsx 通过 `variant="orb"` 调用，
 * 保留原蓝白球体外观作为回退形态。
 */

import { toGrokExpression, type OrbExpression } from "@/lib/ai/orb-expression";
import React, { useEffect, useId, useMemo, useRef } from "react";
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
import {
  PARTICLE_ORBIT_DEFAULT,
  TRAIL_CONFIGS,
  TRAIL_STOP_OFFSETS,
  clamp,
  computeTrailFrame,
  smoothstep,
  updateParticleElement,
} from "./orb-trails";

/* -------------------------------------------------------------------------- */
// 几何常量（与 x.ai 原始节奏一致）
// -------------------------------------------------------------------------- */

const BODY_CENTER = 114.2705;
const EYE_ORIGIN_X = 114.2705;
const EYE_ORIGIN_Y = 92;
const ORBIT_SPEED = 1.55096587;

const EYE_CYCLE_DURATION = 13.6;
const MORPH_UP_START = 3.35;
const MORPH_UP_END = 4.15;
const MORPH_DOWN_START = 9.25;
const MORPH_DOWN_END = 10.05;
const EXPRESSION_MORPH_DURATION = 320; // ms
const EXPRESSION_POSE_MORPH_DURATION = 0.72; // s
const CADENCE_VARIATIONS = [0.18, 0.72, 0.42, 0.9, 0.58] as const;

/* -------------------------------------------------------------------------- */
// 路径数据：解析为坐标数组（结构统一，可逐点插值）
// -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
// 缓动与时间函数
// -------------------------------------------------------------------------- */

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
function animatedExpressionValueAt(time: number, durations: number[], totalDuration: number) {
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

/* -------------------------------------------------------------------------- */
// 眼部路径插值
// -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
// 主题配色
// -------------------------------------------------------------------------- */

export interface OrbPalette {
  bodyGradientStops: [string, string];
  bodyStroke?: string;
  eye: string;
  eyeActive: string;
  eyeGlow: string;
  particle: string;
  haloActive: string;
  haloInactive: string;
  /** 仅吉祥物形态使用：面罩（脸部）底色 */
  face?: string;
  /** 仅吉祥物形态使用：叶子渐变 */
  leaf?: [string, string];
}

export const GROK_PALETTES: Record<"dark" | "light", OrbPalette> = {
  dark: {
    bodyGradientStops: ["rgba(30,58,138,0.55)", "#09090B"],
    eye: "#a1a1aa",
    eyeActive: "#71717a",
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
    eye: "#059669",
    eyeActive: "#52525b",
    eyeGlow: "rgba(59,130,246,0.4)",
    particle: "#71717a",
    haloActive:
      "radial-gradient(circle, rgba(191,219,254,0.35) 0%, rgba(219,234,254,0.15) 40%, transparent 70%)",
    haloInactive:
      "radial-gradient(circle, rgba(191,219,254,0.15) 0%, rgba(219,234,254,0.06) 40%, transparent 70%)",
  },
};

export interface GrokOrbBodyProps {
  expression?: OrbExpression;
  isActive: boolean;
  paused: boolean;
  trails: boolean;
  palette: OrbPalette;
}

const GrokOrbBody: React.FC<GrokOrbBodyProps> = ({
  expression,
  isActive,
  paused,
  trails,
  palette,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const trailsEnabled = trails;

  const targetExpr = toGrokExpression(expression ?? (isActive ? "working" : "idle"));
  const initialPose = useMemo(() => staticPoseFor(targetExpr), []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const baseTimeRef = useRef(0);

  useEffect(() => {
    staticRef.current = paused;
  }, [paused]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

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

    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const staticMode = staticRef.current;
      const t = staticMode ? 0 : (now - baseTimeRef.current) / 1000;

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

      const btx = 1.4878 * Math.sin((Math.PI * 2 * t) / 18.29 - 3.0698);
      const bty = 1.4539 * Math.sin((Math.PI * 2 * t) / 7.835 - 0.828);
      const brot = 1.9847 * Math.sin((Math.PI * 2 * t) / 13.71 + 2.2731);
      bodyGroupRef.current?.setAttribute(
        "transform",
        `translate(${btx.toFixed(3)} ${bty.toFixed(3)}) rotate(${brot.toFixed(3)} ${BODY_CENTER} ${BODY_CENTER})`
      );

      const boost = isActiveRef.current ? 1.15 : 0.85;
      updateParticleElement(particle1Ref.current, PARTICLE_ORBIT_DEFAULT, t * ORBIT_SPEED + 0.42, boost);
      updateParticleElement(particle2Ref.current, PARTICLE_ORBIT_DEFAULT, t * ORBIT_SPEED + 0.42 + Math.PI, boost);

      if (trailsEnabled) {
        const trailT = staticMode ? -1 : (now - trailStartRef.current) / 1000;
        for (let i = 0; i < TRAIL_CONFIGS.length; i++) {
          const frame = computeTrailFrame(trailT, TRAIL_CONFIGS[i]);
          const back = trailBackRefs.current[i];
          const front = trailFrontRefs.current[i];
          if (back) {
            back.setAttribute("d", frame.back);
            back.setAttribute("opacity", frame.opacity.toFixed(3));
          }
          if (front) {
            front.setAttribute("d", frame.front);
            front.setAttribute("opacity", frame.opacity.toFixed(3));
          }
          const gradient = trailGradientRefs.current[i];
          if (gradient && frame.gradient) {
            gradient.setAttribute("x1", frame.gradient.x1.toFixed(2));
            gradient.setAttribute("y1", frame.gradient.y1.toFixed(2));
            gradient.setAttribute("x2", frame.gradient.x2.toFixed(2));
            gradient.setAttribute("y2", frame.gradient.y2.toFixed(2));
            const stops = trailStopRefs.current[i];
            if (stops) {
              for (let j = 0; j < frame.stops.length; j++) {
                stops[j]?.setAttribute("stop-color", frame.stops[j]);
              }
            }
          }
        }
      }
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [trailsEnabled]);

  const eyeFill = isActive ? palette.eyeActive : palette.eye;

  return (
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
              {TRAIL_STOP_OFFSETS.map((offset, j) => (
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

      <circle ref={particle1Ref} fill={palette.particle} opacity={0} />
      <circle ref={particle2Ref} fill={palette.particle} opacity={0} />

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
  );
};

export default GrokOrbBody;
