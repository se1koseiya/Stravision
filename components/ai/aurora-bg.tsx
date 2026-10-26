"use client"

/**
 * AuroraBg —— 对话区的「流动雾」WebGL 背景（2026-10-22）
 *
 * ── 为什么不用 CSS 做 ──
 *   参考稿的背景是一块全屏 canvas（WebGL 用片元着色器实时绘制），
 *   不是 CSS 渐变。CSS radial 能做到「形状和浓度」，但做不到「雾在有机地翻涌」——
 *   给 background 加 animation 只能整体平移/缩放，看起来是一块固定图案在滑，
 *   而不是一团雾在呼吸。
 *
 * ── 实现要点（为什么这么写）──
 *   ① 全屏 quad + 片元着色器：只有 2 个三角形，几何开销≈0，成本全在像素。
 *   ② 三团高斯光斑（exp(-d²)）而不是 radial-gradient 的锥形衰减 ——
 *      高斯没有边界，任何 scale/位移都不会露出"边缘"，这也是「无边界雾」的技术本体。
 *   ③ 三层 fbm 值噪声做两件事：扰动光斑边界（不让它像几何圆）+ 轻微调制浓度（不死板）。
 *      只做 3 个 octave：4 个以上肉眼看不出差别，开销翻倍。
 *   ④ **半分辨率渲染**（scale 默认 0.5，配 CSS 拉伸）：雾本身是模糊的，
 *      半分辨率在视觉上看不出差别，像素开销直接降到 1/4。
 *      点阵不在这里画 —— 网格纹需要锐利，交给 CSS 那一层（.pb-aura-dots），两边都最省。
 *   ⑤ 30fps 上限：雾的周期是几十秒，60fps 是纯浪费电。
 *   ⑥ 卸载必须彻底：dispose + forceContextLoss。浏览器同时存活的 WebGL 上下文有上限（通常 16 个），
 *      反复进出对话页不释放，最后会把整页的 canvas 一起拖死。
 *
 * ── 颜色 ──
 *   亮：#16F294（从参考图实测反解出的叠加色，白底上峰值 alpha ≈ .20）
 *   暗：#10B981 降饱和提亮（暗底上青绿会发荧光，直接照搬会脏）
 *
 * ⚠️ 用作背景层时父容器负责 pointerEvents:none —— 本组件不接任何指针事件。
 * ⚠️ 本组件铺满父容器，定位由父容器负责。
 */

import { useEffect, useRef } from "react"
import * as THREE from "three"

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;
uniform float uTone;   // 0 = light, 1 = dark

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

float blob(vec2 uv, vec2 c, vec2 r) {
  vec2 d = (uv - c) / r;
  return exp(-dot(d, d) * 2.0);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = uTime * 0.055;

  /* 有机扰动：光斑边界被噪声推着走，才不会露出"几何圆"的形状 */
  float warp = fbm(p * 1.6 + vec2(t * 0.9, -t * 0.6)) - 0.5;
  vec2 uv2 = uv + warp * vec2(0.055, 0.042);

  /* 三团：主团压在顶部中间（与参考稿一致），左右各一小团制造不对称 */
  vec2 c1 = vec2(0.50 + 0.055 * sin(t * 0.83), 1.03 + 0.035 * cos(t * 0.61));
  vec2 c2 = vec2(0.14 + 0.045 * cos(t * 0.97), 0.97 + 0.050 * sin(t * 0.72));
  vec2 c3 = vec2(0.86 + 0.040 * sin(t * 0.88), 1.00 + 0.045 * cos(t * 0.66));

  float b = blob(uv2, c1, vec2(0.46, 0.62)) * 1.00
          + blob(uv2, c2, vec2(0.30, 0.40)) * 0.55
          + blob(uv2, c3, vec2(0.28, 0.38)) * 0.45;

  b = clamp(b, 0.0, 1.0);
  /* 浓度上再叠一层慢速噪声：同一片雾不同位置厚薄不一，才像雾而不是一块色板 */
  b *= 0.84 + 0.32 * fbm(p * 2.4 - vec2(t * 1.2, t * 0.8));
  b = clamp(b, 0.0, 1.0);

  vec3 colLight = vec3(0.086, 0.949, 0.580);  // #16F294
  vec3 colDark  = vec3(0.063, 0.725, 0.506);  // #10B981
  vec3 col = mix(colLight, colDark, uTone);

  /* 峰值 alpha 不是随手取的 —— 是拿截图反解的：
     亮色参考稿顶部最浓处 (220,253,239)，底 (250,250,250)，叠加色 (22,242,148)
       ⇒ 250 - 228a = 220 ⇒ a ≈ .13；实测先取 .20 时峰值落到 (208,249,231)，比参考浓约 40%，
       收到 .17（fbm 调制会让峰值在 .14~.20 之间浮动，取中值刚好贴着参考）。
     暗色没有参考图，按"在 #08080A 上 faint 但看得见"取 .24（青绿在近黑底上极易发荧光，宁淡不浓）。 */
  float alpha = b * mix(0.17, 0.24, uTone);

  gl_FragColor = vec4(col, alpha);
}
`

export interface AuroraBgProps {
  /** light / dark —— 只影响配色与浓度，不重建渲染器 */
  tone?: "light" | "dark"
  /** 渲染倍率（相对 CSS 尺寸）。雾是模糊的，0.5 视觉无差、开销 1/4 */
  scale?: number
  /** 帧率上限。雾的周期是几十秒，30 足够 */
  fps?: number
  className?: string
}

export function AuroraBg({ tone = "light", scale = 0.5, fps = 30, className }: AuroraBgProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const uniformsRef = useRef<{ uTime: { value: number }; uTone: { value: number } } | null>(null)

  /* tone 变化只改 uniform，不重建 WebGL（重建会黑一帧 + 重新申请上下文） */
  useEffect(() => {
    if (uniformsRef.current) uniformsRef.current.uTone.value = tone === "dark" ? 1 : 0
  }, [tone])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let raf = 0
    let disposed = false
    let lastFrame = 0

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
      /* 背景层不需要保留绘制缓冲 */
      preserveDrawingBuffer: false,
    })
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%"
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTone: { value: tone === "dark" ? 1 : 0 },
    }
    uniformsRef.current = uniforms as never
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const quad = new THREE.Mesh(geometry, material)
    scene.add(quad)

    const resize = () => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      /* updateStyle = false：canvas 的 CSS 尺寸由上面的内联样式固定为 100%，
         只改绘制缓冲 —— 半分辨率靠的就是"绘制缓冲小、显示尺寸大"这个错配。 */
      renderer.setSize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), false)
      uniforms.uRes.value.set(w, h)
      renderer.render(scene, camera)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const start = performance.now()
    const frameMs = 1000 / Math.max(1, fps)

    const loop = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(loop)
      if (now - lastFrame < frameMs) return
      lastFrame = now
      uniforms.uTime.value = (now - start) / 1000
      renderer.render(scene, camera)
    }

    /* 尊重「减少动态效果」：只画第一帧（雾还在，但不动） */
    if (!reduceMotion) raf = requestAnimationFrame(loop)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      /* 上下文必须显式丢弃：浏览器同时存活的 WebGL 上下文有上限，
         反复进出对话页不释放会把其它 canvas（如监控页 3D）一起拖死。 */
      renderer.forceContextLoss?.()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
      uniformsRef.current = null
    }
    // scale / fps 是"构造成本"级别的参数，改它们宁可重建
  }, [scale, fps])

  return <div ref={hostRef} className={className} aria-hidden />
}

export default AuroraBg
