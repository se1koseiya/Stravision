"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { motion } from "framer-motion"
import { IconArrowRight, IconCaution, IconChartLine, IconCpu, IconCrown, IconLeaf, IconLightning, IconLogout, IconMagic, IconMail, IconRemind, IconSetting, IconShield } from "@/components/icon";
import { EmptyState } from "@/components/illustration"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import type { UserPublic, MembershipTier } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { clearAlertExpirations, getIgnoredAlerts } from "@/components/environment-alert"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Membership Badge Component
function MembershipBadge({ membership }: { membership?: string }) {
   if (membership === 'plus') {
      return (
         <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 border-0 text-white shadow-lg shadow-indigo-500/20 px-3 py-1 flex items-center gap-1">
            <IconCrown className="w-3.5 h-3.5 fill-current" />
            PLUS 会员
         </Badge>
      )
   }
   if (membership === 'pro') {
      return (
         <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white shadow-lg shadow-orange-500/20 px-3 py-1 flex items-center gap-1">
            <IconMagic className="w-3.5 h-3.5 fill-current" />
            PRO 会员
         </Badge>
      )
   }
   return (
      <Badge variant="outline" className="text-zinc-500 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1">
         普通用户
      </Badge>
   )
}

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

interface UserPublicWithMembership extends UserPublic {
   membership?: MembershipTier
}

import { MembershipCard } from "@/components/dashboard/membership-card"

