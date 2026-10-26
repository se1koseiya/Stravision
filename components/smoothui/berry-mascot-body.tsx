"use client";

/**
 * 莓小智吉祥物渲染层（SVG）
 *
 * 造型 = 平台 logo：玫红莓体 + 三片绿叶 + 乳白面罩 + 吊眼角 + 小撇嘴。
 * 表情系统接入 lib/ai/orb-expression.ts（12 姿态 + 5 状态别名），
 * 姿态在这里被展开成参数（眼睑 / 眼角 / 注视 / 嘴形 / 腮红 / 身体弹性），
 * 由 requestAnimationFrame 逐帧插值并直接写 DOM 属性（不触发 React 重渲染）。
 *
 * 动态分层：
 * 1. 表情层：关键帧序列循环（hold + 0.72s 平滑变形），表情切换 320ms 缓动
 * 2. 自然层：呼吸位移 / 身体缩放 / 缓慢摇曳 / 随机眨眼 / 视线漂移
 * 3. 情绪层：说话时嘴部节律开合、生气抖动、困倦下沉
 * 4. 氛围层：环绕粒子 + 表情切换时的一次性环绕彩带
 */

import React, { useEffect, useId, useMemo, useRef } from "react";
import { toGrokExpression, type OrbExpression } from "@/lib/ai/orb-expression";
import {
  BLUSH_GEOMETRY,
  EYE_GEOMETRY,
  MASCOT_BODY_PATH,
  MASCOT_EXPRESSIONS,
  MASCOT_EXPRESSION_CYCLES,
  MASCOT_FACE_PATH,
  MASCOT_HIGHLIGHT,
  MASCOT_LEAVES,
  MASCOT_LEAF_PATH,
  MASCOT_LEAF_VEIN_PATH,
  MASCOT_VIEW,
  MOUTH_GEOMETRY,
  buildEyePath,
  buildMouthPath,
  isStrokedMouth,
  type FacePose,
  type MascotTheme,
} from "./berry-mascot-data";
import {
  PARTICLE_ORBIT_MASCOT,
  TRAIL_CENTER_Y_MASCOT,
  TRAIL_CONFIGS,
  TRAIL_STOP_OFFSETS,
  clamp,
  computeTrailFrame,
  smoothstep,
  updateParticleElement,
} from "./orb-trails";

export interface BerryMascotBodyProps {
  /** 渲染尺寸（px）—— 决定细节层级与小尺寸简化 */
  size: number;
  theme: MascotTheme;
  isActive: boolean;
  expression: OrbExpression;
  paused: boolean;
  trails: boolean;
}

/* -------------------------------------------------------------------------- */
/* 姿态插值                                                                     */
/* -------------------------------------------------------------------------- */

const EXPRESSION_MORPH_DURATION = 320; // ms，跨表情切换缓动
const POSE_MORPH_DURATION = 0.72; // s，关键帧之间的变形时长
const BLINK_DURATION = 0.15; // s，单次眨眼

type NumericKey = Exclude<keyof FacePose, "mouthShape">;

const NUMERIC_KEYS: NumericKey[] = [
  "lidTop", "lidBottom", "tilt", "scaleX", "scaleY", "gazeX", "gazeY",
  "mouthCurve", "mouthOpen", "blush", "bob", "squash", "jitter", "leaf", "blinkRate",
];

interface ResolvedFrame {
  hold: number;
  base: FacePose;
  left: FacePose;
  right: FacePose;
}

/** 预计算：把左/右眼覆盖折叠成完整姿态，避免每帧展开对象 */
const RESOLVED: Record<string, ResolvedFrame[]> = (() => {
  const out: Record<string, ResolvedFrame[]> = {};
  for (const [id, frames] of Object.entries(MASCOT_EXPRESSIONS)) {
    out[id] = frames.map((f) => ({
      hold: f.hold,
      base: f.pose,
      left: { ...f.pose, ...(f.left ?? {}) },
      right: { ...f.pose, ...(f.right ?? {}) },
    }));
  }
  return out;
})();

