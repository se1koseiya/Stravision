"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserPublic } from "@/lib/db/user-service"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { MobileBackground } from "@/components/mobile-background"
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { Bell } from "@/components/animate-ui/icons/bell";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { Settings } from "@/components/animate-ui/icons/settings";
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { clearAlertExpirations, getIgnoredAlerts } from "@/components/environment-alert"
import { useDraggableScroll } from "@/lib/hooks/use-draggable-scroll"
import { IconCamera, IconChartLine, IconHelp, IconInfo, IconLeaf, IconLightning, IconMoon, IconPhone, IconShield, IconSun, IconThermometer, IconUndo } from "@/components/icon";

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([])
  const [newDeviceId, setNewDeviceId] = useState("")
  const [newDeviceName, setNewDeviceName] = useState("")
  const [notif, setNotif] = useState<{ alerts: boolean; status: boolean; ai: boolean; updates: boolean }>({ alerts: true, status: true, ai: false, updates: true })
  const [activity, setActivity] = useState<{ ts: number; text: string }[]>([])
  const [ignoredAlerts, setIgnoredAlerts] = useState<{ type: string; expiry: number }[]>([])
  const { connectionStatus } = useDeviceData()
  const mainScrollRef = useDraggableScroll<HTMLDivElement>()
  const togglesScrollRef = useDraggableScroll<HTMLDivElement>()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (!mounted) return
        if (data?.authenticated && data?.user) {
          setUser(data.user as UserPublic)
        } else {
          router.replace("/login")
        }
      } catch {
        router.replace("/login")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [router])

  useEffect(() => {
    try {
      const ds = JSON.parse(localStorage.getItem("profile_devices") || "[]")
      const ns = JSON.parse(localStorage.getItem("profile_notifications") || "{}")
      const as = JSON.parse(localStorage.getItem("profile_activity") || "[]")
      if (Array.isArray(ds)) setDevices(ds)
      setNotif({ alerts: !!ns.alerts, status: !!ns.status, ai: !!ns.ai, updates: ns.updates !== false })
      if (Array.isArray(as)) setActivity(as)
      // 加载被忽略的告警
      setIgnoredAlerts(getIgnoredAlerts())
    } catch {}
  }, [])

  const handleResetAlertIgnores = () => {
    clearAlertExpirations()
    setIgnoredAlerts([])
    addActivity("重置了所有告警忽略设置")
  }

  const persistDevices = (list: { id: string; name: string }[]) => {
    setDevices(list)
    try { localStorage.setItem("profile_devices", JSON.stringify(list)) } catch {}
  }

  const persistNotif = (n: { alerts: boolean; status: boolean; ai: boolean; updates: boolean }) => {
    setNotif(n)
    try { localStorage.setItem("profile_notifications", JSON.stringify(n)) } catch {}
  }

  const addActivity = (text: string) => {
    const item = { ts: Date.now(), text }
    const next = [item, ...activity].slice(0, 20)
    setActivity(next)
    try { localStorage.setItem("profile_activity", JSON.stringify(next)) } catch {}
  }

  const addDevice = () => {
    const id = newDeviceId.trim()
    const name = newDeviceName.trim() || `设备 ${id || devices.length + 1}`
    if (!id) return
    const next = [...devices, { id, name }]
    persistDevices(next)
    setNewDeviceId("")
    setNewDeviceName("")
    addActivity(`绑定设备 ${name}(${id})`)
  }

  const removeDevice = (id: string) => {
    const target = devices.find(d => d.id === id)
    const next = devices.filter(d => d.id !== id)
    persistDevices(next)
    if (target) addActivity(`解除绑定 ${target.name}(${target.id})`)
  }

  if (loading) return null
  if (!user) return null

  // Helper component for list items
  const ListItem = ({ icon: Icon, title, onClick, color = "text-blue-600 dark:text-blue-400" }: { icon: any, title: string, onClick?: () => void, color?: string }) => (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
           <Icon className={cn("size-5", color)} />
        </div>
        <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200">{title}</span>
      </div>
      <ChevronRight className="size-5 text-slate-300 dark:text-slate-600" />
    </div>
  )

  return (
    <div className="min-h-screen w-screen bg-transparent dark:bg-[#0B1121] font-sans transition-colors duration-500 overflow-hidden flex flex-col">
      <MobileBackground />

      <div ref={mainScrollRef} className="relative z-10 flex-1 overflow-y-auto scrollbar-hide pb-32">
        {/* Header Section */}
      <div className="px-6 pt-16 pb-8 relative overflow-visible">
        <div className="relative z-10">
          <div className="mb-6">
             <h1 className="text-[2.5rem] font-black text-slate-900 dark:text-white leading-tight tracking-tight" style={{ fontFamily: 'var(--font-jinbuti)' }}>
               Hi, <br />
               <span className="text-blue-600 dark:text-blue-400">{user.username || 'Guest'}</span>
             </h1>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">今天也要照看好作物哦 🌱</p>
          </div>
          
          {/* User Info Row */}
          <div className="flex items-center gap-4">
             <div className="relative">
                <Avatar className="size-16 ring-4 ring-white dark:ring-white/10 shadow-xl">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl">
                    {user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 size-5 bg-green-500 rounded-full border-[3px] border-white dark:border-[#0B1121]" />
             </div>
             
             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                   <Badge variant="secondary" className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 border-0">
                      普通用户
                   </Badge>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1 font-mono" title={user.email}>{user.email}</p>
             </div>

             <Link href="/settings">
                <Button variant="outline" size="icon" className="rounded-full size-10 bg-white/50 dark:bg-white/5 border-white/60 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                  <Settings className="size-5 text-slate-600 dark:text-slate-300" />
                </Button>
             </Link>
          </div>
        </div>
      </div>

      {/* Quick Toggles (Pills) */}
      <div className="px-6 mb-8">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider ml-1">快捷设置</h3>
        <div ref={togglesScrollRef} className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
          <button 
            onClick={() => persistNotif({ ...notif, alerts: !notif.alerts })}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-bold transition-all px-6 whitespace-nowrap border",
              notif.alerts 
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/20" 
                : "bg-white/55 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-xl"
            )}
          >
            重要告警
          </button>
          <button 
            onClick={() => persistNotif({ ...notif, status: !notif.status })}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-bold transition-all px-6 whitespace-nowrap border",
              notif.status 
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/20" 
                : "bg-white/55 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-xl"
            )}
          >
            设备状态
          </button>
          <button 
            onClick={() => persistNotif({ ...notif, ai: !notif.ai })}
            className={cn(
              "flex-1 h-11 rounded-full text-sm font-bold transition-all px-6 whitespace-nowrap border",
              notif.ai 
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/20" 
                : "bg-white/55 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-xl"
            )}
          >
            AI 建议
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="px-6 mb-8">
        <div className="bg-[#1e1e1e] rounded-[2.5rem] p-7 flex items-center justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] text-white relative overflow-hidden group">
           {/* Dynamic Background */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-[80px] pointer-events-none group-hover:bg-blue-600/30 transition-colors duration-500" />
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-[60px] pointer-events-none group-hover:bg-purple-600/30 transition-colors duration-500" />
           
           <div className="relative z-10 flex-1 pr-4">
             <div className="flex items-center gap-2 mb-3">
               <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-400 text-[10px] font-black tracking-wider border border-yellow-500/30 shadow-sm backdrop-blur-md">
                  PRO
               </div>
               <span className="text-xs font-medium text-white/60 tracking-wide">会员权益生效中</span>
             </div>
             <h3 className="text-2xl font-bold italic tracking-wide mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Stravision</h3>
             <p className="text-xs text-white/50 font-medium leading-relaxed max-w-[140px]">
                尊享全天候智能农业管家服务，AI 算力无限使用。
             </p>
           </div>
           
           {/* IP Image - Drone Inspection */}
           <div className="absolute -right-12 -bottom-10 w-52 h-52 z-0 transition-transform duration-700 group-hover:scale-105 group-hover:-translate-y-2">
               <Image 
                 src="/ip/智慧农业3D图标-无人机巡检-细线版.png" 
                 alt="Drone" 
                 fill 
                 className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
               />
           </div>
        </div>
      </div>

      {/* Settings Group 1 */}
      <div className="px-6 mb-8">
        <div className="bg-white/55 dark:bg-white/5 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/60 dark:border-white/10">
          
          {/* Theme Toggle */}
          <div 
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
             className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all duration-200"
          >
             <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                   {theme === 'dark' ? <IconMoon className="size-5 text-blue-400" /> : <IconSun className="size-5 text-orange-500" />}
                </div>
                <span className="text-[15px] font-bold text-slate-700 dark:text-slate-200">
                  {theme === 'dark' ? '深色模式' : '浅色模式'}
                </span>
             </div>
             <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
          </div>
          <div className="h-px bg-slate-200/50 dark:bg-white/5 mx-4" />

          <Sheet>
            <SheetTrigger asChild>
              <div><ListItem icon={IconPhone} title="设备管理" /></div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>设备管理</SheetTitle>
                <SheetDescription>添加或移除您的物联网设备</SheetDescription>
              </SheetHeader>
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-3">
                  <Label>绑定新设备</Label>
                  <div className="grid gap-3">
                    <Input value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} placeholder="设备编号 (如 SN-001)" className="bg-white dark:bg-black" />
                    <Input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="设备名称" className="bg-white dark:bg-black" />
                    <Button onClick={addDevice} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">确认绑定</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label>已绑定设备</Label>
                  {devices.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed dark:border-slate-800">暂无设备</div>
                  ) : (
                    devices.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-white dark:bg-black border dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                             <IconPhone size={16} />
                           </div>
                           <div>
                             <div className="font-medium text-sm">{d.name}</div>
                             <div className="text-xs text-slate-400">{d.id}</div>
                           </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeDevice(d.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">移除</Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="h-px bg-slate-200/50 dark:bg-white/5 mx-4" />
          
          <Sheet>
            <SheetTrigger asChild>
              <div><ListItem icon={Bell} title="通知设置" /></div>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>通知设置</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                 {[
                   { id: "alerts", label: "重要告警", icon: IconShield },
                   { id: "status", label: "设备状态", icon: IconLightning },
                   { id: "ai", label: "AI 建议", icon: IconLeaf },
                   { id: "updates", label: "系统更新", icon: Bell },
                 ].map(item => (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                     <div className="flex items-center gap-3">
                       <item.icon className="size-5 text-blue-600 dark:text-white" />
                       <span className="font-medium">{item.label}</span>
                     </div>
                     <Switch 
                        checked={notif[item.id as keyof typeof notif]} 
                        onCheckedChange={(v) => {
                          const next = { ...notif, [item.id]: v }
                          persistNotif(next)
                          addActivity(`更新通知设置: ${item.label} ${v ? "开启" : "关闭"}`)
                        }} 
                     />
                   </div>
                 ))}

                 {/* 告警忽略设置 */}
                 <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <IconUndo className="size-5 text-amber-600" />
                       <div>
                         <span className="font-medium">已忽略的告警</span>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                           {ignoredAlerts.length > 0 ? `${ignoredAlerts.length} 个告警被忽略` : "无"}
                         </p>
                       </div>
                     </div>
                     <Button 
                       variant="outline" 
                       size="sm"
                       onClick={handleResetAlertIgnores}
                       disabled={ignoredAlerts.length === 0}
                       className="border-amber-300 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
                     >
                       重置
                     </Button>
                   </div>
                 </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="h-px bg-slate-200/50 dark:bg-white/5 mx-4" />
          
          <Sheet>
            <SheetTrigger asChild>
              <div><ListItem icon={IconChartLine} title="活动日志" /></div>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>最近活动</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-full pb-20 space-y-4">
                {activity.length === 0 ? (
                  <div className="text-center text-slate-400 py-10">暂无活动记录</div>
                ) : (
                  activity.map((item, i) => (
                    <div key={i} className="flex gap-4">
                       <div className="flex flex-col items-center">
                         <div className="size-2 rounded-full bg-blue-500 mt-2" />
                         {i !== activity.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800 my-1" />}
                       </div>
                       <div className="pb-4">
                         <div className="text-sm font-medium text-foreground">{item.text}</div>
                         <div className="text-xs text-slate-400 mt-1">{new Date(item.ts).toLocaleString()}</div>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Settings Group 2 */}
      <div className="px-6 mb-6">
        <div className="bg-white/55 dark:bg-white/5 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/60 dark:border-white/10">
          <ListItem icon={IconShield} title="隐私与安全" />
          <div className="h-px bg-slate-200/50 dark:bg-white/5 mx-4" />
          
          <Dialog>
            <DialogTrigger asChild>
              <div><ListItem icon={IconInfo} title="关于" /></div>
            </DialogTrigger>
            <DialogContent className="w-[85%] rounded-3xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border-white/20 dark:border-white/5">
              <DialogHeader>
                <DialogTitle className="text-center">关于</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center py-4">
                <div className="size-24 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-4">
                  <Image src="/logo.png" alt="Logo" width={48} height={48} className="size-12" />
                </div>
                <h3 className="text-xl font-bold mb-1">Stravision IoT</h3>
                <p className="text-sm text-slate-500 mb-8">Version 1.0.0</p>
                
                <Button 
                  className="w-full bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl h-12 shadow-none border border-slate-200 dark:border-slate-700"
                  onClick={() => addActivity("检查更新: 已是最新版本")}
                >
                  检查更新
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="h-px bg-slate-200/50 dark:bg-white/5 mx-4" />

          <ListItem icon={IconHelp} title="帮助与支持" />
          <div className="h-px bg-slate-200/50 dark:bg-white/5 mx-4" />
          <div 
             onClick={() => { 
               router.replace("/login")
               try { 
                 fetch("/api/auth/logout", { method: "POST", keepalive: true }) 
               } catch {} 
             }}
             className="flex items-center justify-between p-4 cursor-pointer active:bg-white/40 dark:active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/10">
                 <LogOut className="size-5 text-red-500" />
              </div>
              <span className="text-[15px] font-bold text-red-500">退出登录</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 px-5 text-center pb-8">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium tracking-wide">Stravision IoT Platform v1.0.0</p>
      </div>
      </div>
    </div>
  )
}
