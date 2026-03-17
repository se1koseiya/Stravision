"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "MCP 广场", path: "/mcp-store" },
  { label: "我的 MCP", path: "/my-mcp" }
]

export function TopNavLinks() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="flex items-center gap-8">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path
        
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={cn(
              "relative text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-white/60 hover:text-white"
            )}
          >
            {item.label}
            {isActive && (
              <motion.div
                layoutId="top-nav-indicator"
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
