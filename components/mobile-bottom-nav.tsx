"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion, LayoutGroup, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { IconComment, IconGridFour, IconHome, IconMagic, IconUser } from "@/components/icon";
interface NavItem {
  href: string
  label: string
  icon: any
  iconSolid: any
  id: string
}

const navItems: NavItem[] = [
  { href: "/home", label: "首页", icon: IconHome, iconSolid: IconHome, id: "nav-home" },
  { href: "/dashboard-ios", label: "看板", icon: IconGridFour, iconSolid: IconGridFour, id: "nav-dashboard-ios" },
  { href: "/ai-assistant-ios", label: "AI", icon: IconMagic, iconSolid: IconMagic, id: "nav-ai-assistant-ios" },
  { href: "/chat", label: "消息", icon: IconComment, iconSolid: IconComment, id: "nav-chat" },
  { href: "/profile-ios", label: "我的", icon: IconUser, iconSolid: IconUser, id: "nav-profile-ios" },
]

export function MobileBottomNav({ position = "fixed" }: { position?: "fixed" | "sticky" }) {
  const pathname = usePathname()

  return (
    <div className={cn(
      position === "fixed" ? "fixed" : "sticky",
      "bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    )}>
      <nav className="bg-white/90 dark:bg-[#121212]/90 backdrop-blur-2xl rounded-[2.5rem] p-2 shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 pointer-events-auto">
        <ul className="flex items-center gap-1">
          <LayoutGroup>
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = isActive ? item.iconSolid : item.icon

              return (
                <li key={item.href}>
                  <Link href={item.href} id={item.id} className="block">
                    <motion.div
                      layout
                      className={cn(
                        "relative flex items-center justify-center rounded-[2rem] cursor-pointer overflow-hidden",
                        isActive ? "px-5 py-3" : "p-3 hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabBackground"
                          className="absolute inset-0 bg-[#1677ff] pointer-events-none"
                          initial={false}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}

                      <div className="relative z-10 flex items-center gap-2">
                        <motion.div
                          layout
                          className={cn(
                             "flex items-center justify-center",
                             isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                          )}
                        >
                          <Icon className={cn("size-5 transition-transform duration-300", isActive && "scale-105")} />
                        </motion.div>

                        <AnimatePresence mode="popLayout">
                          {isActive && (
                            <motion.span
                              initial={{ opacity: 0, width: 0, x: -10 }}
                              animate={{ opacity: 1, width: "auto", x: 0 }}
                              exit={{ opacity: 0, width: 0, x: -10 }}
                              transition={{ duration: 0.2, delay: 0.1 }}
                              className="text-sm font-bold text-white whitespace-nowrap overflow-hidden"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </Link>
                </li>
              )
            })}
          </LayoutGroup>
        </ul>
      </nav>
    </div>
  )
}
