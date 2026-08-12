"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Github, Twitter, Mail, Plus } from "lucide-react";
import { MagneticButton, Marquee, EASE } from "./ui-primitives";

/* ============================================================
   FOOTER —— 大胆收尾 CTA + 极简编辑式页脚 · 重新设计
   · 全屏暗场，巨字 "Berry Realm" 横向视差位移 + 跑马灯词条
   · 磁性主 CTA + 次级文字链
   · 直角分隔线，等宽落款
   ============================================================ */
export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  const titleX = useTransform(scrollYProgress, [0, 1], ["8vw", "-8vw"]);
  const titleScale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.7], [0, 0.5]);
  // 跑马灯反向位移（与主标视差）
  const marqueeY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Github, href: "https://github.com", label: "GitHub" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Mail, href: "mailto:contact@stravision.site", label: "Email" },
  ];

  const quickLinks = [
    { label: "AI 助手", href: "/ai-assistant" },
    { label: "设备控制", href: "/device-control" },
    { label: "数据监控", href: "/monitor" },
    { label: "文档", href: "/docs" },
  ];

  return (
    <footer ref={ref} className="relative bg-[#08080A] text-white overflow-hidden">
      {/* 顶部章节标记（克制版）*/}
      <div className="pt-32">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
              06 / 邀请
            </span>
            <span className="block w-12 h-px bg-white/10" />
            <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
              The Invitation
            </span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase hidden sm:inline">
            end · vol.04
          </span>
        </div>
      </div>

      {/* 背景单色辉光 */}
      <motion.div
        style={{ opacity: glowOpacity }}
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className="w-[100vw] h-[100vw] max-w-[1200px] max-h-[1200px]"
          style={{
            background:
              "radial-gradient(circle, rgba(22,119,255,0.14) 0%, transparent 60%)",
          }}
        />
      </motion.div>

      {/* 主 CTA 区 */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 pt-24 sm:pt-32 pb-20">
        {/* 引导小标 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 mb-10"
        >
          <span className="block w-1.5 h-1.5 bg-[#1677ff]" />
          <span className="font-mono text-[12px] tracking-[0.3em] text-[#1677ff] uppercase">
            — 开始
          </span>
          <span className="flex-1 h-px bg-white/10 max-w-[200px]" />
        </motion.div>

        {/* 巨字主标 —— 横向视差 */}
        <motion.h2
          style={{ x: titleX, scale: titleScale }}
          className="font-alimama font-medium text-white text-center leading-[0.85] mb-10 whitespace-nowrap"
        >
          <motion.span
            initial={{ opacity: 0, y: 40, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE as any }}
            className="block"
            style={{ fontSize: "clamp(64px, 16vw, 240px)", letterSpacing: "-0.055em" }}
          >
            Berry Realm
          </motion.span>
        </motion.h2>

        {/* 跑马灯巨字词条 —— 横向滚动 */}
        <motion.div style={{ y: marqueeY }} className="mb-12 -mt-4">
          <Marquee duration={28} separator={<FooterSep />}>
            <FooterTerm>对话即决策</FooterTerm>
            <FooterTerm>感知即守护</FooterTerm>
            <FooterTerm>智能不越权</FooterTerm>
            <FooterTerm>每一颗草莓都被精准照料</FooterTerm>
          </Marquee>
        </motion.div>

        {/* 副标 */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-center text-white/55 text-[16px] sm:text-[18px] leading-[1.7] max-w-[520px] mx-auto mb-12"
        >
          把农事交给对话，把决策交给证据——
          <br />
          让每一颗草莓，都被精准照料。
        </motion.p>

        {/* CTA 按钮 —— 磁性 + 文字链 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24"
        >
          <MagneticButton
            href="/dashboard"
            className="group inline-flex items-center bg-white text-black px-8 py-4 text-[14px] tracking-[0.18em] uppercase transition-colors duration-300 hover:bg-[#1677ff] hover:text-white"
          >
            进入莓界
            <ArrowUpRight
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              strokeWidth={1.75}
            />
          </MagneticButton>
          <Link
            href="/ai-assistant"
            data-cursor="hover"
            className="group inline-flex items-center gap-2 text-[14px] tracking-[0.18em] uppercase text-white/70 hover:text-white transition-colors"
          >
            <span className="relative">
              体验 AI 助理
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </span>
          </Link>
        </motion.div>

        {/* 页脚信息条 —— 直角栅格 */}
        <div className="border-t border-white/10 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            {/* 品牌 —— 占 5 */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <Link href="/" className="flex items-center gap-3 w-fit">
                <span className="block w-2 h-2 bg-white" />
                <span className="font-alimama font-medium text-[18px] tracking-tight">
                  莓界 Berry Realm
                </span>
              </Link>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-xs">
                AI 驱动的智慧农业平台——让每一寸土地都孕育生机。
              </p>
              <div className="flex items-center gap-2 mt-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    data-cursor="hover"
                    className="w-9 h-9 border border-white/15 hover:border-white/40 hover:bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all"
                  >
                    <s.icon className="w-4 h-4" strokeWidth={1.75} />
                  </a>
                ))}
              </div>
            </div>

            {/* 导航 —— 占 3 */}
            <div className="md:col-span-3 md:col-start-7 flex flex-col gap-3">
              <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase mb-1">
                导航
              </span>
              {quickLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  data-cursor="hover"
                  className="group flex items-center gap-2 text-[14px] text-white/60 hover:text-white transition-colors w-fit"
                >
                  <ArrowUpRight
                    className="w-3 h-3 text-white/20 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
                    strokeWidth={1.75}
                  />
                  {l.label}
                </Link>
              ))}
            </div>

            {/* 法律 —— 占 3 */}
            <div className="md:col-span-3 md:col-start-10 flex flex-col gap-3 md:items-end">
              <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase mb-1">
                法律
              </span>
              <Link
                href="/privacy"
                data-cursor="hover"
                className="text-[14px] text-white/60 hover:text-white transition-colors w-fit"
              >
                隐私政策
              </Link>
              <Link
                href="/terms"
                data-cursor="hover"
                className="text-[14px] text-white/60 hover:text-white transition-colors w-fit"
              >
                服务条款
              </Link>
              <span className="font-mono text-[11px] tracking-[0.15em] text-white/30 mt-2">
                浙ICP备2025215987号-2
              </span>
            </div>
          </div>

          {/* 底栏 —— 等宽 */}
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] tracking-[0.2em] text-white/30 uppercase">
            <span>© {currentYear} StraVision · Berry Realm</span>
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="block w-1.5 h-1.5 bg-[#1677ff]"
              />
              系统运行正常
            </span>
            <span>End · Vol.04</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   FOOTER TERM / SEP —— 跑马灯词条与分隔
   ============================================================ */
function FooterTerm({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-alimama font-medium text-[clamp(40px,5vw,80px)] text-white/[0.08] px-8 leading-none whitespace-nowrap">
      {children}
    </span>
  );
}

function FooterSep() {
  return (
    <span className="inline-flex items-center px-8">
      <Plus className="w-6 h-6 text-[#1677ff]/40" strokeWidth={1.5} />
    </span>
  );
}
