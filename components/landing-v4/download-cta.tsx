"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CONTAINER, L, L_MIX, SHADOW, fadeUp } from "./shared";
import { IconArrowRightUp, IconBookOpen } from "@/components/icon";

/* ------------------------------------------------------------
   尾屏 —— 对齐 loomy.xunfei.cn 的 `DownloadCta` + `LandingFooter`
     DownloadCta  content 居中、padding 112px 0
                  h2 flex 基线对齐 gap 5.4px，45px/700/-1.575px
                     第二段用 100deg 蓝→绿渐变裁字
                  副文案 19.44px/500/31.104px #696969，上边距 20px
                  actions gap 32px，上边距 44px
                     深色组 337×64 胶囊（主按钮 285×64 + 52×64 右段，1px 白/18 分隔）
                     次要 208×64 #5EE9B5 胶囊墨字
     LandingFooter  informationPanel padding 60px 0 75px
                    容器 max-width 63rem
                    栏目 grid：4 个 auto 列 + 1 个 1fr 列；Loomy 列距 150px，但我们的
                    栏目名/邮箱更长，150px 会把 auto 列挤到断字（"服务条/款"），
                    实测上限 ~116px，取 112px（7rem）
                    栏目标题 18px/700/27px，链接 15px/400/22.5px，短文本 nowrap 兜底
                    底部法务行：居中、gap 15px、上边距 52.5px，1×15 竖线分隔
   ------------------------------------------------------------ */

const FOOTER_COLS = [
  {
    title: "服务条款",
    links: [
      { label: "用户协议", href: "/terms" },
      { label: "隐私政策", href: "/privacy" },
    ],
  },
  {
    title: "文档指引",
    links: [
      { label: "套餐方案", href: "/#plan" },
      { label: "订阅方案", href: "/subscription" },
    ],
  },
  {
    title: "产品入口",
    links: [
      { label: "网页控制台", href: "/dashboard" },
      { label: "AI 助理", href: "/ai-assistant" },
      { label: "移动端", href: "/profile" },
    ],
  },
  {
    title: "联系我们",
    links: [
      { label: "建议反馈", href: "mailto:hello@stravision.site" },
      { label: "售前咨询", href: "mailto:hello@stravision.site" },
    ],
  },
];

