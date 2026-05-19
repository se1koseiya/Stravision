"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative">
            <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
          </div>
          <span className="text-sm text-muted-foreground">/ support@stravision.ai</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-white transition-colors">功能</Link>
          <Link href="#data" className="hover:text-white transition-colors">数据</Link>
          <Link href="#app" className="hover:text-white transition-colors">应用</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">价格</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-white transition-colors">
            登录
          </Link>
          <Link href="/register">
            <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-5 text-sm font-medium">
              开始使用 <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-[#0a0a0a] border-white/10 text-white p-6">
              <div className="flex flex-col gap-6 mt-8">
                <Link href="#features" className="text-muted-foreground hover:text-white transition-colors">功能</Link>
                <Link href="#data" className="text-muted-foreground hover:text-white transition-colors">数据</Link>
                <Link href="#app" className="text-muted-foreground hover:text-white transition-colors">应用</Link>
                <Link href="#pricing" className="text-muted-foreground hover:text-white transition-colors">价格</Link>
                <div className="h-px bg-white/10 my-2" />
                <Link href="/login" className="text-muted-foreground hover:text-white transition-colors">登录</Link>
                <Link href="/register">
                  <Button className="w-full bg-white text-black hover:bg-gray-200 rounded-full font-medium">
                    开始使用
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Content */}
              <div className="space-y-8">
                <motion.h1 
                  className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  智慧农业<br />
                  <span className="text-muted-foreground">`更简单^</span>
                </motion.h1>

                <motion.div 
                  className="flex items-center gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <div className="w-px h-12 bg-white/20" />
                  <p className="text-muted-foreground text-lg">
                    轻松管理您的<br />智能温室
                  </p>
                  <Link href="/login">
                    <Button className="bg-primary hover:bg-primary text-black rounded-full px-6 font-medium">
                      开始 <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>
              </div>

              {/* Right Content - Dashboard Preview */}
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                {/* Main Dashboard Card */}
                <div className="relative bg-emerald-400 rounded-3xl p-6 overflow-hidden">
                  {/* Decorative Elements */}
                  <div className="absolute top-4 left-4 text-black/20 text-4xl font-bold">✱</div>
                  
                  {/* User Card */}
                  <div className="absolute top-8 left-1/3 bg-[#1a1a1a] rounded-xl px-4 py-2 flex items-center gap-3 shadow-xl">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-sm">A</div>
                    <span className="text-white text-sm font-medium">管理员</span>
                    <span className="bg-primary text-black text-xs px-2 py-0.5 rounded-full">Pro</span>
                  </div>

                  {/* Avatar Group */}
                  <div className="absolute top-8 right-8 flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-emerald-400 flex items-center justify-center text-white text-xs font-bold">Z</div>
                    <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-emerald-400 flex items-center justify-center text-white text-xs font-bold">L</div>
                    <div className="w-8 h-8 rounded-full bg-primary border-2 border-emerald-400 flex items-center justify-center text-xs font-bold">+3</div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="mt-20 mb-8 relative">
                    {/* Project Created Node */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#1a1a1a] rounded-full px-4 py-2 text-white text-sm">
                      项目创建
                    </div>

                    {/* Flow Lines - SVG */}
                    <svg className="w-full h-32" viewBox="0 0 400 100" fill="none">
                      <path d="M80 50 Q150 20 200 50 Q250 80 320 50" stroke="#1a1a1a" strokeWidth="2" fill="none" />
                      <path d="M80 50 Q150 80 200 50" stroke="#1a1a1a" strokeWidth="2" fill="none" />
                    </svg>

                    {/* Bottom Cards */}
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="bg-[#1a1a1a] rounded-xl px-4 py-3 min-w-[120px]">
                        <div className="text-white text-xs mb-1">新请求</div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                          </div>
                          <span className="text-muted-foreground text-xs truncate">传感器数据...</span>
                        </div>
                      </div>
                      <div className="bg-[#1a1a1a] rounded-xl px-4 py-3 min-w-[120px]">
                        <div className="text-white text-xs mb-1">任务分配</div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary" />
                          <span className="text-muted-foreground text-xs">AI 助手</span>
                        </div>
                      </div>
                      <div className="bg-[#1a1a1a] rounded-xl px-4 py-3 min-w-[120px]">
                        <div className="text-white text-xs mb-1">流程启动</div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                          </div>
                          <span className="text-muted-foreground text-xs truncate">自动控制...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Star */}
                  <div className="absolute bottom-4 right-4 text-black/20 text-2xl">✱</div>
                </div>

                {/* Mobile Preview Card */}
                <div className="absolute -right-4 top-1/4 w-48 bg-purple-300 rounded-3xl p-4 shadow-2xl transform rotate-3">
                  <div className="bg-[#1a1a1a] rounded-2xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-white/10" />
                        <div className="w-6 h-6 rounded-full bg-gray-700" />
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">✓ 任务完成</div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-white text-xs font-medium">定时浇灌</div>
                      <div className="text-[10px] text-muted-foreground mt-1">设备:relay7</div>
                    </div>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">负责人</span>
                        <span className="text-white">Zarx</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">截止日期</span>
                        <span className="text-white">7月15-24</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">状态</span>
                        <span className="bg-primary/20 text-emerald-400 px-2 py-0.5 rounded text-[8px]">进行中</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section className="py-12 px-6 lg:px-12 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {/* Stravision 团队 */}
              <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 relative">
                  <Image src="/logo.svg" alt="Stravision" fill className="object-contain" />
                </div>
                <span className="text-sm md:text-base font-semibold tracking-wide text-gray-200 uppercase">Stravision 团队</span>
              </div>
              {/* X 分隔符 */}
              <span className="text-2xl font-bold text-muted-foreground">×</span>
              {/* 宁波城市职业技术学院 Logo */}
              <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                <div className="w-48 h-12 relative">
                  <Image src="/nbcc-logo.png" alt="宁波城市职业技术学院" fill className="object-contain" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left - Big Number */}
              <div>
                <motion.div 
                  className="text-8xl lg:text-[10rem] font-bold leading-none"
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  82.7%
                </motion.div>
                <p className="text-emerald-400 text-lg mt-4">4倍 自动化工作流程效率提升</p>
              </div>

              {/* Right - Content */}
              <div className="space-y-6">
                <h2 className="text-3xl lg:text-4xl font-bold">用 AI 放大您的影响力</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  借助 AI 助手套件，更智能、更快速地工作，最大化您的温室管理效率
                </p>
                <Link href="/login">
                  <Button className="rounded-full px-6 border border-white/30 bg-transparent text-white hover:bg-white/10">
                    开始使用 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Testimonial */}
            <div className="mt-20 flex items-center gap-6">
              <div className="flex -space-x-3">
                <div className="w-12 h-12 rounded-full bg-primary border-2 border-[#0a0a0a] flex items-center justify-center text-white font-bold">Z</div>
                <div className="w-12 h-12 rounded-full bg-purple-600 border-2 border-[#0a0a0a] flex items-center justify-center text-white font-bold">L</div>
                <div className="w-12 h-12 rounded-full bg-gray-600 border-2 border-[#0a0a0a] flex items-center justify-center text-white font-bold">W</div>
              </div>
              <div>
                <p className="text-muted-foreground">
                  与专家交流，了解 Stravision 如何帮助您简化跨部门工作流程。
                </p>
                <p className="text-white font-medium mt-1">Zarx，技术总监</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - 不规则布局 */}
        <section id="features" className="py-24 px-6 lg:px-12 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">核心功能</h2>
              <p className="text-muted-foreground text-lg">全方位的智慧农业解决方案</p>
            </motion.div>

            {/* Bento Grid Layout - 统一深色主题 */}
            <div className="grid grid-cols-12 gap-4 lg:gap-6">
              {/* Card 1 - Large */}
              <motion.div
                className="col-span-12 lg:col-span-7 bg-[#111] rounded-3xl p-8 border border-white/10 min-h-[320px] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                <div>
                  <div className="w-16 h-16 mb-6 relative">
                    <Image src="/animated_icon/Sustainability.gif" alt="环境监测" fill className="object-contain" unoptimized />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">智能环境监测</h3>
                  <p className="text-muted-foreground max-w-md">
                    实时监控温度、湿度、光照、CO2等关键指标，数据可视化展示，历史趋势分析
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <span className="px-3 py-1 bg-white/5 text-gray-300 text-sm rounded-full border border-white/10">温度</span>
                  <span className="px-3 py-1 bg-white/5 text-gray-300 text-sm rounded-full border border-white/10">湿度</span>
                  <span className="px-3 py-1 bg-white/5 text-gray-300 text-sm rounded-full border border-white/10">光照</span>
                </div>
              </motion.div>

              {/* Card 2 - Small */}
              <motion.div
                className="col-span-12 sm:col-span-6 lg:col-span-5 bg-[#111] rounded-3xl p-8 border border-white/10 min-h-[320px] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                <div>
                  <div className="w-16 h-16 mb-6 relative">
                    <Image src="/animated_icon/Chatbot.gif" alt="AI分析" fill className="object-contain" unoptimized />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">AI 智能分析</h3>
                  <p className="text-muted-foreground">
                    基于大模型的智能诊断，提供精准种植建议和病害预警
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Medium */}
              <motion.div
                className="col-span-12 sm:col-span-6 lg:col-span-5 bg-[#111] rounded-3xl p-8 border border-white/10 min-h-[280px] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="absolute -left-16 -top-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                <div>
                  <div className="w-16 h-16 mb-6 relative">
                    <Image src="/animated_icon/phone.gif" alt="移动端" fill className="object-contain" unoptimized />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">移动端支持</h3>
                  <p className="text-muted-foreground">
                    随时随地通过手机管理温室，接收告警通知
                  </p>
                </div>
              </motion.div>

              {/* Card 4 - Large */}
              <motion.div
                className="col-span-12 lg:col-span-7 bg-[#111] rounded-3xl p-8 border border-white/10 min-h-[280px] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500" />
                <div>
                  <div className="w-16 h-16 mb-6 relative">
                    <Image src="/animated_icon/stop.gif" alt="自动化" fill className="object-contain" unoptimized />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">自动化控制</h3>
                  <p className="text-muted-foreground max-w-md">
                    智能联动设备，根据环境数据自动调节温度、湿度、光照等参数，实现无人值守
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">自动运行中</span>
                  </div>
                </div>
              </motion.div>

              {/* Card 5 - Full width */}
              <motion.div
                className="col-span-12 bg-[#111] rounded-3xl p-8 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-white/20 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 relative flex-shrink-0">
                    <Image src="/animated_icon/cloud.gif" alt="云端" fill className="object-contain" unoptimized />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">云端同步</h3>
                    <p className="text-muted-foreground">数据安全存储，多设备实时同步</p>
                  </div>
                </div>
                <Link href="/login">
                  <Button className="bg-primary hover:bg-primary text-black rounded-full px-6 font-medium">
                    立即体验 <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                准备好开始了吗？
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                加入数千名农业从业者，体验 AI 驱动的智慧农业管理平台
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button className="bg-primary hover:bg-primary text-black rounded-full px-8 py-6 text-lg font-medium">
                    免费注册 <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="rounded-full px-8 py-6 text-lg border border-white/30 bg-transparent text-white hover:bg-white/10">
                    登录账户
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
              </div>
              <span className="font-semibold">Stravision 莓界</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-white transition-colors">隐私政策</Link>
              <Link href="#" className="hover:text-white transition-colors">服务条款</Link>
              <Link href="#" className="hover:text-white transition-colors">联系我们</Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 Stravision. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
