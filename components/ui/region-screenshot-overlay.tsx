"use client"

/**
 * 划选截图遮罩（2026-10-14）
 *
 * 交互就是用户最熟的那套（微信 / QQ 截图）：
 *   点截图 → 整个页面**冻住并变暗** → 按住左键拖拽划一块 → 双击（或点 ✓）截那一块。
 *   Esc / 点 ✗ 取消；框太小（< 10px）当成误点，自动清掉让你重划，而不是退出截图。
 *
 * ## 为什么先拍底图、而不是让用户对着"活的页面"划
 * 划选期间鼠标要一直按着，页面一旦因为 hover / 动画 / 数据刷新而变样，
 * 框选的区域和最后截出来的内容就对不上了。所以先把页面拍成一张图铺在遮罩上，
 * 让用户对着一张**静止的**图划 —— 所见即所得。
 *
 * ## 🚨 必须 portal 到 document.body
 * 侧栏根节点带沉浸材质（`backdrop-filter`），那会另建包含块 ——
 * 连同为 `position: fixed` 的后代都会被它裁掉（项目里踩过：sender 的「+」弹层）。
 * 遮罩是 `fixed inset-0` 全屏层，就地渲染必被裁成侧栏那一小块。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { IconCheck, IconClose } from "@/components/icon"
import { freezePageScroll } from "@/app/ai-assistant/_utils/screenshot"
import type { PageSnapshot, RegionRect } from "@/app/ai-assistant/_utils/screenshot"

/** 小于这个尺寸视为误点（手抖点一下），不算一次有效划选 */
const MIN_SIZE = 10
const BRAND = "#059669"
const BRAND_ON_DARK = "#34D399"

export interface RegionScreenshotOverlayProps {
  /** 冻结底图及其坐标基准（来自 `_utils/screenshot.ts#snapshotPage`） */
  snapshot: PageSnapshot
  /** 底图的 dataURL（显示用，画质够看即可） */
  backgroundImage: string
  onCancel: () => void
  onConfirm: (rect: RegionRect) => void
  dark?: boolean
}