export function DownloadCta() {
  return (
    <section
      className="flex min-h-[38rem] items-center overflow-hidden bg-white dark:bg-[#101411]"
      style={{
        backgroundImage: `radial-gradient(circle at 17% 32%, color-mix(in srgb, var(--lg-mix-download-blue) 70%, transparent) 0%, transparent 38%), radial-gradient(circle at 84% 68%, color-mix(in srgb, var(--lg-mix-download-mint) 90%, transparent) 0%, transparent 40%)`,
      }}
    >
      <div className={`flex w-full flex-col items-center justify-center py-28 text-center ${CONTAINER}`}>
        <motion.h2
          {...fadeUp()}
          className="m-0 flex flex-wrap items-baseline justify-center gap-x-[0.34rem]"
          style={{
            color: L.ink,
            fontSize: "clamp(2.125rem, 3.125vw, 2.8125rem)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
          }}
        >
          <span>现在，把大棚交给</span>
          <span
            style={{
              backgroundImage: `linear-gradient(100deg, ${L.brandSecondary} 0%, ${L.accentStrong} 72%, ${L.emerald300} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            莓界
          </span>
        </motion.h2>

        <motion.p
          {...fadeUp(0.06)}
          className="mt-5 text-[1.215rem] font-medium leading-[1.6]"
          style={{ color: L.muted }}
        >
          网页端覆盖 Windows、macOS 与手机浏览器，打开就能用。
        </motion.p>

        <motion.div
          {...fadeUp(0.12)}
          className="mt-11 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-stretch sm:gap-8"
        >
          {/* 主按钮组：深浅色互换的胶囊（浅色墨底白字 / 深色白底墨字） */}
          <div
            className="flex items-stretch overflow-hidden rounded-full"
            style={{ background: L.btnBg, color: L.btnFg, boxShadow: SHADOW.dark }}
          >
            <Link
              href="/dashboard"
              className="flex h-16 items-center justify-center gap-[0.9rem] py-[0.55rem] pl-10 pr-8 transition-opacity duration-200 hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="size-[1.4rem] rounded-md" />
              <span className="flex flex-col items-start">
                <strong className="text-[1.05rem] font-extrabold leading-[1.2]">
                  进入网页控制台
                </strong>
                <small
                  className="mt-[0.15rem] text-[0.75rem] font-medium leading-[1.2]"
                  style={{ color: "color-mix(in srgb, currentColor 62%, transparent)" }}
                >
                  支持 Windows / macOS / 移动端
                </small>
              </span>
            </Link>
            <Link
              href="/docs"
              aria-label="查看产品文档"
              className="flex h-16 w-[52px] items-center justify-center border-l transition-colors duration-200 hover:opacity-75"
              style={{ borderColor: "color-mix(in srgb, currentColor 20%, transparent)" }}
            >
              <IconArrowRightUp className="size-[1.15rem]" />
            </Link>
          </div>

          {/* 次要：薄荷绿胶囊 */}
          <Link
            href="/subscription"
            className="inline-flex h-16 items-center justify-center gap-[0.45rem] rounded-full px-6 text-[1rem] font-bold transition-[transform,opacity] duration-200 hover:-translate-y-0.5"
            style={{ background: L.emerald300, color: L.neutral950 }}
          >
            <IconBookOpen className="size-[1.15rem]" />
            查看订阅方案
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-white dark:bg-[#0C110E]">
      <div className="pt-[3.75rem] pb-[4.7rem]">
        <div className="mx-auto w-[min(100%-2rem,63rem)]">
          <div className="grid gap-y-8 sm:grid-cols-2 lg:grid-cols-[repeat(4,auto)_1fr] lg:gap-x-[7rem]">
            {FOOTER_COLS.map((col) => (
              <section key={col.title} className="whitespace-nowrap">
                <p className="m-0 text-[1.125rem] font-bold leading-[1.5]" style={{ color: L.ink }}>
                  {col.title}
                </p>
                <div className="mt-[0.9375rem] grid gap-[0.9375rem]">
                  {col.links.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-[0.9375rem] leading-[1.5] transition-colors duration-200 hover:opacity-60"
                      style={{ color: L.ink }}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </section>
            ))}

            {/* 第 5 列：联系方式 */}
            <section className="whitespace-nowrap lg:min-w-[10.5rem]">
              <p className="m-0 text-[1.125rem] font-bold leading-[1.5]" style={{ color: L.ink }}>
                联系方式
              </p>
              <div className="mt-[0.9375rem] grid gap-[0.9375rem]">
                <a
                  href="mailto:hello@stravision.site"
                  className="text-[0.9375rem] leading-[1.5] transition-colors duration-200 hover:opacity-60"
                  style={{ color: L.ink }}
                >
                  客服邮箱：hello@stravision.site
                </a>
                <span className="text-[0.9375rem] leading-[1.5]" style={{ color: L.ink }}>
                  服务时间：工作日 9:00 - 18:00
                </span>
              </div>
            </section>
          </div>

          {/* 底部法务行 */}
          <div className="mt-[3.28rem] flex flex-wrap items-center justify-center gap-[0.9375rem] text-[0.9375rem] leading-[1.5]">
            <span style={{ color: L.ink }}>
              © 2026 Stravision（莓界 Berry Realm）保留所有权利
            </span>
            <span aria-hidden className="h-[0.9375rem] w-px" style={{ background: L.ink }} />
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-200 hover:opacity-60"
              style={{ color: L.ink }}
            >
              浙ICP备2025215987号-2
            </a>
            <span aria-hidden className="h-[0.9375rem] w-px" style={{ background: L.ink }} />
            <span style={{ color: L.muted }}>让每一座大棚，都有属于自己的大脑</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
