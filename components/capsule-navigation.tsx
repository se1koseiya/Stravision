"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "MCP 广场", path: "/mcp-store" },
  { label: "我的 MCP", path: "/my-mcp" }
]

export function CapsuleNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="relative flex items-center bg-white/5 rounded-full p-1 border border-white/5 whitespace-nowrap shrink-0">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path
        
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={cn(
              "relative px-4 py-1.5 text-xs font-medium transition-colors z-10 whitespace-nowrap",
              isActive ? "text-white" : "text-white/60 hover:text-white/80"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="capsule-nav-bg"
                className="absolute inset-0 bg-zinc-700 rounded-full shadow-sm pointer-events-none"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                style={{ zIndex: -1 }}
              />
            )}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
