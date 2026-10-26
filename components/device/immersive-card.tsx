"use client"

import {
  useCallback,
  useInsertionEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { GRADE_CLASS, MATERIAL_CSS, type MaterialGrade } from "./material-css"

/**
 * 沉浸光感材质卡 —— HarmonyOS HDS「沉浸光感」（内容区 REGULAR 档）
 * 规范：developer.huawei.com/consumer/cn/doc/harmonyos-guides/ui-design-hds-component-material
 *
 * ── 材质只有四件套（HDS 官方示例的组合，照搬）──
 *    半透明底 + 背景模糊 + 1px 细边 + 柔和阴影
 *   官方示例：backgroundColor(rgba(255,255,255,0.1)) + BlurStyle.ULTRA_THICK
 *            + border(1px, rgba(255,255,255,0.2)) + shadow(radius 20, rgba(0,0,0,0.15))
 *   官方要点原话：「避免固定色，多用半透明，保证通透感」。
 *   暗色底尤其要用**叠白**而不是**混灰** —— 深灰填充会让卡面与深色画布同色系，
 *   结果是又平又硬；叠白才有「亮一档且透」的光感。
 *
 * ── 档位与等级 ──
 *   材质本体（四件套 / 档位变量 / 自适应等级 / 光效）全部收在 ./material-css.ts，本组件
 *   只负责把档位类挂上去、渲染两层光、接住指针事件。grade 默认 regular（内容区卡片）；
 *   卡内小控件用 thin、聚合面板用 thick、弹层用 ultra。
 *   自适应等级由 useAdaptiveMaterialLevel() 写到 <html data-mat-level> 上，组件无需感知。
 *
 * ── 光的层次（自下而上）──
 *    tint     可选环境染色（默认不用）
 *    .dc-imv-glow  按压点光源（按下时从触点扩散）
 *    content  正文
 *    光是**事件驱动**的：静止态没有任何光效，所以看起来是"沉浸光感"而不是"贴了高光"。
 *
 * ── ⚠️ 已试过、不要再走的路 ──
 *  A) 自实现 SVG 位移折射（feDisplacementMap + 圆角矩形 SDF 贴图）
 *     `filter:url(#x)` 与 `backdrop-filter` 写同一元素时，Chrome 的 SourceGraphic
 *     **不含** backdrop 结果 → 输出变成盖在卡面上的均匀灰膜（实测卡面亮度 200.6 vs 背景 250.5）；
 *     改写成 `backdrop-filter: blur() saturate() url(#x)` 依旧 200.6（feBlend 在 backdrop
 *     管线里 alpha 预乘不一致，整层压暗）。且折射只在背景**有内容**时才看得见，
 *     平滑画布上位移梯度 ≈ 无变化，收益≈0、代价是发灰。
 *  B) 引入 `liquid-glass-react` 整包（2026-09-25 试过，已卸载）
 *     它是「居中悬浮胶囊」布局（外层 top/left:50% + translate(-50%)，.glass 是 inline-flex），
 *     要压一堆 !important 才能当卡片用；同样踩 A 的坑；16 张卡 = 16 组 feDisplacementMap，
 *     headless 直接卡到探针超时，整页卡面崩坏（只剩文字漂在底上）。**不要再引入。**
 *  C) 拟物细节（镜面边缘环 / 上亮下暗厚度渐变 / 指针跟随高光）
 *     这些是「模拟实体玻璃的外观」，会让界面厚重、发假。用户明确要**拟态感**而非**拟物化**：
 *     沉浸光感不表演玻璃，只负责把下方内容柔化透出。以下实现刻意全部不含。
 *  D) ⚠️ 2026-09-25 用户反馈：光有材质、没有「光感」。于是补上官方六特性里的
 *     ④按压点光源（.dc-imv-glow，CSS 在 material-css.ts，按下瞬间从触点扩散）。
 *     这条**不属于 C** —— 只在按下的一瞬间出现，静止态无光，不动任何子元素、
 *     不加描边环、不做指针跟随。别再按 C 的理由把它删掉。
 *  E) ⚠️ 同一天试过官方 ⑤材质流光（.dc-sheen：hover 扫过一道斜光带），**用户要求去掉**：
 *     截图里那道滑过去的白光又宽又亮，观感是"贴了层玻璃反光"，不是沉浸光感。
 *     CSS 与用法已全部删除，别再"为了完整复刻六特性"把它加回来。
 *  F) ⚠️ 按压态**不要**用 JS 命令式加类（当时写的是 el.classList.add('dc-imv--press')）：
 *     framer-motion 因 whileTap 触发重渲染时，React 会把 className 写回，命令式类被冲掉，
 *     光晕根本不出现。现在触发走 CSS 的 :active，坐标走 inline CSS 变量（React 不碰自定义属性）。
 *
 * 结构：tint(可选, z0) → glow(z0) → content(z1)
 * 交互：按压走 framer-motion 真实弹簧（手感，不是外观）；无 hover 位移、无指针跟随、无扫光。
 */
const CSS_ID = "dc-material-and-immersive-card-css"

const IMMERSIVE_CARD_CSS = `
.dc-imv{
  --dc-imv-tint-op: .18;
  isolation: isolate;
  overflow: hidden;
  /* 材质四件套 + 光效由 .dc-mat 提供（见 material-css.ts）；
     这里只管布局与过渡。
     transform 不写进 transition：缩放由 framer-motion 逐帧写 inline transform，
     再挂 CSS transition 会把每次 spring 步进平滑一次 → 手感发黏。 */
  transition: background-color .34s ease, box-shadow .34s ease, border-color .34s ease;
}
/* 可选环境染色：极淡柔光。默认不用 —— HDS 材质本体是纯中性的。 */
.dc-imv-tint{
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  opacity: var(--dc-imv-tint-op);
  background-image:
    radial-gradient(58% 46% at 94% 0%, var(--imv-1, #A1A1AA) 0%, transparent 68%),
    radial-gradient(50% 40% at 0% 100%, var(--imv-2, #E0E7FF) 0%, transparent 70%);
}
/* ⚠️⚠️ flex: 1 1 auto + min-height: 0 是**必需**的，不是可选优化，别删。
   这一层 wrapper 夹在「卡片根」与 children 之间。当卡片根被写成 flex 容器时
   （例：/monitor 主视觉的 "flex-1 flex flex-col"），wrapper 作为 flex item
   默认 flex-grow:0 → 高度只等于自身内容（卡头 ~60px）——
   于是 children 里所有 absolute inset-0 / bottom-* 的**定位上下文塌成一条**：
   3D 画布被压到 60px 高、底部控件飞到顶部与标题糊成一团（2026-09-25 用户截图）。
   卡片根高度为 auto 时 flex-grow 不产生效果 → 这条对普通内容卡零影响。 */
.dc-imv-content{ position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; }
/* —— 定位上下文：默认 position: relative（内层 z-index 才能成层）——
   ⚠️⚠️ 必须**让位给显式定位**，否则会静默吃掉 Tailwind 的 .absolute：
      IMMERSIVE_CARD_CSS 是**未分层**样式，未分层 > @layer utilities —— 裸写 position: relative
      会盖掉同元素上的 .absolute / .fixed，元素从浮层塌回文档流（无任何报错）。
      实测踩过的：/monitor 主视觉上的「传感器读数浮层」<ImmersiveCard className="absolute bottom-6 left-6">
      —— 少了这条 :where() 让位，读数条直接掉出 3D 画布。
      写法与 material-css.ts 里 .dc-ctrl--* 的那条完全一致（:where() 特异性为 0，不抬特异性）。 */
.dc-imv:not(:where(.absolute, .fixed, .sticky, .static)){
  position: relative;
}
/* 需要滚动或内部浮层（Select/Popover）的卡片要关掉裁切 —— 双类提高特异性。
   ⚠️ 这类容器更推荐直接用 .dc-glass，不要套 ImmersiveCard。 */
.dc-imv.dc-imv-noclip{ overflow: visible; }
`

/**
 * 单例注入材质样式：同页几十张卡也只插一次 style 标签。
 *
 * 导出（而非留作内部函数）是有意的：弹层类组件（radix Dialog / antd Modal / 3D 画布内的浮层）
 * 要么 portal 到 body、要么渲染在 canvas 容器里，都拿不到页面容器的样式作用域，
 * 必须自己保证 MATERIAL_CSS 已在文档中 —— 否则挂上 dc-mat--ultra 只拿到一组变量、
 * 没有任何材质属性（表现为「类加了但完全没效果」，而 CSS 不会报错）。
 * 用法：组件顶层调用 useMaterialCss()。
 */
export function useMaterialCss() {
  useInsertionEffect(() => {
    if (typeof document === "undefined") return
    const CSS = MATERIAL_CSS + IMMERSIVE_CARD_CSS
    let el = document.getElementById(CSS_ID) as HTMLStyleElement | null
    if (el) {
      /* ⚠️ 这一段是给**开发期热更新**用的，不是冗余代码：
         style 标签一旦插进 head 就脱离了 React 的管辖，HMR 不会帮我们删除它。
         若这里直接 return，改了本文件的 CSS 常量后，旧的 style 会一直留在页面上
         （表现为「改了样式但页面没变化」，很容易误判成选择器写错）。带上内容比对后，
         HMR 重挂载组件即可就地覆盖。生产环境首次加载走下面的新建分支，无额外开销。 */
      if (el.textContent !== CSS) el.textContent = CSS
      return
    }
    el = document.createElement("style")
    el.id = CSS_ID
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])
}

export interface ImmersiveCardProps
  extends Omit<HTMLMotionProps<"div">, "style" | "className" | "children" | "ref"> {
  children: ReactNode
  className?: string
  /** 材质档位：内容卡 regular（默认）/ 卡内小控件 thin / 聚合面板 thick / 弹层 ultra */
  grade?: MaterialGrade
  /** 可选环境染色双色。默认不用：HDS 材质本体应保持中性。 */
  tint?: [string, string]
  /** 环境染色强度 0~1，默认 .18 */
  tintStrength?: number
  /** 是否启用按压弹性反馈（真实弹簧）与按压点光源，默认开启 */
  interactive?: boolean
  /** 是否裁切内部溢出（默认裁切）。内部需滚动/浮层时设 false，或直接用 .dc-glass。 */
  clip?: boolean
  style?: CSSProperties
}

export function ImmersiveCard({
  children,
  className,
  grade = "regular",
  tint,
  tintStrength = 0.18,
  interactive = true,
  clip = true,
  style,
  onPointerDown,
  ...rest
}: ImmersiveCardProps) {
  useMaterialCss()

  const rootRef = useRef<HTMLDivElement>(null)

  /**
   * ④ 按压点光源：把触点写成百分比变量（--imv-gx/gy），光晕从那儿扩散。
   * 「按下 / 松开」这个开关交给 CSS 的 :active（见 material-css.ts 里的说明）——
   * 不在此处 classList.add，那会被 React 的重渲染冲掉。
   * 只写 inline CSS 变量：自定义属性不在 style prop 里，React 不会碰。
   */
  const placeLight = useCallback((clientX: number, clientY: number) => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      el.style.setProperty("--imv-gx", `${(((clientX - r.left) / r.width) * 100).toFixed(2)}%`)
      el.style.setProperty("--imv-gy", `${(((clientY - r.top) / r.height) * 100).toFixed(2)}%`)
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      onPointerDown?.(e)
      if (interactive) placeLight(e.clientX, e.clientY)
    },
    [interactive, placeLight, onPointerDown]
  )

  const tintStyle: CSSProperties | undefined = tint
    ? ({
        "--imv-1": tint[0],
        "--imv-2": tint[1],
        "--dc-imv-tint-op": tintStrength,
      } as CSSProperties)
    : undefined

  return (
    <motion.div
      {...rest}
      ref={rootRef}
      className={cn(
        "dc-mat",
        GRADE_CLASS[grade],
        "dc-imv",
        clip ? null : "dc-imv-noclip",
        className
      )}
      style={{ ...tintStyle, ...style }}
      onPointerDown={handlePointerDown}
      /* 按压手感：真实弹簧（物理积分），不做外观表演 */
      whileTap={interactive ? { scale: 0.972 } : undefined}
      transition={{ type: "spring", stiffness: 520, damping: 30, mass: 0.8 }}
    >
      {tint ? <div className="dc-imv-tint" aria-hidden /> : null}
      {interactive ? <div className="dc-imv-glow" aria-hidden /> : null}
      <div className="dc-imv-content">{children}</div>
    </motion.div>
  )
}

export default ImmersiveCard
