'use client'

/* ============================================================
   3D 工牌（Lanyard）
   ------------------------------------------------------------
   移植 React Bits 的 <Lanyard />（three + @react-three/fiber +
   @react-three/drei + @react-three/rapier + meshline），做了 5 处
   适配 / 改造：

   1. Next.js 没有 Vite 的资源导入，card.glb 走 public 下的 URL；
      `.glb` 里 2.29MB 的图集被压成 64×64（2.4MB → 163KB），卡面图案
      改由 Canvas 现画（见 cardMap），画布宽高比按「面部 UV 矩形比例
      == 卡面几何比例」反推，贴上去不拉伸。挂绳用纯黑纯色，不挂贴图
      （省一次请求，也免得被浏览器缓存住旧颜色）。
   2. 一个 Canvas + 每块工牌一个独立 Physics world。放在同一个
      world 里的话，三块卡的碰撞体会互相挤压把对方弹飞，所以隔离。
   3. 支持 layout='row' | 'stack'（并排 / 堆叠）与 align（居中 / 靠右），
      相机按容器实际宽高比自动取景，三块牌永远完整在框内。
   4. 拖拽改成「把指针射线投到过卡片的固定平面上」。原版是把
      unproject 的点沿视线再推 camera.position.length() 那么远，
      相机距离一变（我们比原 demo 近得多）拖起来就会失控乱飞。
   5. 只有滚进视口才挂载 Canvas，避免首屏就去初始化 wasm / WebGL。
   ============================================================ */

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF, useTexture } from '@react-three/drei'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import * as THREE from 'three'

import './lanyard.css'

extend({ MeshLineGeometry, MeshLineMaterial })

const CARD_URL = '/lanyard/card.glb'

/** 1×1 透明像素：让 useTexture 可以无条件调用 */
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/* 工牌模型正面映射到图集左半边、背面映射到右半边（量自 card.glb） */
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 }
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 }

/* 面部矩形宽高比 = 0.5W / 0.755H，让它等于卡面几何宽高比 0.7164 */
const ATLAS_H = 1536
const ATLAS_W = Math.round(ATLAS_H * 1.0817)

/* 卡面几何尺寸（量自 card.glb） */
const CARD_W_UNIT = 0.7164
const CARD_H_UNIT = 1.0
/** 球形关节锚点相对卡体中心的高度偏移 */
const JOINT_LIFT = 1.5

/** 并排布局的横向间距 */
const ROW_GAP = 1.85
/** 堆叠布局：横向错位 + 纵深错位（制造前后层次） */
const STACK_GAP = 1.15
const STACK_DEPTH = 0.42

/** meshLineMaterial 的构造参数（保持同一引用，免得 R3F 每次渲染都重建材质） */
const ML_ARGS: any = [{}]

export type LanyardFace = {
  /** 正面图（public 路径或任意 URL） */
  front: string
  /** 背面图；不传则与正面相同 */
  back?: string
  /** 无障碍名称 */
  alt?: string
  /** 覆盖默认摆位 */
  x?: number
  z?: number
  /** 覆盖默认绳长 */
  rope?: number
}

export type LanyardSceneProps = {
  faces: LanyardFace[]
  /** row = 并排；stack = 堆叠（互相叠压 + 前后错开） */
  layout?: 'row' | 'stack'
  /** 整组工牌在本容器里的对齐方式 */
  align?: 'center' | 'right'
  /** 悬挂点高度（世界单位） */
  anchorY?: number
  /** 每段绳长；总绳长 = 3 × rope */
  rope?: number
  /** 卡面缩放 */
  cardScale?: number
  /** 视场角 */
  fov?: number
  /** 横向额外留白（世界单位） */
  marginX?: number
  /** 挂绳线宽（NDC 单位，约 1 ≈ 8px） */
  lineWidth?: number
  /** 图片填充方式 */
  imageFit?: 'cover' | 'contain'
  /** 面部底色（图片透明处会露出它） */
  faceBg?: string
  className?: string
}

