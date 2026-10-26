"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Col, Row, Typography } from "antd";
import { L, L_MIX, SHADOW } from "@/components/landing-v4/shared";
import { IconArrowRightUp, IconCheck } from "@/components/icon";

const { Title, Text, Paragraph } = Typography;

/* 浅底上可读的绿：只用于细线条与小图标（Loomy 的主题色不铺大面积） */
const GREEN_INK = L.navHover; // #059669

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/* -------------------------------------------------- */
/* Plan —— 定价区（对齐 Loomy：细边框卡 + 胶囊按钮）      */
/* -------------------------------------------------- */

const PLANS = [
  {
    tag: "体验版",
    price: "限时免费",
    priceUnit: "",
    desc: "轻量开启 AI 种植体验",
    cta: { label: "免费试用", href: "/dashboard" },
    features: [
      "每月 500 AI 积分",
      "AI 助理对话 · 种植问答",
      "单棚数字孪生可视",
      "环境实时监测",
    ],
  },
  {
    tag: "Plus 版",
    price: "¥20",
    priceUnit: "/月 · ¥200/年",
    desc: "自动化种植的入门之选",
    cta: { label: "查看套餐", href: "/subscription" },
    features: [
      "每月 2000 AI 积分",
      "自动化规则执行",
      "多棚分区管理",
      "异常告警推送",
    ],
  },
  {
    tag: "Pro 版",
    highlight: true,
    price: "¥45",
    priceUnit: "/月 · ¥450/年",
    desc: "推荐个人种植户与合作社选用",
    cta: { label: "查看套餐", href: "/subscription" },
    features: [
      "更大积分额度 · 加量包",
      "全部 AI 能力（分析/报告/巡检）",
      "自动化策略不限量",
      "摄像头 AI 巡检",
      "优先技术支持",
    ],
  },
  {
    tag: "私有化部署",
    price: "按需报价",
    priceUnit: "",
    desc: "数据完全本地，资源独享",
    cta: { label: "联系我们", href: "mailto:hello@stravision.site" },
    features: [
      "数据 100% 存在你自己的服务器",
      "专属服务器部署",
      "定制集成与设备接入",
      "专人对接支持",
    ],
  },
];

