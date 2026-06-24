"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Check, ArrowLeft, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

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
              <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
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

      <main className="pt-32 pb-20 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto">
        
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
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-none font-bold">
                    -20%
                  </span>
                </button>
              </div>
           </motion.div>
        </motion.div>

        {/* Plans Grid - Minimalist Grid Layout */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4, duration: 0.5 }}
           className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
        >
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={cn(
                "group relative bg-white dark:bg-black p-8 md:p-12 flex flex-col transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                plan.popular && "z-10 ring-1 ring-emerald-500/20 dark:ring-emerald-500/20"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary dark:text-emerald-400">
                    <Crown size={14} className="fill-emerald-600 dark:fill-emerald-400" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-12">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  {plan.price === "联系我们" ? (
                    <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{plan.price}</span>
                  ) : (
                    <>
                      <span className="text-6xl font-bold tracking-tighter text-zinc-900 dark:text-white">¥{plan.price}</span>
                      <span className="text-zinc-400 font-mono text-sm">/{billingCycle === "monthly" ? "月" : "年"}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 min-h-[40px] leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="flex-grow space-y-4 mb-12">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <Check size={16} className={cn("mt-0.5 shrink-0", plan.popular ? "text-primary dark:text-emerald-400" : "text-zinc-400")} />
                    <span className="leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "w-full h-12 rounded-none font-bold tracking-wide uppercase text-xs transition-all",
                  plan.popular 
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200" 
                    : "bg-white dark:bg-black text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                )}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </motion.div>

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
