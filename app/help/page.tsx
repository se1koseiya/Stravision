"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { 
  Search, 
  HelpCircle, 
  Shield, 
  Cpu, 
  Activity, 
  Settings, 
  ChevronDown, 
  MessageCircle, 
  Mail, 
  ArrowLeft,
  Book,
  FileText
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"

// --- TYPES ---
interface FaqItem {
  question: string
  answer: React.ReactNode
  category: string
}

interface Category {
  id: string
  title: string
  icon: React.ReactNode
  description: string
}

// --- DATA ---
const CATEGORIES: Category[] = [
  {
    id: "account",
    title: "账号与安全",
    icon: <Shield className="w-6 h-6" />,
    description: "登录、密码重置、多因素认证与账户设置"
  },
  {
    id: "devices",
    title: "设备管理",
    icon: <Cpu className="w-6 h-6" />,
    description: "添加设备、远程控制、固件更新与故障排查"
  },
  {
    id: "monitor",
    title: "数据监控",
    icon: <Activity className="w-6 h-6" />,
    description: "实时数据查看、历史记录导出与图表分析"
  },
  {
    id: "settings",
    title: "系统设置",
    icon: <Settings className="w-6 h-6" />,
    description: "通知偏好、界面定制与API密钥管理"
  },
  {
    id: "api",
    title: "开发者文档",
    icon: <TerminalIcon className="w-6 h-6" />,
    description: "API 接口说明、SDK 使用与集成指南"
  },
  {
    id: "billing",
    title: "订阅与账单",
    icon: <FileText className="w-6 h-6" />,
    description: "套餐升级、发票管理与支付问题"
  }
]

const FAQS: FaqItem[] = [
  {
    category: "account",
    question: "忘记密码怎么办？",
    answer: (
      <span>
        如果您忘记了密码，可以在登录页面点击“忘记密码”链接，或者直接访问
        <Link href="/forgot-password" className="text-emerald-400 hover:underline mx-1">
          密码找回页面
        </Link>
        。我们将向您的注册邮箱发送重置验证码。
      </span>
    )
  },
  {
    category: "account",
    question: "如何修改个人资料？",
    answer: (
      <span>
        登录后，点击右上角的头像进入
        <Link href="/profile" className="text-emerald-400 hover:underline mx-1">
          个人中心
        </Link>
        。您可以在那里修改头像、用户名以及通知设置。
      </span>
    )
  },
  {
    category: "devices",
    question: "如何添加新的 IoT 设备？",
    answer: "在设备控制面板中，点击右上角的“+ 添加设备”按钮。按照屏幕上的提示扫描设备二维码或输入设备序列号进行配对。"
  },
  {
    category: "devices",
    question: "设备显示“离线”怎么办？",
    answer: "首先请检查设备是否连接电源并处于 Wi-Fi 覆盖范围内。您可以尝试重启设备。如果问题持续，请检查路由器的防火墙设置是否拦截了设备连接。"
  },
  {
    category: "monitor",
    question: "数据更新频率是多少？",
    answer: "标准用户的传感器数据每 5 分钟更新一次，Pro 版用户支持实时数据流（WebSocket 推送），延迟通常低于 500ms。"
  },
  {
    category: "settings",
    question: "如何开启登录保护（2FA）？",
    answer: "目前我们支持邮箱验证码作为登录保护。您可以在“系统设置” -> “安全”中开启“异地登录提醒”和“登录二次验证”功能。"
  },
  {
    category: "api",
    question: "API Key 有调用频率限制吗？",
    answer: "是的，为了保证系统稳定性，标准 API Key 的调用限制为每分钟 60 次请求。如果您需要更高的调用频率，请联系商务团队升级至企业版。"
  },
  {
    category: "api",
    question: "如何获取 API 访问凭证？",
    answer: (
      <span>
        请前往
        <Link href="/settings" className="text-emerald-400 hover:underline mx-1">
          设置页面
        </Link>
        的“开发者”选项卡，点击“生成新密钥”即可获取。请注意妥善保管您的密钥，不要在客户端代码中直接暴露。
      </span>
    )
  },
  {
    category: "billing",
    question: "支持哪些支付方式？",
    answer: "我们目前支持支付宝、微信支付以及对公转账。企业用户如需开具增值税专用发票，请在支付完成后前往“订单中心”提交开票申请。"
  },
  {
    category: "billing",
    question: "如何取消订阅？",
    answer: "您可以随时在“订阅管理”页面取消下个月的续费。当前周期的服务将持续有效直到周期结束，我们不会进行退款。"
  },
  {
    category: "monitor",
    question: "可以导出历史数据吗？",
    answer: "可以。在数据监控面板右上角点击“导出”按钮，支持 CSV 和 Excel 格式。普通用户最多可导出最近 30 天的数据，Pro 用户支持导出最近 1 年的数据。"
  },
  {
    category: "monitor",
    question: "告警规则如何设置？",
    answer: "在“设备管理”详情页中，找到“告警阈值”设置。您可以针对温度、湿度等指标设置上限和下限，当数据超出范围时，系统将通过邮件或短信发送告警。"
  },
  {
    category: "devices",
    question: "支持哪些品牌的传感器？",
    answer: "Stravision 平台支持标准 MQTT 协议的设备接入。官方认证硬件包括 Stravision Sense 系列、Bosch 环境传感器以及部分支持 Modbus 协议的工业网关。"
  }
]