export function RegionScreenshotOverlay({
  snapshot,
  backgroundImage,
  onCancel,
  onConfirm,
  dark = false,
}: RegionScreenshotOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  /**
   * 「在已有选区内按下」但还没确定意图的落点：待判断这次是**点击**（→ 双击确认）
   * 还是**拖拽**（→ 重划选区）。见 onPointerDown 里的说明。
   */
  const pendingRef = useRef<{ x: number; y: number } | null>(null)
  /** 确认只允许生效一次：双击与 ✓ 会同时命中，别裁两次、别重复 append 附件 */
  const doneRef = useRef(false)
  const [rect, setRect] = useState<RegionRect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [vp, setVp] = useState(() => ({
    w: typeof window === "undefined" ? 1440 : window.innerWidth,
    h: typeof window === "undefined" ? 900 : window.innerHeight,
  }))

  const accent = dark ? BRAND_ON_DARK : BRAND

  /* 视口尺寸（划选坐标全用视口系，遮罩 fixed inset-0 与之严格对齐） */
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  /* 冻结页面滚动：拖拽期间一旦页面跟着滚，框就飞了。
     🚨 用原生 listeners + stopPropagation —— 全站滚轮仲裁挂在 window 上（Lenis），
        React 的合成事件拦不住它。 */
  useEffect(() => {
    const unfreeze = freezePageScroll()
    const el = rootRef.current
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    el?.addEventListener("wheel", stop, { passive: false })
    el?.addEventListener("touchmove", stop, { passive: false })
    return () => {
      unfreeze()
      el?.removeEventListener("wheel", stop)
      el?.removeEventListener("touchmove", stop)
    }
  }, [])

  const confirm = useCallback(() => {
    if (doneRef.current) return
    if (!rect || rect.w < MIN_SIZE || rect.h < MIN_SIZE) return
    doneRef.current = true
    onConfirm(rect)
  }, [rect, onConfirm])

  /* 键盘：Esc 取消 / Enter 确认 / 吞掉滚动键。
     🚨 Esc 必须 stopPropagation —— 这是 window **捕获阶段**的监听，不拦住的话
        Esc 会继续往下传，侧栏自己也监听 Esc（顺手把面板关了）：
        用户按 Esc 退出截图，结果侧栏一起没了（探针实测把按钮都找不着了）。
     滚动键（空格 / PageUp·Down / Home·End / 方向键）：冻结滚动只关了滚轮与触摸，
        键盘默认行为仍会滚动文档（而底图是静止的，一滚框就对不上了），一并吞掉。 */
  useEffect(() => {
    const SCROLL_KEYS = new Set([
      " ", "Spacebar", "PageUp", "PageDown", "Home", "End",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    ])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      } else if (e.key === "Enter") {
        e.preventDefault()
        e.stopPropagation()
        confirm()
      } else if (SCROLL_KEYS.has(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [confirm, onCancel])

  const clamp = useCallback((v: number, max: number) => Math.max(0, Math.min(v, max)), [])

  const toLocal = useCallback(
    (clientX: number, clientY: number) => ({ x: clamp(clientX, vp.w), y: clamp(clientY, vp.h) }),
    [clamp, vp.w, vp.h],
  )

  const normalize = (a: { x: number; y: number }, b: { x: number; y: number }): RegionRect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  })

  /** 点在已有选区内部？（用来区分"在框里点击/双击"与"从别处开新框"） */
  const insideRect = (p: { x: number; y: number }) =>
    !!rect &&
    rect.w >= MIN_SIZE &&
    rect.h >= MIN_SIZE &&
    p.x >= rect.x &&
    p.x <= rect.x + rect.w &&
    p.y >= rect.y &&
    p.y <= rect.y + rect.h

  /** 拖拽超过这个距离才算"重划"，否则当点击 —— 触控板手抖不至于把框弄没 */
  const REDRAG_THRESHOLD = 4

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // 点在浮出来的工具条上不重开选区
    if ((e.target as HTMLElement).closest("[data-region-ui]")) return

    const p = toLocal(e.clientX, e.clientY)

    /* 🚨 在已有选区内部按下时**绝不清掉选区**。
       双击确认必然先经过一次 pointerdown，若这里顺手 setRect(0×0)，
       紧接着的 dblclick 看到的 rect 已是零尺寸 → confirm 被自己拦下，
       表现为"双击没反应，遮罩关不掉"（探针实测就是这个）。
       所以先挂起，等 pointermove 超过阈值才认定用户是要重划。
       ⚠️ 别想在这里用 `e.detail >= 2` 判双击：规范规定 PointerEvent.detail **恒为 0**
          （它继承 UIEvent 但不带点击计数，只有 MouseEvent 的 mousedown 才有）。
          确认一律交给 onDoubleClick —— 浏览器原生 dblclick，真实双击必然产生。 */
    if (insideRect(p)) {
      pendingRef.current = p
      return
    }

    startRef.current = p
    setDragging(true)
    setRect({ x: p.x, y: p.y, w: 0, h: 0 })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 某些环境下 capture 不可用，不影响拖拽 */
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pending = pendingRef.current
    if (pending) {
      const p = toLocal(e.clientX, e.clientY)
      if (Math.hypot(p.x - pending.x, p.y - pending.y) > REDRAG_THRESHOLD) {
        // 确认是拖拽 → 从按下点起重划
        pendingRef.current = null
        startRef.current = pending
        setDragging(true)
        setRect(normalize(pending, p))
      }
      return
    }
    const s = startRef.current
    if (!s) return
    setRect(normalize(s, toLocal(e.clientX, e.clientY)))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pendingRef.current = null
    const s = startRef.current
    startRef.current = null
    setDragging(false)
    if (!s) return
    const r = normalize(s, toLocal(e.clientX, e.clientY))
    // 太小 = 误点：清掉选区让你重划（而不是退出整个截图流程）
    setRect(r.w < MIN_SIZE || r.h < MIN_SIZE ? null : r)
  }

  /* 底图铺放：画布像素 ÷ scale 还原成 CSS 尺寸，再用 origin 偏移对齐视口 */
  const imgStyle = useMemo(() => {
    const w = snapshot.canvas.width / snapshot.scale
    const h = snapshot.canvas.height / snapshot.scale
    return {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: `${w}px ${h}px`,
      backgroundPosition: `${snapshot.originX}px ${snapshot.originY}px`,
      backgroundRepeat: "no-repeat",
    }
  }, [backgroundImage, snapshot])

  const showActions = !!rect && rect.w >= MIN_SIZE && rect.h >= MIN_SIZE

  /* 工具条贴着选区右下角；下方空间不够就翻到选区上方 */
  const barTop = rect ? (rect.y + rect.h + 12 + 40 > vp.h ? Math.max(6, rect.y - 48) : rect.y + rect.h + 12) : 0
  const barLeft = rect ? Math.min(Math.max(6, rect.x + rect.w - 168), Math.max(6, vp.w - 174)) : 0

  const labelTop = rect ? (rect.y < 30 ? rect.y + 8 : rect.y - 26) : 0

  return createPortal(
    <div
      ref={rootRef}
      data-region-screenshot
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        cursor: "crosshair",
        userSelect: "none",
        touchAction: "none",
        /* 底图 + 压暗：底图是"冻住的页面"，暗幕让选区外明显沉下去 */
        ...imgStyle,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => confirm()}
    >
      {/* 暗幕：未选区 = 整屏压暗；已选区 = 用超大 box-shadow 挖洞（比四块 div 拼更省事也更准） */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: rect ? "transparent" : "rgba(0,0,0,0.45)",
          pointerEvents: "none",
          transition: "background 80ms linear",
        }}
      />
      {rect && rect.w > 0 && rect.h > 0 && (
        <div
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            outline: `1.5px solid ${accent}`,
            outlineOffset: "0px",
            pointerEvents: "none",
          }}
        />
      )}

      {/* 尺寸标签 */}
      {showActions && rect && (
        <div
          data-region-ui
          style={{
            position: "absolute",
            left: rect.x,
            top: labelTop,
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.72)",
            color: "#fff",
            fontSize: 11.5,
            lineHeight: "16px",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {Math.round(rect.w)} × {Math.round(rect.h)}
        </div>
      )}

      {/* 未选区：顶部提示（划起来就收起，不挡视线） */}
      {!rect && (
        <div
          data-region-ui
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "7px 14px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.72)",
            color: "#fff",
            fontSize: 12.5,
            lineHeight: "18px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          按住鼠标拖动，划出要截的区域 · Esc 取消
        </div>
      )}

      {/* 确认 / 取消：贴着选区右下角浮出 */}
      {showActions && (
        <div
          data-region-ui
          style={{
            position: "absolute",
            left: barLeft,
            top: barTop,
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "6px 8px",
            borderRadius: 12,
            background: dark ? "rgba(39,39,42,0.96)" : "rgba(255,255,255,0.98)",
            border: `1px solid ${dark ? "#3f3f46" : "rgba(0,0,0,0.08)"}`,
            boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontSize: 11.5, color: dark ? "#a1a1aa" : "#71717A", paddingLeft: 4, whiteSpace: "nowrap" }}>
            双击区域可直接确认
          </span>
          <button
            type="button"
            aria-label="取消截图"
            title="取消（Esc）"
            onClick={onCancel}
            style={btnStyle(dark)}
          >
            <IconClose size={15} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="确认截图"
            title="确认（Enter）"
            onClick={confirm}
            style={{ ...btnStyle(dark), background: accent, borderColor: accent, color: "#fff" }}
          >
            <IconCheck size={15} strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* 拖拽中的虚线提示（可选，很轻） */}
      {dragging && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      )}
    </div>,
    document.body,
  )
}

function btnStyle(dark: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    padding: 0,
    borderRadius: 999,
    border: `1px solid ${dark ? "#52525b" : "rgba(0,0,0,0.10)"}`,
    background: dark ? "#3f3f46" : "#fff",
    color: dark ? "#e4e4e7" : "#3f3f46",
    cursor: "pointer",
  }
}
