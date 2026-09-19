"use client"

import { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

/**
 * 登录 / 注册共用的卡片外壳（新视觉）。
 *
 * 之前登录页用的是这套新视觉，而注册页还在用 components/auth/auth-layout.tsx
 * 那套旧样式（暖米灰底 #e4e2dd + 黑色胶囊导航 + 左右分栏视频），两页观感割裂。
 * 现在两页都直接用本组件，视觉只有一处出处；旧的 auth-layout.tsx 已删除。
 *
 * 组成：
 *   - 纯白底 + 左下柠檬黄 / 右上薄荷绿两处柔光斑
 *   - 左上角品牌（/logo.png + 莓界）
 *   - 居中 400px 圆角卡：顶部美术图区（浅绿底 h-44）+ 白色弧形收边
 *   - 卡内：标题（AlimamaShuHeiTi 22px）/ 副标题（13px #999）/ children
 *
 * 约定：children 里的表单控件统一用 `h-12 rounded-[10px] border-[#e5e5e5]`
 * 细边框（聚焦 `ring-[#4ED18F]/60`）、提交钮 `h-12 rounded-[10px] bg-[#111]`、
 * 链接色 `text-[#009456]`。改外壳或改这套控件语言时，两页会同时生效。
 */

/** 默认顶部美术（与登录页一致） */
export const DEFAULT_AUTH_ART = "/web/login/memory.png"

interface AuthCardShellProps {
  title: string
  subtitle: string
  /** 顶部美术图地址 */
  artSrc?: string
  /** 美术图 alt（纯装饰时留空） */
  artAlt?: string
  /** 美术图 object-position，默认与登录页一致 */
  artPosition?: string
  /** 卡片内部、副标题之下的内容 */
  children: ReactNode
}

export function AuthCardShell({
  title,
  subtitle,
  artSrc = DEFAULT_AUTH_ART,
  artAlt = "莓小智",
  artPosition = "center 22%",
  children,
}: AuthCardShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white font-sans">
      {/* 背景光斑：左下柠檬黄 + 右上薄荷绿 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 44% at 4% 96%, rgba(255,248,94,0.35) 0%, transparent 70%), radial-gradient(46% 48% at 97% 6%, rgba(117,255,159,0.30) 0%, transparent 70%)",
        }}
      />

      {/* 左上品牌 */}
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2.5"
        aria-label="莓界 Berry Realm 首页"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-8 rounded-[10px] object-cover" />
        <span
          className="text-[17px] font-extrabold tracking-tight text-[#222]"
          style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}
        >
          莓界
        </span>
      </Link>

      {/* 居中卡片 */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] overflow-hidden rounded-[20px] bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04]"
        >
          {/* 顶部美术 + 白色曲线收边 */}
          <div className="relative h-44 overflow-hidden bg-[#F3FAF5]">
            <Image
              src={artSrc}
              alt={artAlt}
              fill
              sizes="400px"
              className="object-cover"
              style={{ objectPosition: artPosition }}
              priority
            />
            <div
              aria-hidden
              className="absolute inset-x-[-10%] bottom-[-34px] h-[68px] rounded-[100%] bg-white"
            />
          </div>

          <div className="px-7 pb-7 pt-4">
            <h1
              className="text-[22px] font-bold leading-tight text-[#1a1a1a]"
              style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}
            >
              {title}
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#999]">{subtitle}</p>

            {children}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