export default function ProfilePage() {
   const router = useRouter()
   const [user, setUser] = useState<UserPublicWithMembership | null>(null)
   const [loading, setLoading] = useState(true)
   const [ignoredAlerts, setIgnoredAlerts] = useState<{ type: string; expiry: number }[]>([])
   const { connectionStatus } = useDeviceData()

   // Local state
   const [notif, setNotif] = useState<{ alerts: boolean; status: boolean; ai: boolean; updates: boolean }>({
      alerts: true, status: true, ai: false, updates: true
   })
   const [activityLog, setActivityLog] = useState<{ ts: number; text: string }[]>([])
   const [devices, setDevices] = useState<{ id: string; name: string }[]>([])
   const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'devices'>('overview')

   useEffect(() => {
      const fetchUser = async () => {
         try {
            const res = await fetch("/api/auth/me")
            const data = await res.json()
            if (data?.authenticated && data?.user) {
               setUser(data.user)
               if (data.user.notification_settings) setNotif(data.user.notification_settings)
            } else {
               router.replace("/login")
            }
         } catch {
            router.replace("/login")
         } finally {
            setLoading(false)
         }
      }
      fetchUser()

      try {
         const as = JSON.parse(localStorage.getItem("profile_activity") || "[]")
         const ds = JSON.parse(localStorage.getItem("profile_devices") || "[]")
         if (Array.isArray(as)) setActivityLog(as)
         if (Array.isArray(ds)) setDevices(ds)
         setIgnoredAlerts(getIgnoredAlerts())
      } catch { }
   }, [router])

   const handleResetAlertIgnores = () => {
      clearAlertExpirations()
      setIgnoredAlerts([])
      addActivity("重置了所有忽略的告警")
   }

   const handleLogout = () => {
      router.push("/login")
      try { fetch("/api/auth/logout", { method: "POST", keepalive: true }) } catch { }
   }

   const persistNotif = (key: keyof typeof notif, value: boolean) => {
      const next = { ...notif, [key]: value }
      setNotif(next)
      try {
         localStorage.setItem("profile_notifications", JSON.stringify(next))
         addActivity(`更新通知设置: ${key} -> ${value ? '开启' : '关闭'}`)
      } catch { }
   }

   const addActivity = (text: string) => {
      const item = { ts: Date.now(), text }
      const next = [item, ...activityLog].slice(0, 20)
      setActivityLog(next)
      try { localStorage.setItem("profile_activity", JSON.stringify(next)) } catch { }
   }

   if (loading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#050505]">
            <div className="flex flex-col items-center gap-3">
               <div className="size-7 rounded-full border-2 border-zinc-200 border-t-emerald-600 animate-spin dark:border-zinc-800 dark:border-t-emerald-500" />
               <span className="text-xs text-zinc-400">加载中…</span>
            </div>
         </div>
      )
   }
   if (!user) return null

   return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">

         {/* Navigation */}
         <nav className="fixed top-0 w-full h-20 px-8 md:px-12 flex items-center justify-between z-50 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
               <div className="size-8 relative">
                  <Image src="/logo.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
               </div>
               <span className="text-xs font-bold tracking-[0.2em] uppercase hidden md:block opacity-40">Stravision OS</span>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
               <PageNavigation />
            </div>
            <div className="flex items-center gap-6">
               {/* 纯图标按钮：用 flex 居中让图标落在按钮正中（行内基线会让图标偏高约 2px） */}
               <button className="flex h-6 items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  <IconRemind className="size-5" />
               </button>
               <UserAvatarMenu user={user} />
            </div>
         </nav>

         {/* Hero Header */}
         <header className="pt-40 pb-20 px-8 md:px-12 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black relative overflow-hidden">
            <div className="max-w-[1400px] mx-auto relative z-10">
               <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
               >
                  <div className="flex items-center gap-8">
                     <motion.div variants={fadeInUp} className="relative group">
                        <div className="size-32 md:size-40 rounded-full overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 ease-out ring-1 ring-zinc-200 dark:ring-zinc-800">
                           <Avatar className="size-full">
                              <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                              <AvatarFallback className="bg-zinc-100 dark:bg-zinc-900 text-4xl font-light text-zinc-300">
                                 {user.username[0].toUpperCase()}
                              </AvatarFallback>
                           </Avatar>
                        </div>
                        <div className="absolute bottom-1 right-1 size-5 bg-primary rounded-full border-4 border-white dark:border-black" />
                     </motion.div>

                     <motion.div variants={fadeInUp} className="mb-2">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2 flex items-center gap-4">
                           {user.username}
                           <div className="scale-75 origin-left">
                              <MembershipBadge membership={user.membership} />
                           </div>
                        </h1>
                        <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
                           <span>{user.email}</span>
                           <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                           <span className="uppercase tracking-wider">{user.role === 'super_admin' ? '超级管理员' : user.role === 'admin' ? '管理员' : '用户'}</span>
                           <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                           <span>UID: {user.uid?.slice(0, 8)}</span>
                        </div>
                     </motion.div>
                  </div>

                  <motion.div variants={fadeInUp} className="flex gap-12 pb-2">
                     <div className="flex flex-col items-end">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">系统状态</span>
                        <div className="flex items-center gap-2">
                           <div className={cn("size-2 rounded-full", connectionStatus.connected ? "bg-primary" : "bg-red-500")} />
                           <span className="text-xl font-medium">{connectionStatus.connected ? '在线' : '离线'}</span>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">安全等级</span>
                        <div className="flex items-center gap-2">
                           <IconShield className="size-5 text-zinc-900 dark:text-white" />
                           <span className="text-xl font-medium">极佳</span>
                        </div>
                     </div>
                  </motion.div>
               </motion.div>
            </div>

            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-900/20 dark:to-transparent -z-10" />
         </header>

         {/* Content Area */}
         <main className="max-w-[1400px] mx-auto px-8 md:px-12 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">

               {/* Sidebar Navigation */}
               <div className="lg:col-span-3">
                  <div className="sticky top-32 space-y-8">
                     <div className="flex flex-col items-start gap-1">
                        <button
                           onClick={() => setActiveTab('overview')}
                           className={cn(
                              "text-2xl font-bold tracking-tight transition-colors duration-300 hover:text-zinc-900 dark:hover:text-white",
                              activeTab === 'overview' ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"
                           )}
                        >
                           概览
                        </button>
                        <button
                           onClick={() => setActiveTab('devices')}
                           className={cn(
                              "text-2xl font-bold tracking-tight transition-colors duration-300 hover:text-zinc-900 dark:hover:text-white",
                              activeTab === 'devices' ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"
                           )}
                        >
                           设备
                        </button>
                        <button
                           onClick={() => setActiveTab('settings')}
                           className={cn(
                              "text-2xl font-bold tracking-tight transition-colors duration-300 hover:text-zinc-900 dark:hover:text-white",
                              activeTab === 'settings' ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-700"
                           )}
                        >
                           设置
                        </button>
                     </div>

                     <div className="pt-12 border-t border-zinc-100 dark:border-zinc-900">
                        <div className="flex flex-col gap-4">
                           <Button
                              variant="outline"
                              className="w-full justify-between h-12 rounded-none border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                              onClick={handleLogout}
                           >
                              <span>退出登录</span>
                              <IconLogout className="size-4" />
                           </Button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Main Content */}
               <div className="lg:col-span-9 min-h-[60vh]">
                  <motion.div
                     key={activeTab}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                     {activeTab === 'overview' && (
                        <div className="space-y-16">
                           {/* Membership Section */}
                           <section>
                              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-8">会员权益</h3>
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-none">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div>
                                       <h4 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                          当前计划:
                                          <span className={cn(
                                             "bg-clip-text text-transparent bg-gradient-to-r",
                                             user.membership === 'plus' ? "from-violet-600 to-indigo-600" :
                                                user.membership === 'pro' ? "from-amber-600 to-orange-600" :
                                                   "from-zinc-600 to-zinc-800"
                                          )}>
                                             {user.membership === 'plus' ? 'PLUS 尊享会员' : user.membership === 'pro' ? 'PRO 专业会员' : '普通用户'}
                                          </span>
                                       </h4>
                                       <p className="text-zinc-500 mb-6 leading-relaxed">
                                          {user.membership === 'plus' ? '您正在享受最高级别的全能 AI 托管服务，无限量使用所有高级功能。' :
                                             user.membership === 'pro' ? '您拥有专业的 AI 辅助决策能力，每日充足的对话额度满足日常管理需求。' :
                                                '升级您的账户以解锁 AI 智能助手、自动化托管和更高级的数据分析功能。'}
                                       </p>
                                       <div className="h-64">
                                          <MembershipCard className="shadow-none border-0 bg-transparent p-0" />
                                       </div>
                                    </div>
                                    <div className="space-y-6 border-l border-zinc-100 dark:border-zinc-800 pl-0 md:pl-12">
                                       <div className="flex items-start gap-4">
                                          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                             <IconMagic className="size-6 text-zinc-900 dark:text-white" />
                                          </div>
                                          <div>
                                             <h5 className="font-bold mb-1">AI 智能助手</h5>
                                             <p className="text-sm text-zinc-500">基于通义千问大模型的语音交互，实时控制设备与查询数据。</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4">
                                          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                             <IconChartLine className="size-6 text-zinc-900 dark:text-white" />
                                          </div>
                                          <div>
                                             <h5 className="font-bold mb-1">深度数据分析</h5>
                                             <p className="text-sm text-zinc-500">多维度环境数据报表，智能生成种植建议与预警。</p>
                                          </div>
                                       </div>
                                       <div className="flex items-start gap-4">
                                          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                             <IconShield className="size-6 text-zinc-900 dark:text-white" />
                                          </div>
                                          <div>
                                             <h5 className="font-bold mb-1">全天候托管</h5>
                                             <p className="text-sm text-zinc-500">自动化策略执行，异常情况自动处理与通知。</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </section>

                           {/* Quick Actions */}
                           <section>
                              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-8">快速访问</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
                                 {[
                                    { icon: IconLeaf, label: "农作物监测" },
                                    { icon: IconCpu, label: "设备控制" },
                                    { icon: IconChartLine, label: "数据报表" },
                                    { icon: IconLightning, label: "AI 助手" }
                                 ].map((item, i) => (
                                    <button key={i} className="group bg-white dark:bg-black p-8 flex flex-col items-center justify-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                       <item.icon className="size-8 text-zinc-900 dark:text-white opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                                       <span className="text-sm font-medium">{item.label}</span>
                                    </button>
                                 ))}
                              </div>
                           </section>

                           {/* Recent Activity */}
                           <section>
                              <div className="flex items-center justify-between mb-8">
                                 <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">近期活动</h3>
                                 <span className="text-xs font-mono text-zinc-400">{activityLog.length} 条记录</span>
                              </div>
                              <div className="border-t border-zinc-200 dark:border-zinc-800">
                                 {activityLog.length === 0 ? (
                                    <EmptyState
                                       illustration="empty-list"
                                       illustrationWidth={150}
                                       className="py-10"
                                       title="暂无活动记录"
                                       description="你的操作与系统事件会显示在这里。"
                                    />
                                 ) : (
                                    activityLog.slice(0, 5).map((log, i) => (
                                       <div key={i} className="group flex items-center justify-between py-6 border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 px-4 -mx-4 transition-colors">
                                          <div className="flex items-center gap-4">
                                             <div className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-zinc-900 dark:group-hover:bg-white transition-colors" />
                                             <span className="font-medium text-lg">{log.text}</span>
                                          </div>
                                          <span className="font-mono text-xs text-zinc-400">{format(log.ts, "MM-dd HH:mm")}</span>
                                       </div>
                                    ))
                                 )}
                              </div>
                           </section>
                        </div>
                     )}

                     {activeTab === 'devices' && (
                        <div className="space-y-8">
                           <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-8">
                              <h2 className="text-3xl font-bold tracking-tight">已连接设备</h2>
                              <Button variant="outline" className="rounded-none border-zinc-200 dark:border-zinc-800" onClick={() => router.push('/monitor')}>
                                 管理设备
                              </Button>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {devices.length === 0 ? (
                                 <div className="col-span-full border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/20">
                                    <EmptyState
                                       illustration="no-accounts"
                                       illustrationWidth={180}
                                       className="py-14"
                                       title="暂无连接设备"
                                       description="前往「设备监控」添加并绑定的设备会出现在这里。"
                                       action={
                                          <Button variant="outline" className="rounded-none border-zinc-200 dark:border-zinc-800" onClick={() => router.push('/monitor')}>
                                             去添加设备
                                          </Button>
                                       }
                                    />
                                 </div>
                              ) : (
                                 devices.map((device, i) => (
                                    <div key={i} className="group relative p-8 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                       <div className="flex justify-between items-start mb-6">
                                          <IconCpu className="size-8 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                                          <div className="flex items-center gap-2">
                                             <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                             <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-emerald-400">运行中</span>
                                          </div>
                                       </div>
                                       <h3 className="text-xl font-bold mb-2">{device.name}</h3>
                                       <p className="font-mono text-xs text-zinc-400">{device.id}</p>
                                       <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                                          <IconArrowRight className="size-6" />
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     )}

                     {activeTab === 'settings' && (
                        <div className="max-w-2xl space-y-12">
                           <div>
                              <h2 className="text-3xl font-bold tracking-tight mb-8">通知设置</h2>
                              <div className="space-y-8">
                                 {[
                                    { key: 'alerts', label: '环境告警推送', desc: '当传感器数据异常时接收通知' },
                                    { key: 'status', label: '设备状态变更', desc: '设备上线/离线时接收通知' },
                                    { key: 'ai', label: 'AI 助手建议', desc: '接收 AI 生成的种植建议' },
                                 ].map((item) => (
                                    <div key={item.key} className="flex items-start justify-between pb-8 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                       <div>
                                          <div className="font-medium text-lg mb-1">{item.label}</div>
                                          <div className="text-sm text-zinc-500 max-w-sm">{item.desc}</div>
                                       </div>
                                       <Switch
                                          checked={notif[item.key as keyof typeof notif]}
                                          onCheckedChange={(v) => persistNotif(item.key as keyof typeof notif, v)}
                                       />
                                    </div>
                                 ))}
                              </div>
                           </div>

                           <div>
                              <h2 className="text-3xl font-bold tracking-tight mb-8 text-red-600 dark:text-red-500">危险区域</h2>
                              <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                 <h3 className="font-bold mb-2">重置忽略的告警</h3>
                                 <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                                    此操作将恢复所有之前忽略的系统告警。该操作无法撤销。
                                 </p>
                                 <Button
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                    onClick={handleResetAlertIgnores}
                                 >
                                    重置告警
                                 </Button>
                              </div>
                           </div>
                        </div>
                     )}
                  </motion.div>
               </div>
            </div>
         </main>
      </div>
   )
}
