"use client"

import { CloudIcon, Cog6ToothIcon, ChartBarIcon, SparklesIcon, ChatBubbleLeftRightIcon, BoltIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

import { cn } from "@/lib/utils"

type PageNavigationVariant = "dark" | "light"

export function PageNavigation({
  variant = "dark", // Kept for compatibility but largely ignored for style now
  compact = false,
}: {
  variant?: PageNavigationVariant
  compact?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: "/monitor", icon: CloudIcon, label: "农作物监测", id: "nav-monitor" },
    { href: "/device-control", icon: Cog6ToothIcon, label: "硬件设备控制", id: "nav-device-control" },
    { href: "/dashboard", icon: ChartBarIcon, label: "数据看板", id: "nav-dashboard" },
    { href: "/automation", icon: BoltIcon, label: "自动化", id: "nav-automation" },
    { href: "/ai-assistant", icon: SparklesIcon, label: "AI 助手", id: "nav-ai-assistant" },
    { href: "/chat", icon: ChatBubbleLeftRightIcon, label: "聊天", id: "nav-chat" },
  ]

  const activeIndex = navItems.findIndex((item) => pathname === item.href)
  const [selectedIndex, setSelectedIndex] = useState(activeIndex === -1 ? 0 : activeIndex)
  const [namespace] = useState(pathname)

  useEffect(() => {
    if (activeIndex !== -1) {
      setSelectedIndex(activeIndex)
    }
  }, [pathname, activeIndex])

  return (
    <div
      className={cn(
        "relative rounded-full backdrop-blur-xl p-1.5 flex items-center gap-2 transition-all duration-300",
        "bg-white/70 dark:bg-slate-900/45 border border-white/60 dark:border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.06)]",
        compact ? "h-12" : "h-12"
      )}
    >
      {navItems.map((item, index) => {
        const Icon = item.icon
        const isActive = index === selectedIndex

        return (
          <Link
            key={item.href}
            href={item.href}
            id={item.id}
            className={cn(
              "relative z-10 h-9 rounded-full flex items-center gap-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              compact ? "px-3" : "px-5"
            )}
            onClick={(e) => {
              e.preventDefault()
              if (selectedIndex !== index) setSelectedIndex(index)
              setTimeout(() => router.push(item.href), 200)
            }}
            aria-label={item.label}
          >
            {isActive && (
              <motion.div
                layoutId={`activeTab-${namespace}`}
                className="absolute inset-0 rounded-full bg-emerald-500 dark:bg-blue-600 shadow-[0_2px_12px_rgba(16,185,129,0.25)] dark:shadow-[0_2px_12px_rgba(37,99,235,0.25)]"
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              />
            )}

            <div
              className={cn(
                "relative z-10 flex items-center gap-2 text-sm font-medium transition-colors duration-200",
                isActive ? "text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {item.href === "/ai-assistant" ? (
                <div className="size-[18px] rounded-full overflow-hidden">
                  <Image src="/logo.gif" alt="AI" width={18} height={18} className="object-cover" unoptimized />
                </div>
              ) : (
                <Icon className="size-[18px]" />
              )}
              {!compact && <span>{item.label}</span>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
