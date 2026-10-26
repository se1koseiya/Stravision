"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { IconArrowLeft, IconCheck, IconCrown, IconLock, IconMagic } from "@/components/icon";

// --- Animations ---
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  const plans = [
    {
      name: "免费版",
      description: "适合个人体验和简单咨询",
      price: "0",
      features: [
        "每日 10 次对话额度",
        "使用基础模型 (Qwen-Turbo)",
        "标准响应速度",
        "基础农业知识库",
        "社区支持"
      ],
      cta: "当前方案",
      popular: false,
    },
    {
      name: "专业版",
      description: "适合农场主和专业种植户",
      price: billingCycle === "monthly" ? "29.9" : "299",
      features: [
        "每日 100 次对话额度",
        "解锁高级模型 (Qwen-Plus)",
        "优先响应队列",
        "多模态识图诊断 (Beta)",
        "专属客服支持",
        "数据报表导出"
      ],
      cta: "立即升级",
      popular: true,
    },
    {
      name: "企业版",
      description: "适合大型基地和科研机构",
      price: "联系我们",
      features: [
        "无限次对话额度",
        "顶级模型 (Qwen-Max/DeepSeek)",
        "专属私有化知识库",
        "API 接口对接",
        "定制化开发支持",
        "SLA 服务保障"
      ],
      cta: "联系销售",
      popular: false,
    }
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full h-20 px-8 md:px-12 flex items-center justify-between z-50 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900">
        <div className="flex items-center gap-4">
           <Link href="/ai-assistant" className="group flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              <IconArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
              返回助手
           </Link>
        </div>
        <div className="flex items-center gap-4">
           <div className="size-8 relative">
              <Image src="/logo.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
           </div>
           <span className="text-xs font-bold tracking-[0.2em] uppercase hidden md:block opacity-40">Stravision Plans</span>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 sm:px-8 md:px-12 max-w-[1400px] mx-auto">
        
        {/* Header Section */}
        <motion.div 
           initial="hidden" 
           animate="visible" 
           variants={staggerContainer}
           className="mb-20 space-y-8"
        >
           <motion.div variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-zinc-200 dark:border-zinc-800 pb-8">
              <div>
                <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-4">
                  PRICING
                </h1>
                <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl font-light">
                  解锁智慧农业的无限潜能。升级您的 AI 助手，获取更强大的分析能力。
                </p>
              </div>
              
              {/* Billing Toggle - Minimalist */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-none border border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setBillingCycle("monthly")}
                  className={cn(
                    "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors",
                    billingCycle === "monthly" 
                      ? "bg-white dark:bg-black text-zinc-900 dark:text-white shadow-sm" 
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  按月付费
                </button>
                <button 
                  onClick={() => setBillingCycle("yearly")}
                  className={cn(
                    "px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2",
                    billingCycle === "yearly" 
                      ? "bg-white dark:bg-black text-zinc-900 dark:text-white shadow-sm" 
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  按年付费
                  <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-none font-bold">
                    -20%
                  </span>
                </button>
              </div>
           </motion.div>
        </motion.div>

        {/* Plans Grid - Dramatic Gradient Cards */}
        <div className="relative">
          {/* 背景光晕 - 营造氛围 */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(151,90,244,0.25),transparent_70%)] blur-3xl" />
            <div className="absolute top-1/3 right-10 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(47,124,248,0.18),transparent_70%)] blur-3xl" />
            <div className="absolute bottom-10 left-10 w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12),transparent_70%)] blur-3xl" />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center"
          >
            {plans.map((plan, idx) => {
              const isPro = plan.popular
              const isFree = plan.name === "免费版"
              const isEnterprise = plan.name === "企业版"

              // 各版本渐变配置
              const gradient = isPro
                ? "linear-gradient(135deg, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff 100%)"
                : isEnterprise
                  ? "linear-gradient(135deg, #d4af37, #f5d76e 40%, #e8c158 65%, #c9a227 100%)"
                  : "linear-gradient(135deg, #3f3f46, #52525b 40%, #71717a 65%, #3f3f46 100%)"

              const glow = isPro
                ? "shadow-[0_0_60px_-10px_rgba(151,90,244,0.6)]"
                : isEnterprise
                  ? "shadow-[0_0_50px_-15px_rgba(212,175,55,0.5)]"
                  : "shadow-[0_0_30px_-20px_rgba(0,0,0,0.8)]"

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className={cn(
                    "relative rounded-[32px] p-[3px] flex flex-col transition-all duration-300",
                    glow,
                    isPro && "md:scale-110 md:-my-4 z-10"
                  )}
                  style={{ background: gradient }}
                >
                  {/* 卡片内容 - 深色内卡 */}
                  <div className="relative w-full rounded-[29px] p-7 md:p-8 flex flex-col gap-5 bg-[#0d0d12] overflow-hidden">
                    {/* 内卡光效装饰 */}
                    <div
                      className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none"
                      style={{ background: gradient }}
                    />
                    {/* Pro 流光动画 */}
                    {isPro && (
                      <motion.div
                        className="absolute inset-0 opacity-30 pointer-events-none"
                        style={{
                          background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
                        }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
                      />
                    )}

                    {/* 标题 + 图标 */}
                    <div className="relative flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-xl"
                        style={{ background: `${gradient.split(")")[0]})`, opacity: 0.9 }}
                      >
                        {isPro ? (
                          <IconMagic size={16} className="text-white" />
                        ) : isEnterprise ? (
                          <IconCrown size={16} className="text-white" />
                        ) : (
                          <IconLock size={15} className="text-zinc-300" />
                        )}
                      </div>
                    </div>

                    {/* 价格 - 渐变文字 */}
                    <div className="relative flex items-baseline gap-1.5 min-h-[52px]">
                      {plan.price === "联系我们" ? (
                        <span className="text-3xl font-extrabold tracking-tight text-white">{plan.price}</span>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "text-5xl font-extrabold tracking-tighter bg-clip-text text-transparent",
                              isPro
                                ? "bg-[linear-gradient(135deg,#a1a1aa,#71717a,#c4b5fd)]"
                                : isEnterprise
                                  ? "bg-[linear-gradient(135deg,#a1a1aa,#fde68a,#52525B)]"
                                  : "bg-[linear-gradient(135deg,#e4e4e7,#a1a1aa)]"
                            )}
                          >
                            ¥{plan.price}
                          </span>
                          <span className="text-zinc-500 font-mono text-xs">
                            /{billingCycle === "monthly" ? "月" : "年"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* 描述 */}
                    <p className="relative text-xs text-zinc-400 leading-relaxed min-h-[32px]">
                      {plan.description}
                    </p>

                    {/* 分隔线 */}
                    <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* 功能列表 */}
                    <div className="relative flex flex-col gap-3 flex-grow">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs leading-tight">
                          {/* mt-0.5 会把 16px 圆形徽标整体下推 2px，实测图标中心比文字
                              大写高中心低 2.3~3.5px（三张卡共 17 处）。items-start 已让
                              徽标顶边与首行行盒顶对齐，徽标 16px ≈ 行盒 15px，居中即对齐。 */}
                          <div
                            className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full"
                            style={{
                              background: isPro
                                ? "rgba(151,90,244,0.2)"
                                : isEnterprise
                                  ? "rgba(212,175,55,0.2)"
                                  : "rgba(113,113,122,0.2)",
                            }}
                          >
                            <IconCheck
                              size={10}
                              className={
                                isPro ? "text-purple-400"
                                  : isEnterprise ? "text-amber-400"
                                    : "text-zinc-400"
                              }
                            />
                          </div>
                          <span className="text-zinc-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA 按钮 */}
                    <button
                      className={cn(
                        "relative w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer overflow-hidden group",
                        isPro ? "mt-1" : ""
                      )}
                      style={{
                        background: gradient,
                        boxShadow: isPro
                          ? "inset 0 2px 4px rgba(255,255,255,0.5), 0 8px 24px -6px rgba(151,90,244,0.6)"
                          : isEnterprise
                            ? "inset 0 2px 4px rgba(255,255,255,0.4), 0 6px 20px -6px rgba(212,175,55,0.5)"
                            : "inset 0 1px 2px rgba(255,255,255,0.1)",
                      }}
                    >
                      <span className="relative z-10">{plan.cta}</span>
                      {/* 按钮流光 */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
                          }}
                        />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* FAQ or Extra Info Section - Optional, keeping it simple for now */}
        <div className="mt-20 border-t border-zinc-200 dark:border-zinc-800 pt-12 grid md:grid-cols-2 gap-12">
           <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">需要更多定制化服务？</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                 对于大型农场或科研机构，我们可以提供更深度的定制化解决方案，包括私有化部署、API 对接以及专属的数据模型训练服务。
              </p>
           </div>
           <div className="flex items-center justify-end">
              <Link href="/contact" className="text-sm font-bold uppercase tracking-widest text-zinc-900 dark:text-white hover:underline decoration-2 underline-offset-4">
                 联系销售团队 &rarr;
              </Link>
           </div>
        </div>

      </main>
    </div>
  )
}