export function Faq() {
  return (
    <section id="plan" className="bg-white py-24 md:py-32">
      <div className="mx-auto w-[min(100%-2rem,80rem)]">
        <motion.div {...fadeUp()} className="text-center">
          <Title
            level={2}
            className="!mb-0"
            style={{
              color: L.ink,
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            选择适合的方案
          </Title>
          <Paragraph className="mt-3 !mb-0 !text-[14px]" style={{ color: L.muted }}>
            支持月付 / 年付，按需选择适合你的方案
          </Paragraph>
        </motion.div>

        <motion.div
          {...fadeUp(0.1)}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PLANS.map((plan) => (
            <div
              key={plan.tag}
              className="relative flex flex-col rounded-[1.75rem] border bg-white p-6 transition-all duration-300"
              style={
                plan.highlight
                  ? { borderColor: L.accentStrong, boxShadow: SHADOW.soft }
                  : { borderColor: "rgba(34,34,34,0.10)" }
              }
            >
              <span
                className="w-fit rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={
                  plan.highlight
                    ? { background: L.mint, color: GREEN_INK }
                    : { background: L_MIX.idle, color: L.muted }
                }
              >
                {plan.tag}
              </span>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[24px] font-bold tracking-tight" style={{ color: L.ink }}>
                  {plan.price}
                </span>
                {plan.priceUnit && (
                  <span className="text-[12px] font-medium" style={{ color: L.muted }}>
                    {plan.priceUnit}
                  </span>
                )}
              </div>

              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: L.muted }}>
                {plan.desc}
              </p>

              <Link
                href={plan.cta.href}
                className={`mt-5 inline-flex h-11 items-center justify-center rounded-full text-[14px] font-semibold transition-all active:scale-[0.97] ${
                  plan.cta.label === "联系我们" ? "border bg-white hover:bg-[#fafafa]" : "hover:opacity-90"
                }`}
                style={
                  plan.cta.label === "联系我们"
                    ? { borderColor: "rgba(34,34,34,0.16)", color: L.ink }
                    : { background: L.neutral950, color: L.surface }
                }
              >
                {plan.cta.label}
              </Link>

              <div className="mt-6 border-t pt-5" style={{ borderColor: L.hairline }}>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[13px]"
                      style={{ color: L.muted }}
                    >
                      <IconCheck
                        className="mt-0.5 size-4 shrink-0"
                        strokeWidth={3}
                        style={{ color: GREEN_INK }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.18)} className="mt-10 flex justify-center">
          <Link
            href="/subscription"
            className="inline-flex h-12 items-center gap-2.5 rounded-full pl-5 pr-6 text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: L.neutral950, color: L.surface }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-6 rounded-lg" />
            查看完整套餐
            <IconArrowRightUp className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------- */
/* CTA + Footer                                        */
/* -------------------------------------------------- */

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

export function Closing() {
  return (
    <>
      {/* CTA —— 左侧文案 + 右侧吉祥物贴底（Loomy 尾部下载区版式） */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(circle at 80% 26%, ${L_MIX.downloadBlue} 0%, transparent 46%), linear-gradient(180deg, ${L.mint} 0%, ${L.surface} 100%)`,
        }}
      >
        <Row
          justify="center"
          align="middle"
          gutter={[32, 32]}
          className="!mx-auto w-[min(100%-2rem,80rem)]"
        >
          <Col xs={24} md={12} lg={11} className="lg:!pl-0">
            <motion.div {...fadeUp()} className="py-16 md:py-28">
              <Text strong className="!text-[13px] !tracking-[0.18em]" style={{ color: GREEN_INK }}>
                即刻开始
              </Text>
              <Title
                level={2}
                className="!mt-3 !mb-0"
                style={{
                  color: L.ink,
                  fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.22,
                  letterSpacing: "-0.02em",
                }}
              >
                现在，把大棚
                <br />
                交给
                <span style={{ color: GREEN_INK }}>莓界</span>。
              </Title>
              <Paragraph
                className="mt-5 max-w-md !mb-0 !text-[16px] !leading-[1.8]"
                style={{ color: L.muted }}
              >
                注册即可进入控制台，连上你的第一座数字大棚，只差一步。
              </Paragraph>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
                  style={{ background: L.neutral950, color: L.surface }}
                >
                  进入控制台
                  <IconArrowRightUp className="size-4" />
                </Link>
                <Link
                  href="/subscription"
                  className="inline-flex h-12 items-center rounded-full border bg-white/70 px-7 text-[14px] font-semibold backdrop-blur transition-all hover:bg-white active:scale-[0.97]"
                  style={{ borderColor: "rgba(34,34,34,0.16)", color: L.ink }}
                >
                  查看订阅方案
                </Link>
              </div>
            </motion.div>
          </Col>

          <Col xs={24} md={12} lg={13} className="!self-stretch">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="landing-cta-figure relative h-full overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/plantingxiaozhi.png"
                alt="莓小智"
                className="absolute inset-y-0 right-0 h-full w-auto max-w-none object-contain object-right max-md:static max-md:mx-auto max-md:h-auto max-md:w-full"
                style={{ filter: "drop-shadow(0 24px 48px rgba(34,34,34,0.12))" }}
              />
            </motion.div>
          </Col>
        </Row>
      </section>

      {/* Footer —— 四张链接卡 + 巨型品牌水印 + 版权条 */}
      <footer className="bg-white pt-12">
        <div className="mx-auto w-[min(100%-2rem,80rem)]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FOOTER_COLS.map((col) => (
              <div
                key={col.title}
                className="min-h-[210px] rounded-2xl p-7"
                style={{ background: L_MIX.idle }}
              >
                <div className="flex items-center gap-2 text-[14px] font-bold" style={{ color: L.ink }}>
                  <span aria-hidden className="size-1.5" style={{ background: L.ink }} />
                  {col.title}
                </div>
                <div className="mt-3.5 border-t" style={{ borderColor: L.hairline }} />
                <ul className="mt-5 space-y-3.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-[13px] transition-colors hover:text-[#222222]"
                        style={{ color: L.muted }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 巨型品牌水印 */}
        <div aria-hidden className="mt-14 select-none overflow-hidden">
          <div className="flex items-end justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="mb-[1.5vw] h-[8vw] max-h-28 w-auto grayscale"
              style={{ filter: "grayscale(1) brightness(1.35) contrast(0.35)" }}
            />
            <span
              className="whitespace-nowrap text-[12.5vw] font-bold leading-[0.85] tracking-tight"
              style={{ color: "#EDEDED" }}
            >
              STRAVISION
            </span>
          </div>
        </div>

        {/* 版权条 */}
        <div className="border-t" style={{ borderColor: L.hairline }}>
          <div
            className="mx-auto flex w-[min(100%-2rem,80rem)] flex-col gap-2 py-6 text-[12px] md:flex-row md:items-center md:justify-between"
            style={{ color: L.muted }}
          >
            <p>
              版权 © 2026 Stravision（莓界 Berry Realm）保留所有权利
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 transition-colors hover:text-[#222222]"
              >
                浙ICP备2025215987号-2
              </a>
            </p>
            <div className="md:text-right">
              <p>
                联系我们：
                <a
                  href="mailto:hello@stravision.site"
                  className="transition-colors hover:text-[#222222]"
                >
                  hello@stravision.site
                </a>
              </p>
              <p>让每一座大棚，都有属于自己的大脑</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