export default function LanyardScene({
  faces,
  layout = 'row',
  align = 'center',
  anchorY = 1.75,
  rope = 0.2,
  cardScale = 2.25,
  fov = 16,
  marginX = 0.7,
  lineWidth = 1,
  imageFit = 'cover',
  faceBg = '#FFFFFF',
  className,
}: LanyardSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  /* 只在进入视口后才创建 WebGL 上下文 */
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true)
          io.disconnect()
        }
      },
      { rootMargin: '240px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* 每块工牌的摆位 */
  const placements = useMemo(() => {
    const n = faces.length
    const stacked = layout === 'stack'
    return faces.map((f, i) => {
      const c = i - (n - 1) / 2
      return {
        x: f.x ?? c * (stacked ? STACK_GAP : ROW_GAP),
        z: f.z ?? (stacked ? c * STACK_DEPTH : 0),
        rope: f.rope ?? rope,
      }
    })
  }, [faces, layout, rope])

  /* 取景：横向装得下全部工牌，纵向装得下「挂绳 + 卡面」 */
  const framing = useMemo(() => {
    const cardW = CARD_W_UNIT * cardScale
    const cardH = CARD_H_UNIT * cardScale
    const xs = placements.map((p) => p.x)
    const left = Math.min(...xs) - cardW / 2
    const right = Math.max(...xs) + cardW / 2
    const maxRope = Math.max(...placements.map((p) => p.rope))
    const cardCenterY = anchorY - maxRope * 3 - JOINT_LIFT
    const topY = anchorY + 0.24
    const bottomY = cardCenterY - cardH / 2 - 0.3
    return {
      left,
      right,
      spanX: right - left + marginX * 2,
      needH: topY - bottomY,
      centerY: (topY + bottomY) / 2,
    }
  }, [placements, cardScale, anchorY, marginX])

  return (
    <div ref={hostRef} className={`berry-lanyard ${className ?? ''}`}>
      {mounted ? (
        <Canvas
          camera={{ position: [0, framing.centerY, 12], fov }}
          dpr={[1, isMobile ? 1.5 : 2]}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
        >
          <FitCamera framing={framing} align={align} fov={fov} marginX={marginX} />
          <ambientLight intensity={Math.PI} />

          <Suspense fallback={null}>
            {/* 每块工牌一个独立 world：否则碰撞体会互撞把彼此弹飞 */}
            {placements.map((p, i) => (
              <Physics
                key={`${faces[i].front}-${i}`}
                gravity={[0, -40, 0]}
                timeStep={isMobile ? 1 / 30 : 1 / 60}
              >
                <LanyardBand
                  origin={[p.x, anchorY, p.z]}
                  rope={p.rope}
                  cardScale={cardScale}
                  isMobile={isMobile}
                  lineWidth={lineWidth}
                  imageFit={imageFit}
                  faceBg={faceBg}
                  frontImage={faces[i].front}
                  backImage={faces[i].back ?? faces[i].front}
                />
              </Physics>
            ))}

            {/* 影棚灯：只服务于金属扣件的高光，全在内存里生成，不拉 HDR 文件。
                卡面用的是 basic 材质，完全不受这里影响。 */}
            <Environment blur={0.75}>
              <Lightformer intensity={1.4} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
              <Lightformer intensity={1.8} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
              <Lightformer intensity={1.8} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
              <Lightformer intensity={5} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
            </Environment>
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ */

/**
 * 按容器实际宽高比反推相机距离：
 *   可见高度 = max(横向所需跨度 / 宽高比, 纵向所需高度)
 * 对齐靠右时把视野窗口右侧贴到内容右边界 + 留白。
 */
function FitCamera({
  framing,
  align,
  fov,
  marginX,
}: {
  framing: { left: number; right: number; spanX: number; needH: number; centerY: number }
  align: 'center' | 'right'
  fov: number
  marginX: number
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const visibleH = Math.max(framing.spanX / aspect, framing.needH)
    const visibleW = visibleH * aspect
    const camX =
      align === 'right'
        ? framing.right + marginX - visibleW / 2
        : (framing.left + framing.right) / 2
    const z = visibleH / (2 * Math.tan((fov * Math.PI) / 360))
    camera.position.set(camX, framing.centerY, z)
    camera.near = Math.max(0.1, z - 6)
    camera.far = z + 30
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, framing, align, fov, marginX])

  return null
}

/* ------------------------------------------------------------ */

type LanyardBandProps = {
  origin: [number, number, number]
  rope: number
  cardScale: number
  isMobile: boolean
  lineWidth: number
  imageFit: 'cover' | 'contain'
  faceBg: string
  frontImage: string
  backImage: string
}

function LanyardBand({
  origin,
  rope,
  cardScale,
  isMobile,
  lineWidth,
  imageFit,
  faceBg,
  frontImage,
  backImage,
}: LanyardBandProps) {
  const band = useRef<THREE.Mesh>(null)
  const fixed = useRef<any>(null)
  const j1 = useRef<any>(null)
  const j2 = useRef<any>(null)
  const j3 = useRef<any>(null)
  const card = useRef<any>(null)

  const vec = useMemo(() => new THREE.Vector3(), [])
  const ang = useMemo(() => new THREE.Vector3(), [])
  const rot = useMemo(() => new THREE.Vector3(), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const dragPlane = useMemo(() => new THREE.Plane(), [])
  const normal = useMemo(() => new THREE.Vector3(), [])
  /** 抓取点相对卡体中心的偏移 */
  const dragOffset = useRef<THREE.Vector3 | null>(null)

  const segmentProps = {
    type: 'dynamic' as const,
    canSleep: true,
    colliders: false as const,
    angularDamping: 4,
    linearDamping: 4,
  }

  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const { nodes, materials } = useGLTF(CARD_URL) as any
  const frontTex = useTexture(frontImage || BLANK_PIXEL)
  const backTex = useTexture(backImage || BLANK_PIXEL)

  const [ox, oy, oz] = origin
  const seg = rope
  /** 静止时就留出松弛量，落下后是自然垂坠而不是绷直的直线 */
  const step = seg * 0.5

  const [dragging, setDragging] = useState(false)
  const [hovered, hover] = useState(false)

  /* 把正/背面图案画进卡面贴图 */
  const cardMap = useMemo(() => {
    const baseMap = materials?.base?.map
    if (typeof document === 'undefined') return baseMap

    const canvas = document.createElement('canvas')
    canvas.width = ATLAS_W
    canvas.height = ATLAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return baseMap

    // 整张铺底：卡片那 0.004 厚的侧边也会采样到
    ctx.fillStyle = faceBg
    ctx.fillRect(0, 0, ATLAS_W, ATLAS_H)

    const drawFace = (img: HTMLImageElement | undefined, rect: typeof FRONT_UV_RECT) => {
      if (!img || !img.width || !img.height) return
      const rx = rect.x * ATLAS_W
      const ry = rect.y * ATLAS_H
      const rw = rect.w * ATLAS_W
      const rh = rect.h * ATLAS_H
      ctx.save()
      ctx.beginPath()
      ctx.rect(rx, ry, rw, rh)
      ctx.clip()
      ctx.fillStyle = faceBg
      ctx.fillRect(rx, ry, rw, rh)
      const pick = imageFit === 'contain' ? Math.min : Math.max
      const scale = pick(rw / img.width, rh / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, rx + (rw - dw) / 2, ry + (rh - dh) / 2, dw, dh)
      ctx.restore()
    }

    drawFace(frontTex?.image as HTMLImageElement, FRONT_UV_RECT)
    drawFace(backTex?.image as HTMLImageElement, BACK_UV_RECT)

    const composite = new THREE.CanvasTexture(canvas)
    composite.colorSpace = THREE.SRGBColorSpace
    composite.flipY = baseMap?.flipY ?? false
    composite.anisotropy = 8
    composite.needsUpdate = true
    return composite
  }, [frontTex, backTex, imageFit, faceBg, materials])

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  )

  useRopeJoint(fixed, j1, [
    [0, 0, 0],
    [0, 0, 0],
    seg,
  ])
  useRopeJoint(j1, j2, [
    [0, 0, 0],
    [0, 0, 0],
    seg,
  ])
  useRopeJoint(j2, j3, [
    [0, 0, 0],
    [0, 0, 0],
    seg,
  ])
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, JOINT_LIFT, 0],
  ])

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = dragging ? 'grabbing' : 'grab'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered, dragging])

  const beginDrag = (e: any) => {
    const t = card.current?.translation()
    if (!t) return
    e.target?.setPointerCapture?.(e.pointerId)
    // 拖拽平面：过卡片当前所在位置、正对相机（拖拽全程固定，不会追着卡片跑）
    camera.getWorldDirection(normal)
    dragPlane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(t.x, t.y, t.z))
    const hit = new THREE.Vector3()
    if (!e.ray || !e.ray.intersectPlane(dragPlane, hit)) hit.set(e.point.x, e.point.y, e.point.z)
    dragOffset.current = hit.sub(new THREE.Vector3(t.x, t.y, t.z))
    setDragging(true)
  }

  const endDrag = (e: any) => {
    e.target?.releasePointerCapture?.(e.pointerId)
    dragOffset.current = null
    setDragging(false)
    // 松手时把速度收一收，避免甩完还在空中乱撞
    if (card.current) {
      const v = card.current.linvel()
      const speed = Math.hypot(v.x, v.y, v.z)
      const k = speed > 9 ? 9 / speed : 1
      card.current.setLinvel({ x: v.x * k, y: v.y * k, z: v.z * k }, true)
      card.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  }

  useFrame((state, delta) => {
    if (dragging && card.current && dragOffset.current) {
      raycaster.setFromCamera(state.pointer, state.camera)
      if (raycaster.ray.intersectPlane(dragPlane, vec)) {
        vec.sub(dragOffset.current)
        ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
        card.current.setNextKinematicTranslation({ x: vec.x, y: vec.y, z: vec.z })
      }
      return
    }

    if (!fixed.current || !card.current || !j1.current || !j2.current || !j3.current) return

    ;[j1, j2].forEach((ref) => {
      if (!ref.current) return
      if (!ref.current.lerped) {
        ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
      }
      const clampedDistance = Math.max(
        0.1,
        Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
      )
      ref.current.lerped.lerp(ref.current.translation(), delta * (clampedDistance * 50))
    })

    if (band.current) {
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(j2.current.lerped)
      curve.points[2].copy(j1.current.lerped)
      curve.points[3].copy(fixed.current.translation())
      ;(band.current.geometry as any).setPoints(curve.getPoints(isMobile ? 16 : 32))
    }

    ang.copy(card.current.angvel())
    rot.copy(card.current.rotation())
    // 让工牌自然回正，不会一直转个不停
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
  })

  curve.curveType = 'chordal'

  return (
    <>
      <RigidBody ref={fixed} {...segmentProps} type="fixed" position={[ox, oy, oz]} />
      <RigidBody ref={j1} {...segmentProps} position={[ox + step, oy, oz]}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody ref={j2} {...segmentProps} position={[ox + step * 2, oy, oz]}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody ref={j3} {...segmentProps} position={[ox + step * 3, oy, oz]}>
        <BallCollider args={[0.1]} />
      </RigidBody>

      <RigidBody
        ref={card}
        {...segmentProps}
        position={[ox + step * 4, oy, oz]}
        type={dragging ? 'kinematicPosition' : 'dynamic'}
      >
        <CuboidCollider args={[0.8, 1.125, 0.01]} />
        <group
          scale={cardScale}
          position={[0, -1.2, -0.05]}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
          onPointerUp={endDrag}
          onPointerDown={beginDrag}
        >
          {/* 卡面：完全哑光 + 不参与环境反射 + 不做色调映射。
              这样卡面颜色 = 立绘原图颜色，不会出现高光扫过、过曝发灰。 */}
          <mesh geometry={nodes.card.geometry}>
            <meshBasicMaterial map={cardMap} map-anisotropy={8} toneMapped={false} />
          </mesh>
          <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
          <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
        </group>
      </RigidBody>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={ML_ARGS}
          color="#000000"
          depthTest={false}
          resolution={[size.width, size.height]}
          lineWidth={lineWidth}
        />
      </mesh>
    </>
  )
}
