"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  Library, 
  Download, 
  CheckCircle2, 
  ArrowLeft, 
  Zap, 
  ShieldCheck, 
  User, 
  Trash2, 
  ChevronRight,
  MessageSquare,
  Package,
  Layers,
  Sparkles,
  Check,
  ChevronLeft,
  Activity,
  X,
  Info,
  Layout,
  Terminal,
  Copy,
  Star,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import type { StoreSkill } from "@/lib/db/skill-store-service"
import { cn } from "@/lib/utils"

// Helper for Icon Fallback
const AppIcon = ({ icon, name, className }: { icon: string, name: string, className?: string }) => {
  const [error, setError] = useState(false)
  const isEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(icon) || icon.length <= 2
  
  if (isEmoji) return <div className={cn(className, "flex items-center justify-center text-5xl")}>{icon}</div>
  
  if (error || !icon) {
    const firstLetter = name.charAt(0).toUpperCase()
    const colors = ["bg-blue-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"]
    const color = colors[name.length % colors.length]
    return (
      <div className={cn(className, color, "text-white font-black flex items-center justify-center text-4xl shadow-2xl")}>
        {firstLetter}
      </div>
    )
  }

  return (
    <img 
      src={icon} 
      alt={name} 
      className={cn(className, "object-cover shadow-2xl")} 
      onError={() => setError(true)} 
    />
  )
}

