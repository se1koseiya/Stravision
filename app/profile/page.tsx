"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { 
  Mail, 
  Settings as SettingsIcon,
  LogOut,
  Bell,
  ArrowRight,
  ShieldCheck,
  Zap,
  Leaf,
  Activity,
  Cpu,
  Smartphone,
  AlertTriangle
} from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import type { UserPublic } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { clearAlertExpirations, getIgnoredAlerts } from "@/components/environment-alert"
import { cn } from "@/lib/utils"

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

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserPublic | null>(null)
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
    } catch {}
  }, [router])

  const handleResetAlertIgnores = () => {
    clearAlertExpirations()
    setIgnoredAlerts([])
    addActivity("重置了所有忽略的告警")
  }

  const handleLogout = () => {
    router.push("/login")
    try { fetch("/api/auth/logout", { method: "POST", keepalive: true }) } catch {}
  }

  const persistNotif = (key: keyof typeof notif, value: boolean) => {
    const next = { ...notif, [key]: value }
    setNotif(next)
    try { 
      localStorage.setItem("profile_notifications", JSON.stringify(next))
      addActivity(`更新通知设置: ${key} -> ${value ? '开启' : '关闭'}`)
    } catch {}
  }

  const addActivity = (text: string) => {
    const item = { ts: Date.now(), text }
    const next = [item, ...activityLog].slice(0, 20)
    setActivityLog(next)
    try { localStorage.setItem("profile_activity", JSON.stringify(next)) } catch {}
  }

  if (loading) return null
  if (!user) return null

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full h-20 px-8 md:px-12 flex items-center justify-between z-50 bg-[#FAFAFA]/80 dark:bg-[#050505]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
           <div className="size-8 relative">
              <Image src="/icon.png" alt="Logo" fill className="object-contain grayscale hover:grayscale-0 transition-all duration-500" />
           </div>
           <span className="text-xs font-bold tracking-[0.2em] uppercase hidden md:block opacity-40">Stravision OS</span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
           <PageNavigation />
        </div>
        <div className="flex items-center gap-6">
           <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <Bell className="size-5" />
           </button>
           <UserAvatarMenu user={user} />
        </div>
      </nav>

      {/* Hero Header */}
      <header className="pt-40 pb-20 px-8 md:px-12 border-b border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black relative overflow-hidden">
         <div className="max-w-7xl mx-auto relative z-10">
            <motion.div 
               initial="hidden" 
               animate="visible" 
               variants={staggerContainer}
               className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
            >
               <div className="flex items-center gap-8">
                  <motion.div variants={fadeInUp} className="relative group">
                     <div className="size-32 md:size-40 rounded-full overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 ease-out ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <Avatar className="size-full">
                           <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                           <AvatarFallback className="bg-zinc-100 dark:bg-zinc-900 text-4xl font-light text-zinc-300">
                              {user.username[0].toUpperCase()}
                           </AvatarFallback>
                        </Avatar>
                     </div>
                     <div className="absolute bottom-1 right-1 size-5 bg-emerald-500 rounded-full border-4 border-white dark:border-black" />
                  </motion.div>
                  
                  <motion.div variants={fadeInUp} className="mb-2">
                     <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-2">
                        {user.username}
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
                        <div className={cn("size-2 rounded-full", connectionStatus.connected ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-xl font-medium">{connectionStatus.connected ? '在线' : '离线'}</span>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">安全等级</span>
                     <div className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-zinc-900 dark:text-white" />
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
      <main className="max-w-7xl mx-auto px-8 md:px-12 py-20">
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
                           <LogOut className="size-4" />
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
                        {/* Quick Actions */}
                        <section>
                           <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-8">快速访问</h3>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
                              {[
                                 { icon: Leaf, label: "农作物监测" },
                                 { icon: Cpu, label: "设备控制" },
                                 { icon: Activity, label: "数据报表" },
                                 { icon: Zap, label: "AI 助手" }
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
                                 <div className="py-12 text-center text-zinc-400 italic">暂无活动记录。</div>
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
                              <div className="col-span-full py-20 text-center border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/20">
                                 <Smartphone className="size-12 mx-auto mb-4 opacity-20" />
                                 <p className="text-zinc-500">暂无连接设备。</p>
                              </div>
                           ) : (
                              devices.map((device, i) => (
                                 <div key={i} className="group relative p-8 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                    <div className="flex justify-between items-start mb-6">
                                       <Cpu className="size-8 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                                       <div className="flex items-center gap-2">
                                          <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">运行中</span>
                                       </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{device.name}</h3>
                                    <p className="font-mono text-xs text-zinc-400">{device.id}</p>
                                    <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                                       <ArrowRight className="size-6" />
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
