"use client"

import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Mail } from "lucide-react"
import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { icon: Github, href: "https://github.com", label: "GitHub" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Mail, href: "mailto:contact@stravision.site", label: "Email" },
  ]

  return (
    <footer className="relative bg-white border-t border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 主要内容 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          {/* 品牌 */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h3 className="text-xl font-black font-alimama tracking-tight text-zinc-900">
              StraVision
            </h3>
            <p className="text-sm text-zinc-500 text-center md:text-left max-w-xs">
              智能农业管理平台
            </p>
          </div>

          {/* 快速链接 */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <Link href="/ai-assistant" className="text-zinc-600 hover:text-zinc-900 transition-colors">
              AI 助手
            </Link>
            <Link href="/device-control" className="text-zinc-600 hover:text-zinc-900 transition-colors">
              设备控制
            </Link>
            <Link href="/monitor" className="text-zinc-600 hover:text-zinc-900 transition-colors">
              数据监控
            </Link>
            <Link href="/docs" className="text-zinc-600 hover:text-zinc-900 transition-colors">
              文档
            </Link>
            <Link href="/about" className="text-zinc-600 hover:text-zinc-900 transition-colors">
              关于
            </Link>
          </div>

          {/* 社交链接 */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-all"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" strokeWidth={2} />
              </a>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-full h-px bg-zinc-100 mb-6" />

        {/* 底部信息 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>
            © {currentYear} StraVision. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
              隐私政策
            </Link>
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">
              服务条款
            </Link>
            <span>浙ICP备2025215987号-2</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
