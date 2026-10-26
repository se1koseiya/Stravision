"use client"

/**
 * 宣传片入口（纯客户端渲染）。
 *
 * 为什么必须 ssr:false：分镜页由 window.__seek(ms) 驱动定格，
 * 服务端渲染时 t=0，客户端一挂载就 seek 到别的时刻 —— 两者的 DOM 必然对不上，
 * 会触发 hydration mismatch 并且**把 React 的报错浮层烧进截图里**。
 * 关掉 SSR 后首帧就在客户端生成，出片干净。
 */

import dynamic from "next/dynamic"

const PromoInner = dynamic(() => import("./promo-inner"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#09090B" }} />,
})

export default function PromoVideoPage() {
  return <PromoInner />
}