function lerpPose(a: FacePose, b: FacePose, t: number): FacePose {
  const out = { ...a };
  for (const k of NUMERIC_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.mouthShape = t < 0.5 ? a.mouthShape : b.mouthShape;
  return out;
}

export interface SampledPose {
  base: FacePose;
  left: FacePose;
  right: FacePose;
}

/** 取表情在时刻 t 的姿态（关键帧序列循环 + 段内平滑变形） */
function sampleExpression(expr: string, t: number): SampledPose {
  const frames = RESOLVED[expr] ?? RESOLVED.natural;
  const cycle = MASCOT_EXPRESSION_CYCLES[expr] ?? MASCOT_EXPRESSION_CYCLES.natural;
  const holds = cycle.holds;

  let local = ((t % cycle.total) + cycle.total) % cycle.total;
  let i = 0;
  while (i < holds.length - 1 && local >= holds[i]) {
    local -= holds[i];
    i++;
  }
  const cur = frames[i];
  const next = frames[(i + 1) % frames.length];
  const morph = Math.min(POSE_MORPH_DURATION, cur.hold * 0.42);
  const f = smoothstep((local - (cur.hold - morph)) / morph);

  return {
    base: lerpPose(cur.base, next.base, f),
    left: lerpPose(cur.left, next.left, f),
    right: lerpPose(cur.right, next.right, f),
  };
}

function lerpSampled(a: SampledPose, b: SampledPose, t: number): SampledPose {
  return {
    base: lerpPose(a.base, b.base, t),
    left: lerpPose(a.left, b.left, t),
    right: lerpPose(a.right, b.right, t),
  };
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

/* -------------------------------------------------------------------------- */
/* 组件                                                                         */
/* -------------------------------------------------------------------------- */

const BerryMascotBody: React.FC<BerryMascotBodyProps> = ({
  size,
  theme,
  isActive,
  expression,
  paused,
  trails,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const detailed = size >= 56;
  const showBlush = size >= 32;
  const trailsEnabled = trails && size >= 72;

  /** 状态别名（idle/thinking/…）→ 12 种姿态 */
  const target = toGrokExpression(expression);

  const initial = useMemo(() => sampleExpression(target, 0), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── refs：rAF 每帧写入 ──
  const bodyRef = useRef<SVGGElement>(null);
  const glossRef = useRef<SVGGElement>(null);
  const leafRefs = useRef<Array<SVGGElement | null>>([]);
  const blushRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGPathElement>(null);
  const rightEyeRef = useRef<SVGPathElement>(null);
  const mouthRef = useRef<SVGPathElement>(null);
  const particleRefs = useRef<Array<SVGCircleElement | null>>([]);
  const trailBackRefs = useRef<Array<SVGPathElement | null>>([]);
  const trailFrontRefs = useRef<Array<SVGPathElement | null>>([]);
  const trailGradientRefs = useRef<Array<SVGLinearGradientElement | null>>([]);
  const trailStopRefs = useRef<Array<Array<SVGStopElement | null>>>([]);

  const exprStateRef = useRef({ from: target, to: target, start: -1 });
  const trailStartRef = useRef(-1);
  const lastTrailRef = useRef(0);
  const staticRef = useRef(false);
  const activeRef = useRef(isActive);
  const trailsRef = useRef(trailsEnabled);
  const baseTimeRef = useRef(0);
  const blinkRef = useRef({ at: 2.4, start: -1, next: 0 });

  useEffect(() => {
    staticRef.current = paused;
  }, [paused]);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    trailsRef.current = trailsEnabled;
  }, [trailsEnabled]);

  // 表情切换：记录 from/to 与切换时刻，并触发环绕彩带（2.5s 防抖）
  useEffect(() => {
    const st = exprStateRef.current;
    if (st.to !== target) {
      st.from = st.to;
      st.to = target;
      st.start = performance.now();
      const now = performance.now();
      if (trailsRef.current && now - lastTrailRef.current > 2500) {
        trailStartRef.current = now;
        lastTrailRef.current = now;
      }
    }
  }, [target]);

  useEffect(() => {
    baseTimeRef.current = performance.now();
    trailStartRef.current = performance.now();
    lastTrailRef.current = performance.now();

    const f = (n: number) => n.toFixed(2);

    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const staticMode = staticRef.current;
      const t = staticMode ? 0 : (now - baseTimeRef.current) / 1000;

      // ── 1. 表情层：跨表情过渡 ──
      const st = exprStateRef.current;
      let tp = 1;
      if (st.start >= 0 && !staticMode) {
        const e = (now - st.start) / EXPRESSION_MORPH_DURATION;
        tp = e >= 1 ? 1 : expressionEasing(e);
      }
      const posed = lerpSampled(
        sampleExpression(st.from, t),
        sampleExpression(st.to, t),
        tp
      );
      const body = posed.base;
      const leftEye = posed.left;
      const rightEye = posed.right;

      // ── 2. 自然层：呼吸 / 摇曳 / 视线漂移 / 眨眼 ──
      const breathPhase = (Math.PI * 2 * t) / 4.6;
      const bob = body.bob - 1.5 * Math.sin(breathPhase);
      const squash = body.squash * (1 + 0.011 * Math.sin(breathPhase + Math.PI / 2));
      const bodyTilt = 1.05 * Math.sin((Math.PI * 2 * t) / 11.3);

      const bx = body.jitter * 1.7 * Math.sin(t * 36.7);
      const by = body.jitter * 1.1 * Math.cos(t * 43.3);

      // 眨眼（间隔随表情的 blinkRate 变化）
      const b = blinkRef.current;
      let blink = 0;
      if (!staticMode) {
        if (b.start < 0 && t >= b.at) b.start = t;
        if (b.start >= 0) {
          const e = (t - b.start) / BLINK_DURATION;
          if (e >= 1) {
            b.start = -1;
            b.at = t + (2.2 + Math.random() * 3.2) * body.blinkRate;
          } else {
            blink = e < 0.5 ? smoothstep(e * 2) : smoothstep((1 - e) * 2);
          }
        }
      }

      const driftX = 1.25 * Math.sin(t * 0.61) + 0.45 * Math.sin(t * 1.37 + 0.9);
      const driftY = 0.85 * Math.sin(t * 0.47 + 1.4);

      // ── 3. 情绪层：说话嘴部节律 ──
      const talkGain = st.to === "playful" ? clamp(tp, 0, 1) : 0;
      const talkOpen = talkGain * 0.34 * (0.5 + 0.5 * Math.sin(t * 11.7)) * (staticMode ? 0 : 1);

      // ── 写入身体（translate/rotate/scale 全部围绕果体中心） ──
      const bodyCx = 114.2705;
      const bodyCy = 136;
      bodyRef.current?.setAttribute(
        "transform",
        `translate(${f(bodyCx + bx)} ${f(bodyCy + bob + by)}) ` +
          `rotate(${f(bodyTilt)}) ` +
          `scale(${squash.toFixed(4)} ${(1 / squash).toFixed(4)}) ` +
          `translate(${f(-bodyCx)} ${f(-bodyCy)})`
      );

      // ── 叶子摆动 ──
      for (let i = 0; i < MASCOT_LEAVES.length; i++) {
        const leaf = MASCOT_LEAVES[i];
        const el = leafRefs.current[i];
        if (!el) continue;
        const wobble = leaf.amp * body.leaf * Math.sin((Math.PI * 2 * t) / leaf.period + leaf.phase);
        el.setAttribute(
          "transform",
          `translate(${leaf.x} ${leaf.y}) rotate(${(leaf.rotate + wobble).toFixed(3)}) scale(${leaf.scale})`
        );
      }

      // ── 高光随呼吸微动 ──
      glossRef.current?.setAttribute(
        "transform",
        `translate(${f(-0.9 + 1.1 * Math.sin(breathPhase))} ${f(0.6 * Math.sin(breathPhase + 0.7))})`
      );

      // ── 腮红 ──
      if (blushRef.current) {
        const blush = clamp(body.blush + 0.06 * Math.sin(t * 1.1), 0, 1);
        blushRef.current.setAttribute("opacity", blush.toFixed(3));
      }

      // ── 眼睛：path（眼睑/眼角）+ transform（注视/缩放/眨眼） ──
      const eyePathOf = (p: FacePose) =>
        buildEyePath({ lidTop: p.lidTop, lidBottom: p.lidBottom, tilt: p.tilt });

      leftEyeRef.current?.setAttribute("d", eyePathOf(leftEye));
      rightEyeRef.current?.setAttribute("d", eyePathOf(rightEye));

      const openScale = 1 - 0.93 * blink;
      const ly = EYE_GEOMETRY.cy + leftEye.gazeY + driftY;
      const ry = EYE_GEOMETRY.cy + rightEye.gazeY + driftY;
      leftEyeRef.current?.setAttribute(
        "transform",
        `translate(${f(EYE_GEOMETRY.leftCx + leftEye.gazeX + driftX)} ${f(ly)}) ` +
          `scale(${(-leftEye.scaleX).toFixed(4)} ${(leftEye.scaleY * openScale).toFixed(4)})`
      );
      rightEyeRef.current?.setAttribute(
        "transform",
        `translate(${f(EYE_GEOMETRY.rightCx + rightEye.gazeX + driftX)} ${f(ry)}) ` +
          `scale(${rightEye.scaleX.toFixed(4)} ${(rightEye.scaleY * openScale).toFixed(4)})`
      );

      // ── 嘴巴（形状切换时同步切换填充 / 描边） ──
      if (mouthRef.current) {
        const stroked = isStrokedMouth(body.mouthShape);
        mouthRef.current.setAttribute(
          "d",
          buildMouthPath(body.mouthShape, body.mouthCurve, clamp(body.mouthOpen + talkOpen, 0, 1))
        );
        mouthRef.current.setAttribute("fill", stroked ? "none" : ink);
        mouthRef.current.setAttribute("stroke", stroked ? ink : "none");
        mouthRef.current.setAttribute("stroke-width", stroked ? "2.6" : "0");
      }

      // ── 4. 氛围层：粒子 ──
      const boost = activeRef.current ? 1.15 : 0.85;
      updateParticleElement(particleRefs.current[0] ?? null, PARTICLE_ORBIT_MASCOT, t * PARTICLE_ORBIT_MASCOT.speed + 0.42, boost);
      updateParticleElement(particleRefs.current[1] ?? null, PARTICLE_ORBIT_MASCOT, t * PARTICLE_ORBIT_MASCOT.speed + 0.42 + Math.PI, boost);

      // ── 彩带 ──
      if (trailsRef.current) {
        const trailT = staticMode ? -1 : (now - trailStartRef.current) / 1000;
        for (let i = 0; i < TRAIL_CONFIGS.length; i++) {
          const frame = computeTrailFrame(trailT, TRAIL_CONFIGS[i], TRAIL_CENTER_Y_MASCOT);
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
            gradient.setAttribute("x1", f(frame.gradient.x1));
            gradient.setAttribute("y1", f(frame.gradient.y1));
            gradient.setAttribute("x2", f(frame.gradient.x2));
            gradient.setAttribute("y2", f(frame.gradient.y2));
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
  }, []);

  const ink = theme.ink;
  const strokedInitial = isStrokedMouth(initial.base.mouthShape);

  return (
    <svg
      viewBox={`0 0 ${MASCOT_VIEW} ${MASCOT_VIEW}`}
      width="100%"
      height="100%"
      style={{ overflow: "visible", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        {/* 果体主渐变：左上光源 → 中调 → 底部深色 */}
        <radialGradient id={`${uid}-body`} cx="32%" cy="24%" r="86%">
          <stop offset="0%" stopColor={theme.body[0]} />
          <stop offset="46%" stopColor={theme.bodyMid} />
          <stop offset="100%" stopColor={theme.body[1]} />
        </radialGradient>
        {/* 左上柔光 */}
        <radialGradient id={`${uid}-gloss`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.gloss} />
          <stop offset="55%" stopColor={theme.gloss} stopOpacity="0.42" />
          <stop offset="100%" stopColor={theme.gloss} stopOpacity="0" />
        </radialGradient>
        {/* 叶子 */}
        <linearGradient id={`${uid}-leaf`} x1="0.25" y1="1" x2="0.75" y2="0">
          <stop offset="0%" stopColor={theme.leaf[0]} />
          <stop offset="100%" stopColor={theme.leaf[1]} />
        </linearGradient>
        {/* 面罩内侧渐隐 */}
        <linearGradient id={`${uid}-face`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={theme.faceRim} stopOpacity="0.85" />
          <stop offset="34%" stopColor={theme.face} />
          <stop offset="100%" stopColor={theme.face} />
        </linearGradient>
        <radialGradient id={`${uid}-blush`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.blush} stopOpacity="0.65" />
          <stop offset="100%" stopColor={theme.blush} stopOpacity="0" />
        </radialGradient>
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
      <circle
        fill={theme.particle}
        opacity={0}
        ref={(el) => {
          particleRefs.current[0] = el;
        }}
      />
      <circle
        fill={theme.particle}
        opacity={0}
        ref={(el) => {
          particleRefs.current[1] = el;
        }}
      />

      {/* ── 吉祥物本体 ── */}
      <g ref={bodyRef}>
        {/* 果体 */}
        <path
          d={MASCOT_BODY_PATH}
          fill={`url(#${uid}-body)`}
          stroke={theme.bodyRim}
          strokeWidth={1.4}
        />
        {/* 左上柔光（大 + 小两层，模拟 logo 的球面高光） */}
        <g ref={glossRef}>
          <ellipse
            cx={MASCOT_HIGHLIGHT.cx}
            cy={MASCOT_HIGHLIGHT.cy}
            rx={MASCOT_HIGHLIGHT.rx}
            ry={MASCOT_HIGHLIGHT.ry}
            transform={`rotate(${MASCOT_HIGHLIGHT.rotate} ${MASCOT_HIGHLIGHT.cx} ${MASCOT_HIGHLIGHT.cy})`}
            fill={`url(#${uid}-gloss)`}
          />
          {detailed && (
            <ellipse
              cx={MASCOT_HIGHLIGHT.cx - 8}
              cy={MASCOT_HIGHLIGHT.cy - 6}
              rx={15}
              ry={9.5}
              transform={`rotate(${MASCOT_HIGHLIGHT.rotate} ${MASCOT_HIGHLIGHT.cx - 8} ${MASCOT_HIGHLIGHT.cy - 6})`}
              fill="#FFFFFF"
              opacity={0.42}
            />
          )}
        </g>

        {/* 三片绿叶 */}
        {MASCOT_LEAVES.map((leaf, i) => (
          <g
            key={i}
            ref={(el) => {
              leafRefs.current[i] = el;
            }}
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.scale})`}
          >
            <path d={MASCOT_LEAF_PATH} fill={`url(#${uid}-leaf)`} fillOpacity={0.82 + leaf.tone * 0.18} />
            {detailed && (
              <path
                d={MASCOT_LEAF_VEIN_PATH}
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.34"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}

        {/* 面罩 */}
        <path
          d={MASCOT_FACE_PATH}
          fill={`url(#${uid}-face)`}
          stroke={theme.faceRim}
          strokeWidth={1.3}
        />

        {/* 腮红 */}
        {showBlush && (
          <g ref={blushRef} opacity={initial.base.blush}>
            <ellipse
              cx={BLUSH_GEOMETRY.leftCx}
              cy={BLUSH_GEOMETRY.cy}
              rx={BLUSH_GEOMETRY.rx}
              ry={BLUSH_GEOMETRY.ry}
              fill={`url(#${uid}-blush)`}
            />
            <ellipse
              cx={BLUSH_GEOMETRY.rightCx}
              cy={BLUSH_GEOMETRY.cy}
              rx={BLUSH_GEOMETRY.rx}
              ry={BLUSH_GEOMETRY.ry}
              fill={`url(#${uid}-blush)`}
            />
          </g>
        )}

        {/* 眼睛（左眼镜像复用同一路径） */}
        <path
          ref={leftEyeRef}
          d={buildEyePath({ lidTop: initial.left.lidTop, lidBottom: initial.left.lidBottom, tilt: initial.left.tilt })}
          transform={`translate(${EYE_GEOMETRY.leftCx} ${EYE_GEOMETRY.cy}) scale(${-initial.left.scaleX} ${initial.left.scaleY})`}
          fill={ink}
        />
        <path
          ref={rightEyeRef}
          d={buildEyePath({ lidTop: initial.right.lidTop, lidBottom: initial.right.lidBottom, tilt: initial.right.tilt })}
          transform={`translate(${EYE_GEOMETRY.rightCx} ${EYE_GEOMETRY.cy}) scale(${initial.right.scaleX} ${initial.right.scaleY})`}
          fill={ink}
        />

        {/* 嘴巴 */}
        <path
          ref={mouthRef}
          d={buildMouthPath(initial.base.mouthShape, initial.base.mouthCurve, initial.base.mouthOpen)}
          transform={`translate(${MOUTH_GEOMETRY.cx} ${MOUTH_GEOMETRY.cy})`}
          fill={strokedInitial ? "none" : ink}
          stroke={strokedInitial ? ink : "none"}
          strokeWidth={strokedInitial ? 2.6 : 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
  );
};

export default BerryMascotBody;
