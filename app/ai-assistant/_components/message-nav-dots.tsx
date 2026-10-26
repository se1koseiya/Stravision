"use client"

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export interface MessageNavItem {
  /** 唯一标识（与消息锚点 data-msg-anchor 的值一致） */
  id: string
  /** 悬停展开时显示的文字预览（纯文本，已截断） */
  preview: string
}

export interface MessageNavDotsProps {
  /** 消息导航项列表（通常每条消息一项） */
  items: MessageNavItem[]
  /**
   * 受控的当前节点 id（可选）。
   * ⚠️ 默认不传：由组件自己监听滚动判定。
   * 交给组件自管是有意为之 —— 这把「当前节点」的 state 关在导航组件内部，
   * 滚动时不会连带 ChatBubbleList 整棵树重渲染（那会触发 Markdown 重排 → 视觉抖动）。
   */
  activeId?: string | null
  /** 滚动容器 ref（同时用于测量锚点位置与跳转） */
  scrollContainerRef: React.RefObject<HTMLElement | null>
  /** 暗色主题 */
  darkMode?: boolean
  /** 自定义类名 */
  className?: string
  /** 自定义样式（不要覆盖 position/width/height，否则展开动效会错位） */
  style?: React.CSSProperties
}

/* ------------------------------------------------------------------ */
/* 尺寸常量（单位 px）                                                  */
/* ------------------------------------------------------------------ */

/** 展开后文字列宽度 */
const LABEL_W = 268
/** 短横线基准长度（active 时 scaleX(1)，普通 0.72） */
const DASH_W = 16
/** 卡片左内距：长文本被截断时会贴到容器左缘，必须留出来，否则压到圆角上 */
const CARD_PAD_L = 16
/** 短横线距卡片右边缘的内距 */
const RAIL_PAD_R = 10
/** 文字列与短横线之间的间距 */
const GAP = 12
/** 卡片上下内距 */
const PAD_Y = 9
/** 行高上下限（消息多时自动压缩，保证整条导轨永远放得下） */
const ROW_MIN = 15
const ROW_MAX = 26
/** 收起态宽度：只露一根短横线 */
const COLLAPSED_W = DASH_W + RAIL_PAD_R
/** 展开态宽度 */
const FULL_W = CARD_PAD_L + LABEL_W + GAP + DASH_W + RAIL_PAD_R
/** 跳转后目标消息距容器顶部的位置 */
const JUMP_TOP_PAD = 16
/** 判定「当前节点」的探针线（距容器顶部）：消息顶部越过这条线即算当前 */
const PROBE_LINE = 26

const EASE_OUT_CUBIC = (p: number) => 1 - Math.pow(1 - p, 3)

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

/**
 * AI 对话「节点跳转」导轨（重做版，2026-10-22）
 *
 * 参考稿：右侧一缕短横线，当前节点更深更长；鼠标移上去整条导轨向左
 * 优雅展开成一张卡片，每行右侧一条短横线、左侧一行消息预览文字。
 *
 * 三条设计约束（都对应用户提的「跳转不能抖」）：
 * 1. **绝对定位浮层**：不再作为 flex item 占位 —— 旧实现把 6px/14px 的
 *    圆点宽度写进布局，active 一变整列宽度就变，对话区跟着被推来推去，
 *    文字重排 = 肉眼可见的抖动。
 * 2. **宽度动画只发生在浮层内部**：收起↔展开靠外层 width 过渡，内容层
 *    宽度恒定并锚在右侧，短横线永远钉在右边缘不动。
 * 3. **程序化缓动滚动 + 锁定**：跳转用 rAF 自己算插值（不依赖
 *    scroll-behavior），滚动过程中锁定 active，避免高亮在途中来回跳。
 */