// Skill Detail View Component (Redesigned to match MCPServerDetailDialog premium style)
const SkillDetailView = ({ 
  skill, 
  installedIds,
  onClose,
  onInstall,
  onUninstall
}: { 
  skill: StoreSkill, 
  installedIds: string[],
  onClose: () => void,
  onInstall: (e: React.MouseEvent, id: string) => void,
  onUninstall: (e: React.MouseEvent, id: string) => void
}) => {
  const isInstalled = (installedIds.includes(skill.skill_id) || skill.is_builtin === 1)
  const isBuiltin = skill.is_builtin === 1
  const [copied, setCopied] = useState(false)
  const examples = skill.examples ? skill.examples.split(',') : []

  const gradients = [
    "from-indigo-600 via-blue-700 to-cyan-500",
    "from-emerald-500 via-teal-600 to-cyan-600",
    "from-purple-600 via-fuchsia-700 to-pink-600",
    "from-orange-500 via-rose-600 to-red-600"
  ]

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(skill.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("提示词已复制")
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-6 sm:p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-full md:h-[90vh] bg-zinc-50 dark:bg-zinc-950 md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/5 font-sans"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 size-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
        >
          <X size={20} />
        </button>

        <ScrollArea className="flex-1 overflow-x-hidden">
          <div className="flex flex-col">
            {/* Hero Header */}
            <div className="relative h-[450px] shrink-0 overflow-hidden">
               {skill.cover_image ? (
                 <img src={skill.cover_image} className="absolute inset-0 size-full object-cover" alt="" />
               ) : (
                 <div className={cn("absolute inset-0 bg-gradient-to-br", gradients[skill.name.length % gradients.length])} />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-transparent to-black/30" />
               
               {/* Floating Icon and Title */}
               <div className="absolute bottom-0 inset-x-0 p-12 flex items-end gap-10">
                  <AppIcon icon={skill.icon} name={skill.name} className="size-40 rounded-[2.5rem] ring-8 ring-zinc-50 dark:ring-zinc-950 shrink-0" />
                  <div className="flex-1 pb-4 space-y-4">
                     <div className="flex items-center gap-3">
                        <Badge className="bg-white/10 backdrop-blur-md text-white/80 border-white/10 uppercase tracking-widest text-[10px] py-1 px-3">
                          {skill.category}
                        </Badge>
                        {isBuiltin && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20 py-1 px-3">
                            <ShieldCheck className="size-3.5 mr-1.5" /> 系统内置
                          </Badge>
                        )}
                     </div>
                     <h2 className="text-6 text-6xl font-black tracking-tight leading-none drop-shadow-sm text-zinc-900 dark:text-white">
                       {skill.name}
                     </h2>
                     <div className="flex items-center gap-6 text-zinc-500 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                           <User className="size-4" />
                           <span className="text-sm">{skill.author}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <Star className="size-4 text-amber-500 fill-amber-500" />
                           <span className="text-sm">v{skill.version}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <Activity className="size-4" />
                           <span className="text-sm">{skill.install_count} 次使用</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Content Body */}
            <div className="p-12 pt-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
               {/* Left Column: Main Info */}
               <div className="lg:col-span-2 space-y-12">
                  <section className="space-y-6">
                     <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Sparkles className="size-6 text-blue-500" />
                        关于此技能
                     </h3>
                     <p className="text-xl leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium italic">
                       “{skill.description}”
                     </p>
                  </section>

                  <section className="space-y-6">
                     <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Layout className="size-6 text-blue-500" />
                        使用效果
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-8 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4 shadow-sm group hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">
                           <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold shrink-0">
                              <Check className="size-6" />
                           </div>
                           <h4 className="font-bold text-lg dark:text-zinc-200">深度专业支持</h4>
                           <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">基于 {skill.name} 的专业逻辑，极大增强 AI 后台决策深度与稳定性。</p>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4 shadow-sm group hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all">
                           <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold shrink-0">
                              <Zap className="size-6" />
                           </div>
                           <h4 className="font-bold text-lg dark:text-zinc-200">操作逻辑优化</h4>
                           <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">优化指令分解链路，确保关键路径执行成功率提升 30% 以上。</p>
                        </div>
                     </div>
                     {skill.effects && (
                       <div className="p-8 rounded-3xl bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] border border-emerald-500/10 flex items-start gap-4">
                          <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={24} />
                          <p className="text-lg text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed italic">
                            {skill.effects}
                          </p>
                       </div>
                     )}
                  </section>

                  {/* Core Prompt Section */}
                  <section className="space-y-6 pt-6">
                     <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Terminal className="size-6 text-zinc-500" />
                        核心提示词逻辑
                     </h3>
                     <div className="group relative bg-zinc-900 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl">
                       <pre className="text-sm font-mono text-zinc-400 overflow-hidden max-h-[400px] leading-relaxed scrollbar-hide">
                         {skill.content}
                       </pre>
                       <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
                       <div className="absolute bottom-10 left-12 flex items-center gap-2 bg-zinc-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-700">
                          <ShieldCheck className="size-4 text-emerald-400" />
                          <span className="text-[10px] text-zinc-100 font-black uppercase tracking-tighter">System Protected Prompt</span>
                       </div>
                       <Button
                         size="icon"
                         variant="ghost"
                         className="absolute top-8 right-8 h-12 w-12 text-zinc-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                         onClick={handleCopyPrompt}
                       >
                         {copied ? <Check className="size-6 text-emerald-500" /> : <Copy className="size-6" />}
                       </Button>
                     </div>
                  </section>
               </div>

               {/* Right Column: Meta Info */}
               <div className="space-y-8">
                  {examples.length > 0 && (
                    <div className="p-10 rounded-[3rem] bg-white dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-6 shadow-sm">
                       <h4 className="text-lg font-bold flex items-center gap-2">
                          <MessageSquare size={18} />
                          交互示例
                       </h4>
                       <div className="space-y-3">
                          {examples.map((ex, i) => (
                            <div 
                              key={i}
                              className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-zinc-800 hover:-translate-y-1 shadow-sm group"
                            >
                               <div className="flex items-center justify-between mb-1.5 opacity-40">
                                  <span className="text-[9px] font-black uppercase tracking-tighter">Input</span>
                                  <ChevronRight size={12} className="group-hover:text-blue-500 transition-colors" />
                               </div>
                               <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">“{ex}”</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="p-10 rounded-[3rem] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] border border-indigo-500/10 space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                         <Info size={20} />
                         <h4 className="font-bold">开发者说明</h4>
                      </div>
                      <p className="text-sm leading-relaxed text-indigo-700/80 dark:text-indigo-300/80 italic font-medium">
                        此技能遵循 Stravision 莓小智核心 Agent 交互协议，具有极高的稳定性。开发者已针对硬件响应进行深度调优。
                      </p>
                  </div>

                  <Button 
                    disabled={isBuiltin}
                    onClick={(e) => isInstalled ? onUninstall(e, skill.skill_id) : onInstall(e, skill.skill_id)}
                    className={cn(
                      "w-full h-24 rounded-[3rem] text-2xl font-black shadow-xl active:scale-[0.98] transition-all disabled:opacity-50",
                      isBuiltin 
                        ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed"
                        : isInstalled 
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white" 
                          : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30"
                    )}
                  >
                     {isBuiltin ? (
                        <div className="flex items-center gap-3">
                           <ShieldCheck size={26} />
                           <span>已内置在核心</span>
                        </div>
                     ) : isInstalled ? (
                        <div className="flex items-center gap-3">
                           <Trash2 size={26} />
                           <span>移除此技能</span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-3">
                           <Zap size={26} className="fill-current" />
                           <span>立即获取技能</span>
                        </div>
                     )}
                  </Button>
               </div>
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </div>
  )
}

export function SkillStore() {
  const [skills, setSkills] = useState<StoreSkill[]>([])
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("精选")
  const [selectedSkill, setSelectedSkill] = useState<StoreSkill | null>(null)

  const categories = ["精选", "已安装", "农业", "设备", "工具", "生活", "系统"]

  const fetchData = async (isInitial = false) => {
    if (isInitial && skills.length === 0) setLoading(true)
    try {
      const [skillsRes, userRes] = await Promise.all([
        fetch('/api/skills/store'),
        fetch('/api/skills/user')
      ])
      const skillsData = await skillsRes.json()
      const userData = await userRes.json()
      
      const sorted = (Array.isArray(skillsData) ? skillsData : []).sort((a, b) => (b.priority || 0) - (a.priority || 0))
      setSkills(sorted)
      setInstalledIds(userData?.installedIds || [])
    } catch (error) {
      console.error("Failed to fetch skills", error)
      toast.error("加载商店失败")
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
  }, [])

  const handleInstall = async (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation()
    try {
      const res = await fetch('/api/skills/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: skillId })
      })
      if (res.ok) {
        setInstalledIds(prev => [...prev, skillId])
        toast.success("已成功添加至会话")
      }
    } catch (error) {
      toast.error("安装失败")
    }
  }

  const handleUninstall = async (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation()
    try {
      const res = await fetch('/api/skills/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: skillId })
      })
      if (res.ok) {
        setInstalledIds(prev => prev.filter(id => id !== skillId))
        toast.success("已移除该技能")
      }
    } catch (error) {
      toast.error("卸载失败")
    }
  }

  const filteredSkills = skills.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeCategory === "精选") return matchesSearch
    if (activeCategory === "已安装") return matchesSearch && (installedIds.includes(s.skill_id) || s.is_builtin === 1)
    return matchesSearch && s.category === activeCategory
  })

  const featured = filteredSkills.slice(0, 2)
  const others = filteredSkills.slice(2)

  const gradients = [
    "from-blue-600 to-indigo-700",
    "from-rose-500 to-orange-600",
    "from-emerald-500 to-teal-700",
    "from-violet-600 to-purple-800"
  ]

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000] relative overflow-hidden text-black dark:text-white font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]">
      <div className="flex flex-col h-full">
        <div className="px-8 pt-10 pb-4 shrink-0 flex items-end justify-between max-w-7xl mx-auto w-full z-20">
           <div className="space-y-0.5">
              <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-tight">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight">探索莓小智的技能潜力</h1>
           </div>
           
           <div className="flex items-center gap-6 mb-1">
              <div className="bg-zinc-100 dark:bg-zinc-900/50 backdrop-blur-3xl px-1 py-1 rounded-2xl flex items-center shadow-sm border border-black/5 dark:border-white/5 overflow-x-auto max-w-[600px] no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "text-[13px] font-bold transition-all px-5 py-2 rounded-xl whitespace-nowrap",
                      activeCategory === cat 
                        ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="size-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-0.5 overflow-hidden border border-black/5 dark:border-white/5">
                 <User size={22} className="text-zinc-400" />
              </div>
           </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-8 pb-32 space-y-16 max-w-7xl mx-auto">
            {activeCategory === "精选" && (
              <div className="flex flex-col md:flex-row gap-6 pt-4 h-[550px]">
                {featured.map((skill, idx) => (
                  <motion.div
                    key={skill.skill_id}
                    onClick={() => setSelectedSkill(skill)}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative h-full rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl group border border-black/5 dark:border-white/5",
                      idx === 0 ? "flex-[2.2]" : "flex-[1]"
                    )}
                  >
                    {skill.cover_image ? (
                      <img src={skill.cover_image} alt="" className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                    ) : (
                      <div className={cn("absolute inset-0 bg-gradient-to-br", gradients[idx % gradients.length])} />
                    )}
                    
                    <div className="absolute inset-x-0 top-0 p-8 pt-10 z-10 bg-gradient-to-b from-black/30 to-transparent">
                       <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/70">
                         {skill.category}
                       </span>
                       <h2 className="text-4xl font-extrabold mt-2 leading-[1.1] text-white drop-shadow-lg max-w-[80%]">
                         {skill.name}
                       </h2>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 z-10 bg-black/20 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between group-hover:bg-black/30 transition-all gap-4">
                       <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                          <AppIcon icon={skill.icon} name={skill.name} className="size-12 rounded-xl" />
                          <div className="space-y-0.5 min-w-0">
                             <p className="font-bold text-sm text-white truncate">{skill.name}</p>
                             <p className="text-[10px] text-white/60 truncate font-medium">{skill.description}</p>
                          </div>
                       </div>
                       <Button 
                         onClick={(e) => handleInstall(e, skill.skill_id)}
                         className="rounded-full px-5 py-1.5 h-8 bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow-sm backdrop-blur-md transition-all uppercase tracking-tight shrink-0"
                       >
                         {installedIds.includes(skill.skill_id) ? "打开" : "获取"}
                       </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="space-y-8">
               <div className="flex items-center justify-between border-b pb-5 border-zinc-100 dark:border-zinc-800/50">
                  <h3 className="text-2xl font-extrabold tracking-tight">
                    {activeCategory === "精选" ? "为您推荐" : activeCategory === "已安装" ? "已安装技能" : `${activeCategory} 技能列表`}
                  </h3>
                  <button className="text-blue-500 text-[15px] font-bold hover:opacity-70 transition-opacity">查看全部</button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                  {(activeCategory === "精选" ? others : filteredSkills).map((skill) => {
                    const isInstalled = installedIds.includes(skill.skill_id) || skill.is_builtin === 1
                    
                    return (
                      <div
                        key={skill.skill_id}
                        onClick={() => setSelectedSkill(skill)}
                        className="group flex gap-5 cursor-pointer items-center border-b border-zinc-100 dark:border-zinc-800/50 pb-8 last:border-0"
                      >
                         <AppIcon icon={skill.icon} name={skill.name} className="size-20 rounded-[1.35rem] shadow-sm group-hover:shadow-md transition-all shrink-0" />
                         <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                            <div className="space-y-1">
                               <h4 className="font-bold text-lg truncate leading-tight tracking-tight">{skill.name}</h4>
                               <p className="text-sm text-zinc-500 dark:text-zinc-500 line-clamp-1 font-medium italic">{skill.description}</p>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                               <Button 
                                 size="sm"
                                 className={cn(
                                   "rounded-full px-6 py-2 h-8 font-extrabold text-[13px] shadow-sm transition-all active:scale-95",
                                   isInstalled ? "bg-zinc-100 dark:bg-zinc-800 text-blue-500" : "bg-zinc-100 dark:bg-zinc-900 text-blue-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                 )}
                               >
                                 {isInstalled ? "打开" : "获取"}
                               </Button>
                               {skill.is_builtin === 1 && (
                                 <span className="text-[10px] font-bold text-zinc-400/60 uppercase tracking-tighter">APP 内购买</span>
                               )}
                            </div>
                         </div>
                      </div>
                    )
                  })}
               </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <AnimatePresence>
        {selectedSkill && (
           <SkillDetailView 
              key={selectedSkill.skill_id}
              skill={selectedSkill} 
              installedIds={installedIds}
              onClose={() => setSelectedSkill(null)} 
              onInstall={handleInstall}
              onUninstall={handleUninstall}
           />
        )}
      </AnimatePresence>

      {/* Background Decorator */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none -z-10" />
    </div>
  )
}