// --- COMPONENTS ---

const FaqItemComponent = ({ item, isOpen, onClick }: { item: FaqItem, isOpen: boolean, onClick: () => void }) => {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onClick}
        className="w-full py-4 flex items-center justify-between text-left group"
      >
        <span className={`text-sm md:text-base font-medium transition-colors duration-300 ${isOpen ? "text-emerald-400" : "text-white/80 group-hover:text-white"}`}>
          {item.question}
        </span>
        <ChevronDown 
          className={`w-5 h-5 text-white/40 transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-500" : ""}`} 
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-white/60 leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TerminalIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
        </svg>
    )
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredFaqs = FAQS.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (typeof faq.answer === 'string' && faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory ? faq.category === selectedCategory : true

    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-sm text-white/40 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            返回仪表盘
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 tracking-tight">
              需要什么帮助？
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              搜索常见问题，浏览使用指南，或者直接联系我们的支持团队。
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mt-8 group">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-xl focus-within:border-emerald-500/50 focus-within:bg-white/10 transition-all duration-300">
                <Search className="w-6 h-6 text-white/40 ml-3" />
                <input
                  type="text"
                  placeholder="搜索问题，例如：如何重置密码..."
                  className="w-full bg-transparent border-none text-white placeholder:text-white/30 focus:ring-0 text-lg px-4 py-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Categories Grid */}
        {!searchQuery && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16"
          >
            {CATEGORIES.map((cat, idx) => (
              <GlassCard
                key={cat.id}
                className={`p-6 cursor-pointer group transition-all duration-300 border border-white/5 hover:border-emerald-500/30 ${selectedCategory === cat.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'hover:bg-white/5'}`}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${selectedCategory === cat.id ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/60 group-hover:bg-emerald-500/20 group-hover:text-emerald-400'}`}>
                  {cat.icon}
                </div>
                <h3 className="text-lg font-medium text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {cat.description}
                </p>
              </GlassCard>
            ))}
          </motion.div>
        )}

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-emerald-500" />
              常见问题
            </h2>
            {selectedCategory && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedCategory(null)}
                className="text-white/40 hover:text-white"
              >
                显示全部
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => (
                <GlassCard key={idx} className="px-6 py-2">
                  <FaqItemComponent
                    item={faq}
                    isOpen={openFaqIndex === idx}
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  />
                </GlassCard>
              ))
            ) : (
              <div className="text-center py-12 text-white/40">
                <p>没有找到相关结果</p>
                <Button 
                  variant="link" 
                  className="text-emerald-400 mt-2"
                  onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                >
                  清除筛选
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 border-t border-white/10 pt-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">仍未解决问题？</h3>
              <p className="text-white/60 mb-6">
                我们的支持团队随时为您服务。通常我们在 24 小时内回复。
              </p>
              <div className="flex gap-4">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 px-6 gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <MessageCircle className="w-4 h-4" />
                  在线咨询
                </Button>
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl h-11 px-6 gap-2">
                  <Mail className="w-4 h-4" />
                  发送邮件
                </Button>
              </div>
            </div>
            
            <GlassCard className="p-6 bg-gradient-to-br from-emerald-900/20 to-transparent border-emerald-500/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Book className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">查看 API 文档</h4>
                  <p className="text-sm text-white/50 mb-3">
                    如果您是开发者，可以在我们的开发文档中找到详细的接口说明。
                  </p>
                  <Link href="/docs/api" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 group">
                    前往文档 <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
