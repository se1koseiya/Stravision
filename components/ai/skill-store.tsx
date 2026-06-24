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
    const colors = ["bg-blue-500", "bg-rose-500", "bg-primary", "bg-amber-500", "bg-violet-500"]
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
    "from-teal-600 via-emerald-600 to-cyan-600",
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl h-full md:h-[85vh] bg-white dark:bg-[#161618] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800/80 font-sans"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 size-8 rounded-full bg-black/5 hover:bg-black/15 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-md flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-all hover:scale-105 active:scale-95 border border-zinc-200/20 dark:border-white/5"
        >
          <X size={16} />
        </button>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {/* Hero Header */}
            <div className="relative h-[240px] shrink-0 overflow-hidden">
               {skill.cover_image ? (
                 <img src={skill.cover_image} className="absolute inset-0 size-full object-cover" alt="" />
               ) : (
                 <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", gradients[skill.name.length % gradients.length])} />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#161618] via-white/50 dark:via-[#161618]/50 to-transparent" />
               
               {/* Floating Icon and Title */}
               <div className="absolute bottom-0 inset-x-0 p-8 flex items-end gap-6">
                  <AppIcon icon={skill.icon} name={skill.name} className="size-24 rounded-2xl ring-4 ring-white dark:ring-[#161618] shrink-0 shadow-lg" />
                  <div className="flex-1 pb-1 space-y-2">
                     <div className="flex items-center gap-2">
                        <Badge className="bg-zinc-800/10 dark:bg-white/10 text-zinc-800 dark:text-white/80 border border-zinc-200 dark:border-white/10 uppercase tracking-wider text-[10px] py-0.5 px-2">
                          {skill.category}
                        </Badge>
                        {isBuiltin && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 py-0.5 px-2 text-[10px]">
                            <ShieldCheck className="size-3 mr-1" /> 系统内置
                          </Badge>
                        )}
                     </div>
                     <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                       {skill.name}
                     </h2>
                     <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 font-medium text-xs">
                        <div className="flex items-center gap-1">
                           <User className="size-3.5" />
                           <span>{skill.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <Star className="size-3.5 text-amber-500 fill-amber-500" />
                           <span>v{skill.version}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <Activity className="size-3.5" />
                           <span>{skill.install_count} 次使用</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Content Body */}
            <div className="p-8 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Left Column: Main Info */}
               <div className="lg:col-span-2 space-y-8">
                  <section className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                        <Sparkles className="size-5 text-emerald-500" />
                        关于此技能
                     </h3>
                     <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800/50">
                       “{skill.description}”
                     </p>
                  </section>

                  <section className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                        <Layout className="size-5 text-emerald-500" />
                        使用效果
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-800/50 space-y-2.5 shadow-sm group hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all">
                           <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold shrink-0">
                              <Check className="size-5" />
                           </div>
                           <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">深度专业支持</h4>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">基于 {skill.name} 的专业逻辑，极大增强 AI 后台决策深度与稳定性。</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-800/50 space-y-2.5 shadow-sm group hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all">
                           <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold shrink-0">
                              <Zap className="size-5" />
                           </div>
                           <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">操作逻辑优化</h4>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">优化指令分解链路，确保关键路径执行成功率提升 30% 以上。</p>
                        </div>
                     </div>
                     {skill.effects && (
                       <div className="p-5 rounded-2xl bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] border border-emerald-500/10 flex items-start gap-3">
                          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                          <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed italic">
                            {skill.effects}
                          </p>
                       </div>
                     )}
                  </section>

                  {/* Core Prompt Section */}
                  <section className="space-y-4">
                     <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                        <Terminal className="size-5 text-zinc-400" />
                        核心提示词逻辑
                     </h3>
                     <div className="group relative bg-[#0f0f11] rounded-2xl p-6 border border-zinc-800/60 shadow-inner">
                       <pre className="text-xs font-mono text-zinc-400 overflow-y-auto max-h-[220px] leading-relaxed scrollbar-hide pr-10">
                         {skill.content}
                       </pre>
                       <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0f0f11] to-transparent pointer-events-none" />
                       <div className="absolute bottom-4 left-6 flex items-center gap-1.5 bg-zinc-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800">
                          <ShieldCheck className="size-3.5 text-emerald-400" />
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">System Protected Prompt</span>
                       </div>
                       <Button
                         size="icon"
                         variant="ghost"
                         className="absolute top-4 right-4 h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                         onClick={handleCopyPrompt}
                       >
                         {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                       </Button>
                     </div>
                  </section>
               </div>

               {/* Right Column: Meta Info */}
               <div className="space-y-6">
                  {examples.length > 0 && (
                    <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-800/50 space-y-4 shadow-sm">
                       <h4 className="text-sm font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                          <MessageSquare size={16} />
                          交互示例
                       </h4>
                       <div className="space-y-2.5">
                          {examples.map((ex, i) => (
                            <div 
                              key={i}
                              className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:-translate-y-0.5 shadow-sm group cursor-default"
                            >
                               <div className="flex items-center justify-between mb-1 opacity-40">
                                  <span className="text-[9px] font-black uppercase tracking-tighter">Input</span>
                                  <ChevronRight size={10} className="group-hover:text-emerald-500 transition-colors" />
                               </div>
                               <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">“{ex}”</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] border border-indigo-500/10 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                         <Info size={16} />
                         <h4 className="text-xs font-bold">开发者说明</h4>
                      </div>
                      <p className="text-xs leading-relaxed text-indigo-700/80 dark:text-indigo-300/80 italic font-medium">
                        此技能遵循 Stravision 莓小智核心 Agent 交互协议，具有极高的稳定性。开发者已针对硬件响应进行深度调优。
                      </p>
                  </div>

                  <Button 
                    disabled={isBuiltin}
                    onClick={(e) => isInstalled ? onUninstall(e, skill.skill_id) : onInstall(e, skill.skill_id)}
                    className={cn(
                      "w-full h-12 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2",
                      isBuiltin 
                        ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-500 cursor-not-allowed"
                        : isInstalled 
                          ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600" 
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10"
                    )}
                  >
                     {isBuiltin ? (
                        <div className="flex items-center gap-2">
                           <ShieldCheck size={18} />
                           <span>已内置在核心</span>
                        </div>
                     ) : isInstalled ? (
                        <div className="flex items-center gap-2">
                           <Trash2 size={18} />
                           <span>移除此技能</span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-2">
                           <Zap size={18} className="fill-current" />
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

export function SkillStore({ searchQuery = "", filter = "all" }: { searchQuery?: string, filter?: string }) {
  const [skills, setSkills] = useState<StoreSkill[]>([])
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<StoreSkill | null>(null)

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
    if (filter === "builtin") return matchesSearch && s.is_builtin === 1
    if (filter === "installed") return matchesSearch && installedIds.includes(s.skill_id) && s.is_builtin === 0
    return matchesSearch
  })

  const systemSkills = filteredSkills.filter(s => s.is_builtin === 1)
  const personalSkills = filteredSkills.filter(s => s.is_builtin === 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500 font-medium text-sm">
        加载技能列表中...
      </div>
    )
  }

  const renderSkillRow = (skill: StoreSkill) => {
    const isInstalled = installedIds.includes(skill.skill_id) || skill.is_builtin === 1
    return (
      <div
        key={skill.skill_id}
        onClick={() => setSelectedSkill(skill)}
        className="group flex gap-4 cursor-pointer items-center py-3 select-none border-b border-gray-100 last:border-0"
      >
        <AppIcon icon={skill.icon} name={skill.name} className="size-11 rounded-xl shadow-sm ring-1 ring-gray-200/80 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="font-bold text-[14px] text-gray-900 group-hover:text-gray-950 transition-colors truncate">{skill.name}</h4>
            <p className="text-xs text-gray-400 line-clamp-1 max-w-[280px] md:max-w-[340px]">{skill.description}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {isInstalled ? (
              <Check className="size-4 text-gray-400 stroke-[3px]" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleInstall(e, skill.skill_id)
                }}
                className="size-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col bg-white text-gray-800">
      <div className="w-full max-w-4xl mx-auto space-y-10">
        {/* 系统内置技能 (System) */}
        {(filter === "all" || filter === "builtin") && systemSkills.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[15px] font-black text-gray-900 tracking-wider border-b border-gray-200 pb-2">系统</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {systemSkills.map(renderSkillRow)}
            </div>
          </div>
        )}

        {/* 个人自定义技能 (Personal) */}
        {(filter === "all" || filter === "installed") && personalSkills.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[15px] font-black text-gray-900 tracking-wider border-b border-gray-200 pb-2">个人</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {personalSkills.map(renderSkillRow)}
            </div>
          </div>
        )}

        {filteredSkills.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm font-medium">
            未搜索到匹配的技能
          </div>
        )}
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
    </div>
  )
}
