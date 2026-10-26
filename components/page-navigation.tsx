"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

import { cn } from "@/lib/utils"
import { IconChartHistogram, IconCloudy, IconComment, IconLeft, IconMagic, IconRight, IconSettingTwo, IconThunderbolt } from "@/components/icon";
type PageNavigationVariant = "dark" | "light"

export function PageNavigation({
  variant = "dark",
  compact = false,
}: {
  variant?: PageNavigationVariant
  compact?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCompact, setIsCompact] = useState(false)

  const navItems = [
    { href: "/monitor", icon: IconCloudy, label: "农作物监测", id: "nav-monitor" },
    { href: "/device-control", icon: IconSettingTwo, label: "硬件设备控制", id: "nav-device-control" },
    { href: "/dashboard", icon: IconChartHistogram, label: "数据看板", id: "nav-dashboard" },
    { href: "/automation", icon: IconThunderbolt, label: "自动化", id: "nav-automation" },
    { href: "/ai-assistant", icon: IconMagic, label: "AI 助手", id: "nav-ai-assistant" },
    { href: "/chat", icon: IconComment, label: "聊天", id: "nav-chat" },
  ]

  const activeIndex = navItems.findIndex((item) => pathname === item.href)
  const [selectedIndex, setSelectedIndex] = useState(activeIndex === -1 ? 0 : activeIndex)
  const [namespace] = useState(pathname)

  useEffect(() => {
    if (activeIndex !== -1) {
      setSelectedIndex(activeIndex)
    }
  }, [pathname, activeIndex])

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('nav-compact-mode')
    if (saved !== null) {
      setIsCompact(saved === 'true')
    }
  }, [])

  const toggleCompact = () => {
    const newValue = !isCompact
    setIsCompact(newValue)
    localStorage.setItem('nav-compact-mode', String(newValue))
  }

  const shouldBeCompact = compact || isCompact

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          /* 沉浸光感材质（HDS THICK 档）——
             为什么是 THICK 而不是 THIN：这条胶囊承载 6 个导航项 + 图标 + 文字，
             压在一整片滚动内容之上，必须"更实的底"才保证可读（官方分档语义如此）。
             原来写死 bg-white/70 dark:bg-zinc-900/45 + backdrop-blur-xl，
             那是"自造材质"：只有模糊没有吸光，底色一实就把背后的色光冲淡了。
             现在交给 .dc-mat（material-css.ts 唯一来源）——
             saturate()/brightness() 把背后色光吸上来 + --mat-edge 内缘光。
             ⚠️ 同时删掉 Tailwind 的 bg/border/shadow：材质类会自己给三者，
               留着只是噪音（未分层材质样式确实会赢，但两处写法并存极易误读）。 */
          "dc-mat dc-mat--thick relative rounded-full p-1.5 flex items-center gap-2",
          "h-12"
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
                /* 按压：HDS「按压弹性反馈」（缩放）+「按压点光源」（::after 光晕）都在 .dc-ctrl--press 里。
                   注意它自带的 transition 会整条替换 Tailwind 的 transition-all
                   —— 所以那条规则里已经把 background-color / color 一并写进去了，文字变色不会丢。 */
                "dc-ctrl--press relative z-10 h-9 rounded-full flex items-center outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                shouldBeCompact ? "px-2.5" : "px-4 gap-2"
              )}
              onClick={(e) => {
                e.preventDefault()
                if (selectedIndex !== index) setSelectedIndex(index)
                setTimeout(() => router.push(item.href), 200)
              }}
              aria-label={item.label}
              title={shouldBeCompact ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId={`activeTab-${namespace}`}
                  /* 选中胶囊 = HDS「品牌玻璃」档（.dc-ctrl--brand-soft）：品牌绿膜 + 模糊 + 内缘光，
                     从 6 个项目底下"浮"出来。用户明确要求「胶囊做上沉浸光感 + 稍微透明度一点」，
                     所以用玻璃变体而不是 CTA 用的实体 .dc-ctrl--brand（.94 alpha 太实，像贴了块绿牌）。
                     ⚠️ inset-0 靠 Tailwind .absolute 定位 —— 材质类**必须**让位给显式定位，
                        否则会塌成 2×2（见 material-css.ts 的 :not(:where(.absolute,…)) 说明）。 */
                  className="dc-ctrl--brand-soft absolute inset-0 rounded-full pointer-events-none"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex items-center text-sm font-medium transition-colors duration-200",
                  /* 选中态文字随主题分两色：暗底胶囊上白字（≈7:1）；亮底绿膜上改用品牌墨绿
                     （#059669，≈4.6:1）—— 亮底上的白字永远过不了对比度，见 material-css.ts 注释。 */
                  isActive
                    ? "text-br-brand-ink dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                  !shouldBeCompact && "gap-2"
                )}
              >
                {item.href === "/ai-assistant" ? (
                  <div className="size-[18px] rounded-full overflow-hidden flex-shrink-0">
                    <Image src="/logo.gif" alt="AI" width={18} height={18} className="object-cover" unoptimized />
                  </div>
                ) : (
                  <Icon className="size-[18px] flex-shrink-0" />
                )}
                
                {!shouldBeCompact && (
                  <span className="whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Toggle Button —— 悬浮的小圆形图标按钮：HDS THIN 档（「顶部 / 侧边悬浮导航」）
          + .dc-ctrl--press 的按压弹性与点光源（自带的 position: relative 必须由修饰符提供，
          否则 ::after 会相对更远的定位祖先铺开 → 按一下整页泛白）。 */}
      <button
        onClick={toggleCompact}
        className={cn(
          "dc-mat dc-mat--thin dc-ctrl--press h-9 w-9 rounded-full flex items-center justify-center",
        )}
        title={isCompact ? "展开导航" : "收起导航"}
        aria-label={isCompact ? "展开导航" : "收起导航"}
      >
        {isCompact ? (
          <IconRight className="size-4 text-zinc-600 dark:text-zinc-400" />
        ) : (
          <IconLeft className="size-4 text-zinc-600 dark:text-zinc-400" />
        )}
      </button>
    </div>
  )
}
