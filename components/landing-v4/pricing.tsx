"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CONTAINER, L, L_MIX, SECTION_TITLE, SHADOW, fadeUp } from "./shared";
import { IconArrowRightUp, IconCheck } from "@/components/icon";

/* ------------------------------------------------------------
   定价区 —— 沿用 Loomy 的卡片语言（细边框 + 28px 圆角 + 胶囊按钮）
   Loomy 官网没有定价区，这一块保持同一套令牌自建，不引入新配色。
   ------------------------------------------------------------ */

const PLANS = [
  {
    tag: "体验版",
    price: "限时免费",
    priceUnit: "",
    desc: "轻量开启 AI 种植体验",
    cta: { label: "免费试用", href: "/dashboard" },
    features: ["每月 500 AI 积分", "AI 助理对话 · 种植问答", "单棚数字孪生可视", "环境实时监测"],
  },
  {
    tag: "Plus 版",
    price: "¥20",
    priceUnit: "/月 · ¥200/年",
    desc: "自动化种植的入门之选",
    cta: { label: "查看套餐", href: "/subscription" },
    features: ["每月 2000 AI 积分", "自动化规则执行", "多棚分区管理", "异常告警推送"],
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
      "全部 AI 能力（分析 / 报告 / 巡检）",
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
    features: ["数据 100% 存在你自己的服务器", "专属服务器部署", "定制集成与设备接入", "专人对接支持"],
  },
];

export function Pricing() {
  return (
    <section id="plan" className="bg-white py-28 dark:bg-[#0C110E]">
      <div className={CONTAINER}>
        <motion.div {...fadeUp()} className="max-w-[40rem]">
          <h2 className="m-0" style={SECTION_TITLE}>
            选择适合的方案
          </h2>
          <p className="mt-4 text-[1.215rem] font-medium leading-[1.6]" style={{ color: L.muted }}>
            支持月付 / 年付，按需选择适合你的方案
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(0.1)}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {PLANS.map((plan) => (
            <div
              key={plan.tag}
              className="relative flex flex-col rounded-[1.75rem] border bg-white p-8 transition-[box-shadow,border-color] duration-200 dark:bg-[#151916]"
              style={{
                borderColor: plan.highlight ? L.accentStrong : L.line,
                boxShadow: plan.highlight ? SHADOW.soft : undefined,
              }}
            >
              <span
                className="w-fit rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                style={
                  plan.highlight
                    ? { background: L_MIX.workflowIcon, color: L.greenInk }
                    : { background: L_MIX.idle, color: L.muted }
                }
              >
                {plan.tag}
              </span>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[1.98rem] font-bold leading-[1.25]" style={{ color: L.ink }}>
                  {plan.price}
                </span>
                {plan.priceUnit && (
                  <span className="text-[0.75rem] font-medium" style={{ color: L.muted }}>
                    {plan.priceUnit}
                  </span>
                )}
              </div>

              <p className="mt-2.5 text-[0.8125rem] leading-[1.6]" style={{ color: L.muted }}>
                {plan.desc}
              </p>

              <Link
                href={plan.cta.href}
                className={`mt-6 inline-flex h-14 items-center justify-center gap-[0.65rem] rounded-full text-[1rem] font-bold transition-[opacity,transform] duration-200 hover:-translate-y-0.5 ${
                  plan.cta.label === "联系我们" ? "border bg-white dark:bg-transparent" : ""
                }`}
                style={
                  plan.cta.label === "联系我们"
                    ? { borderColor: L.line, color: L.ink }
                    : { background: L.btnBg, color: L.btnFg }
                }
              >
                {plan.cta.label}
              </Link>

              <div className="mt-7 border-t pt-6" style={{ borderColor: L.hairline }}>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[0.8125rem] leading-[1.6]"
                      style={{ color: L.desc }}
                    >
                      <IconCheck className="mt-0.5 size-4 shrink-0" strokeWidth={3} style={{ color: L.greenInk }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.18)} className="mt-12 flex justify-center">
          <Link
            href="/subscription"
            className="inline-flex h-14 items-center gap-[0.65rem] rounded-full pl-6 pr-7 text-[1rem] font-bold transition-[opacity,transform] duration-200 hover:-translate-y-0.5"
            style={{ background: L.btnBg, color: L.btnFg }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-6 rounded-md" />
            查看完整套餐
            <IconArrowRightUp className="size-[1.15rem]" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
