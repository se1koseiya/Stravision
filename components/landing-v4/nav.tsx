"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { L, NAV_LINKS } from "./shared";

/* ------------------------------------------------------------
   导航 —— 对齐 loomy.xunfei.cn
   未滚动：透明，高 6rem，宽 min(100% - 2rem, 88rem)
   滚动后：收成悬浮胶囊 —— 高 4.5rem、宽 min(100% - 10rem, 80rem)、
          圆角 1.25rem、backdrop-blur(1.25rem) saturate(1.12)、
          bg 白 78%、box-shadow 0 0.75rem 2.5rem rgba(0,0,0,.12) + 内高光
   链接：14px / 中等字重 / 灰 #696969，hover 浅底 + 转墨色
   CTA ：emerald-300 底墨字胶囊（h-11 px-6），hover 上移 2px + 变亮 + 阴影
   菜单组绝对居中（left-1/2），不随左右两列宽度漂移；固定 gap-1 均分间距
   ------------------------------------------------------------ */

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      title={dark ? "切换到浅色模式" : "切换到深色模式"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
      style={{ color: L.ink }}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pageLinks = NAV_LINKS;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative mx-auto flex items-center justify-between gap-6 border",
          "transition-[width,height,padding,border-radius,background-color,border-color,box-shadow,margin] duration-[460ms] ease-[cubic-bezier(.22,1,.36,1)]",
          scrolled
            ? "mt-3 h-[72px] w-[min(100%-3rem,80rem)] rounded-[20px] border-black/[0.06] bg-white/78 px-5 shadow-[0_0.75rem_2.5rem_rgba(0,0,0,0.12),inset_0_1px_0_rgba(34,34,34,0.08)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.09] dark:bg-[#161B17]/85 dark:shadow-[0_0.75rem_2.5rem_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "h-[96px] w-[min(100%-2rem,88rem)] rounded-none border-transparent bg-transparent px-0"
        )}
      >
        {/* 左：品牌 */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="莓界 Berry Realm 首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="size-[30px] rounded-[9px] object-cover" />
          <span className="text-[18px] font-extrabold tracking-tight" style={{ color: L.ink }}>
            莓界
          </span>
        </Link>

        {/* 中：菜单（绝对居中，不参与 justify-between 的宽度分配） */}
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
          {pageLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full px-4 py-2 text-[14px] font-medium leading-none transition-colors"
              style={{ color: L.muted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = L.ink;
                e.currentTarget.style.background = "color-mix(in srgb, var(--lg-ink) 5%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = L.muted;
                e.currentTarget.style.background = "transparent";
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* 右：操作 */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-full px-3.5 py-2 text-[14px] font-medium leading-none transition-colors hover:bg-black/[0.04] md:block dark:hover:bg-white/[0.07]"
            style={{ color: L.muted }}
          >
            登录
          </Link>
          <Link
            href="/dashboard"
            className="group inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-6 text-[14px] font-semibold transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            style={{ background: L.emerald300, color: L.neutral950 }}
          >
            免费开始
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <button
            type="button"
            aria-label="菜单"
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05] md:hidden"
            style={{ color: L.ink }}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </motion.nav>

      {/* 移动端下拉 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mx-auto mt-2 w-[min(100%-2rem,80rem)] overflow-hidden rounded-[20px] border border-black/[0.06] bg-white/95 p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] backdrop-blur-xl md:hidden dark:border-white/[0.09] dark:bg-[#161B17]/95"
          >
            {pageLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:bg-black/[0.04]"
                style={{ color: L.muted }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors hover:bg-black/[0.04]"
              style={{ color: L.muted }}
            >
              登录
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
