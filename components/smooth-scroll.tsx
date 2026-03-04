"use client"

import { ReactLenis } from "@studio-freight/react-lenis"

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.15, duration: 1.2, smoothWheel: true }}>
      {children as any}
    </ReactLenis>
  )
}