export function MessageNavDots({
  items,
  activeId: controlledActiveId,
  scrollContainerRef,
  darkMode,
  className,
  style,
}: MessageNavDotsProps) {
  const ids = useMemo(() => items.map((it) => it.id), [items])
  const idsKey = ids.join("|")

  const { activeId: spyActiveId, jumpTo } = useScrollSpy(scrollContainerRef, ids, idsKey)
  const activeId = controlledActiveId ?? spyActiveId

  const [hovered, setHovered] = useState(false)
  const [boxH, setBoxH] = useState(0)

  /* 量一下对话区高度：消息条数多的时候要压缩行高，整条导轨必须完整放得下 */
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const measure = () => setBoxH(el.clientHeight)
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [scrollContainerRef])

  const rowH = useMemo(() => {
    const n = Math.max(1, items.length)
    const avail = boxH ? Math.max(0, boxH - 72 - PAD_Y * 2) : 0
    if (!avail) return ROW_MAX
    return Math.min(ROW_MAX, Math.max(ROW_MIN, Math.floor(avail / n)))
  }, [boxH, items.length])

  const rootH = items.length * rowH + PAD_Y * 2

  /* 只有一条消息时导轨没有意义，直接不渲染（也顺手省掉一次空浮层） */
  if (items.length < 2) return null

  /* 配色走 CSS 变量：<style> 里只写语义，明暗两套只在这里分叉 */
  const palette = {
    "--nav-label": darkMode ? "rgba(235,235,245,0.40)" : "rgba(24,24,27,0.42)",
    "--nav-label-hover": darkMode ? "rgba(235,235,245,0.78)" : "rgba(24,24,27,0.72)",
    "--nav-label-active": darkMode ? "#FAFAFA" : "#18181B",
    "--nav-dash": darkMode ? "rgba(255,255,255,0.26)" : "rgba(24,24,27,0.20)",
    "--nav-dash-hover": darkMode ? "rgba(255,255,255,0.55)" : "rgba(24,24,27,0.45)",
    "--nav-dash-active": darkMode ? "#FAFAFA" : "#18181B",
    "--nav-card-bg": darkMode ? "rgba(30,30,33,0.94)" : "rgba(255,255,255,0.96)",
    "--nav-card-border": darkMode ? "rgba(255,255,255,0.10)" : "rgba(24,24,27,0.06)",
    "--nav-card-shadow": darkMode
      ? "0 2px 8px rgba(0,0,0,0.35), 0 16px 40px -12px rgba(0,0,0,0.55)"
      : "0 2px 8px rgba(16,24,40,0.04), 0 12px 28px -8px rgba(16,24,40,0.10), 0 24px 56px -16px rgba(16,24,40,0.10)",
    "--nav-focus": darkMode ? "#34D399" : "#059669",
  } as React.CSSProperties

  return (
    <>
      <style>{`
        .msg-nav-row {
          border: 0;
          margin: 0;
          padding: 0 ${RAIL_PAD_R}px 0 ${CARD_PAD_L}px;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: ${GAP}px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .msg-nav-row:focus-visible {
          outline: 2px solid var(--nav-focus);
          outline-offset: 1px;
          border-radius: 8px;
        }
        .msg-nav-label {
          width: ${LABEL_W}px;
          flex: none;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          line-height: 1;
          letter-spacing: 0.1px;
          color: var(--nav-label);
          /* 长文本被截断时，左端做 12px 渐隐 —— 否则硬切口像被容器裁掉 */
          -webkit-mask-image: linear-gradient(to right, transparent 0, #000 12px);
          mask-image: linear-gradient(to right, transparent 0, #000 12px);
          transition: color 0.22s ease, opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .msg-nav-row:hover .msg-nav-label { color: var(--nav-label-hover); }
        .msg-nav-dash {
          flex: none;
          width: ${DASH_W}px;
          height: 2px;
          border-radius: 999px;
          background: var(--nav-dash);
          transform: scaleX(0.72);
          transform-origin: right center;
          transition: background-color 0.25s ease,
            transform 0.34s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .msg-nav-row:hover .msg-nav-dash { background: var(--nav-dash-hover); }
        .msg-nav-dash[data-active="true"] {
          height: 2.5px;
          background: var(--nav-dash-active);
          transform: scaleX(1);
        }
      `}</style>

      <div
        className={className}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false)
        }}
        onFocus={() => setHovered(true)}
        style={{
          ...palette,
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          height: rootH,
          width: hovered ? FULL_W : COLLAPSED_W,
          borderRadius: 16,
          overflow: "hidden",
          zIndex: 5,
          /* 只过渡宽度：内容层用绝对定位钉在右侧，所以这层宽度的变化
             不会影响任何外部布局（父级是 absolute 定位，不参与 flex 计算） */
          transition: "width 0.38s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "width",
          ...style,
        }}
      >
        {/* 卡片底：只在展开时淡入，收起时完全透明（避免一根短横线背后多一块白底） */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            background: "var(--nav-card-bg)",
            border: "1px solid var(--nav-card-border)",
            boxShadow: "var(--nav-card-shadow)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.26s ease",
            pointerEvents: "none",
          }}
        />

        {/* 内容层：宽度恒定 + 右对齐，随外层宽度被裁切 → 展开就是一条干净的横向揭示 */}
        <div
          style={{
            position: "absolute",
            top: PAD_Y,
            right: 0,
            width: FULL_W,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {items.map((item, i) => {
            const isActive = item.id === activeId
            const label = item.preview?.trim() || "（无文字内容）"
            return (
              <button
                key={item.id}
                type="button"
                className="msg-nav-row"
                style={{ width: FULL_W, height: rowH, flex: `0 0 ${rowH}px` }}
                aria-label={label}
                aria-current={isActive ? "true" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation()
                  jumpTo(item.id)
                }}
              >
                <span
                  className="msg-nav-label"
                  style={{
                    opacity: hovered ? 1 : 0,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--nav-label-active)" : undefined,
                    /* 逐行 14ms 阶梯延迟：展开像被“抖开”的卷轴，收起时不延迟 */
                    transitionDelay: hovered ? `${Math.min(i, 9) * 14}ms` : "0ms",
                  }}
                >
                  {label}
                </span>
                <span className="msg-nav-dash" data-active={isActive ? "true" : "false"} />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 滚动监听 + 缓动跳转                                                  */
/* ------------------------------------------------------------------ */

/**
 * 监听容器滚动，判定「当前节点」。
 *
 * 用探针线（容器顶部下方 26px）而不是 IntersectionObserver 的可见比例：
 * 比例法在两个消息交替可见时会来回翻转 → 高亮闪跳；探针线是单调的，
 * 消息顶部越过线就切换，绝不会来回。
 */
function useScrollSpy(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  ids: string[],
  idsKey: string
) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const lockRef = useRef<string | null>(null)
  const rafRef = useRef(0)
  const prevBehaviorRef = useRef("")

  const idsRef = useRef<string[]>(ids)
  idsRef.current = ids

  const pick = useCallback(() => {
    const el = scrollContainerRef.current
    const list = idsRef.current
    if (!el || list.length === 0) {
      setActiveId(null)
      return
    }
    const locked = lockRef.current
    if (locked) {
      setActiveId(locked)
      return
    }
    /* 已经到底：最后一条哪怕不在顶部也应该点亮 */
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setActiveId(list[list.length - 1])
      return
    }
    const line = el.getBoundingClientRect().top + PROBE_LINE
    let current = list[0]
    for (const id of list) {
      const node = el.querySelector<HTMLElement>(`[data-msg-anchor="${id}"]`)
      if (!node) continue
      if (node.getBoundingClientRect().top <= line) current = id
      else break
    }
    setActiveId(current)
  }, [scrollContainerRef])

  /* 滚动 / 尺寸变化 → rAF 节流后重算（只在真要换节点时才 setState） */
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        pick()
      })
    }
    pick()
    el.addEventListener("scroll", onScroll, { passive: true })
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null
    ro?.observe(el)
    window.addEventListener("resize", onScroll)

    /* 用户自己动滚轮/触屏 → 立刻放弃程序化滚动，把控制权还给人 */
    const interrupt = () => {
      if (!rafRef.current) return
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      lockRef.current = null
      el.style.scrollBehavior = prevBehaviorRef.current
    }
    el.addEventListener("wheel", interrupt, { passive: true })
    el.addEventListener("touchstart", interrupt, { passive: true })

    return () => {
      el.removeEventListener("scroll", onScroll)
      ro?.disconnect()
      window.removeEventListener("resize", onScroll)
      el.removeEventListener("wheel", interrupt)
      el.removeEventListener("touchstart", interrupt)
    }
  }, [scrollContainerRef, idsKey, pick])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  const jumpTo = useCallback(
    (id: string) => {
      const el = scrollContainerRef.current
      if (!el) return
      const node = el.querySelector<HTMLElement>(`[data-msg-anchor="${id}"]`)
      if (!node) return

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      /* 立刻点亮目标并锁定：滚动途中不跟随探针线改高亮，视觉上一步到位 */
      lockRef.current = id
      setActiveId(id)

      const start = el.scrollTop
      prevBehaviorRef.current = el.style.scrollBehavior
      /* 防一手：若容器被全局样式设了 smooth，直接赋值 scrollTop 会叠一层浏览器动画 */
      el.style.scrollBehavior = "auto"

      /* 每帧重算目标位置：消息列表在跳转途中如果有高度变化（图片解码、
         代码块高亮、打字机流式输出），目标点会跟着挪，逐帧重算才不甩尾。 */
      const destOf = () =>
        node.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        JUMP_TOP_PAD

      const distance = Math.abs(destOf() - start)
      /* 距离越远时长越长，但夹在 280~700ms：短跳不磨叽，长跳不眩晕 */
      const duration = Math.min(700, Math.max(280, 240 + distance * 0.22))
      const t0 = performance.now()

      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration)
        const dest = destOf()
        el.scrollTop = start + (dest - start) * EASE_OUT_CUBIC(p)
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        rafRef.current = 0
        el.scrollTop = destOf() /* 收敛：抹掉亚像素残差，避免落点差 1px 再被纠正 */
        el.style.scrollBehavior = prevBehaviorRef.current
        lockRef.current = null
        pick()
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [scrollContainerRef, pick]
  )

  return { activeId, jumpTo }
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

/** 从消息内容中提取纯文本预览 */
export function extractPreview(content: unknown, max = 40): string {
  if (typeof content === "string") {
    return content
      .replace(/<[^>]+>/g, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#*_`~>\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
  }
  if (Array.isArray(content)) {
    const textPart = content
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .join(" ")
    return extractPreview(textPart, max)
  }
  return ""
}
