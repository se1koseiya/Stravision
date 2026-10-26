"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spin } from "antd"
import { toast } from "@/lib/ui/feedback"
import type { StoreSkill } from "@/lib/db/skill-store-service"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/illustration"
import { IconBookOpen, IconCheck, IconClose, IconCopy, IconMagic, IconPlus, IconSearch, IconShield, IconTag, IconTerminal, IconUser } from "@/components/icon";

// ================================================================
//  装饰插图（匹配参考图：曲线 + 圆 + </> + * + 点）
// ================================================================
const SkillsIllustration = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="200"
    height="110"
    viewBox="0 0 200 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    {/* 左下蓝色曲线 */}
    <path
      d="M5 85 C 35 35, 75 25, 110 50 S 175 70, 195 45"
      stroke="#059669"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
      opacity="0.85"
    />
    {/* 左圆：竖线纹理 */}
    <circle cx="60" cy="48" r="22" fill="rgba(0,148,86,0.10)" />
    {[42, 48, 54, 60, 66, 72, 78].map(x => (
      <line
        key={x}
        x1={x}
        y1={28}
        x2={x}
        y2={68}
        stroke="#059669"
        strokeWidth="1"
        opacity="0.55"
      />
    ))}
    {/* 右圆：实心淡蓝 */}
    <circle cx="115" cy="58" r="24" fill="rgba(0,148,86,0.18)" />
    {/* 圆上小圆点 */}
    <circle cx="108" cy="22" r="4" fill="#059669" />
    {/* </> 符号 */}
    <text
      x="100"
      y="55"
      fontSize="11"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      fill="#059669"
      fontWeight="600"
    >{`</>`}</text>
    {/* 星号 */}
    <g transform="translate(165, 22)">
      <line x1="0" y1="-9" x2="0" y2="9" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-9" y1="0" x2="9" y2="0" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="-6.5" x2="6.5" y2="6.5" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="6.5" x2="6.5" y2="-6.5" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
    </g>
    {/* 散点 */}
    <circle cx="20" cy="20" r="1.6" fill="#059669" />
    <circle cx="180" cy="60" r="1.6" fill="#059669" />
    <circle cx="195" cy="80" r="1" fill="#059669" opacity="0.6" />
    <circle cx="40" cy="95" r="1.2" fill="#059669" opacity="0.5" />
  </svg>
)

// ================================================================
//  卡片图标：单字符 + 主题色圆（按名称哈希选色）
// ================================================================
const PALETTE = [
  { bg: "rgba(124,58,237,0.10)", text: "#3f3f46", border: "rgba(124,58,237,0.20)" }, // purple
  { bg: "rgba(0,148,86,0.10)", text: "#059669", border: "rgba(0,148,86,0.22)" }, // blue
  { bg: "rgba(82,196,26,0.10)", text: "#389e0d", border: "rgba(82,196,26,0.22)" },   // green
  { bg: "rgba(250,140,22,0.10)", text: "#d46b08", border: "rgba(250,140,22,0.22)" }, // orange
  { bg: "rgba(235,47,150,0.10)", text: "#c41d7f", border: "rgba(235,47,150,0.22)" }, // magenta
  { bg: "rgba(19,194,194,0.10)", text: "#52525B", border: "rgba(19,194,194,0.22)" }, // cyan
]

const hashIndex = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % PALETTE.length
}

const SkillBadge = ({
  name,
  size = "md",
  shape = "circle"
}: {
  name: string
  size?: "sm" | "md" | "lg"
  shape?: "circle" | "square"
}) => {
  const first = (name || "?").trim().charAt(0).toUpperCase()
  const c = PALETTE[hashIndex(name || "?")]
  const dim =
    size === "lg" ? "size-12 text-[20px]" :
      size === "sm" ? "size-8 text-[13px]" :
        "size-10 text-[14px]"
  const radius = shape === "square" ? "rounded-lg" : "rounded-full"
  return (
    <div
      className={cn(
        dim,
        radius,
        "flex items-center justify-center font-semibold shrink-0 select-none"
      )}
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {first}
    </div>
  )
}

// ================================================================
//  插件详情视图（参考图 2）
// ================================================================
const SkillDetailView = ({
  skill,
  installedIds,
  onClose,
  onInstall,
  onUninstall
}: {
  skill: StoreSkill
  installedIds: string[]
  onClose: () => void
  onInstall: (e: React.MouseEvent, id: string) => void
  onUninstall: (e: React.MouseEvent, id: string) => void
}) => {
  const isInstalled = installedIds.includes(skill.skill_id) || skill.is_builtin === 1
  const isBuiltin = skill.is_builtin === 1
  const [copied, setCopied] = useState(false)
  const [prompt, setPrompt] = useState<string>(
    "根据这段文字描述生成一段 15 秒的产品宣传短视频。"
  )

  const handleCopyPrompt = () => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("推荐 Prompt 已复制")
  }

  const c = PALETTE[hashIndex(skill.name)]
  const [open, setOpen] = useState(true)
  const handleClose = () => {
    if (!open) return
    setOpen(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={() => { if (!open) onClose() }}
      className={cn(
        "fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-6",
        !open && "pointer-events-none"
      )}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        /* 遮罩的模糊也接全站「材质厚度」档位（.dc-gblur × --dc-mat-scale） */
        style={{ "--gblur": "2px" } as React.CSSProperties}
        className="absolute inset-0 bg-black/40 dc-gblur"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: open ? 1 : 0, y: open ? 0 : 12, scale: open ? 1 : 0.98 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[88vh] dc-mat dc-mat--ultra flex flex-col overflow-hidden"
        style={{ borderRadius: 10 }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 z-50 size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          style={{ borderRadius: 8 }}
          title="关闭"
        >
          <IconClose size={16} />
        </button>

        <ScrollArea className="flex-1">
          <div className="px-6 pt-6 pb-5">
            {/* 顶部：图标 + 标题 + 添加按钮 */}
            <div className="flex items-start gap-3.5">
              <div
                className="size-12 flex items-center justify-center font-semibold text-[20px] shrink-0"
                style={{
                  background: c.bg,
                  color: c.text,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10
                }}
              >
                {(skill.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-[18px] font-semibold leading-tight text-zinc-900 tracking-tight">
                  {skill.name}
                </h2>
                <p className="text-[13px] text-zinc-500 leading-relaxed mt-1.5 pr-2">
                  {skill.description}
                </p>
              </div>
              <Button
                onClick={(e) => isInstalled ? onUninstall(e, skill.skill_id) : onInstall(e, skill.skill_id)}
                disabled={isBuiltin}
                className={cn(
                  "h-8 px-3.5 text-[13px] font-medium shrink-0 gap-1.5",
                  isBuiltin
                    ? "!bg-zinc-100 !text-zinc-400 !border-zinc-200 cursor-not-allowed"
                    : isInstalled
                      ? "!bg-white !text-red-500 !border !border-red-200 hover:!bg-red-50 hover:!border-red-300"
                      : "!bg-zinc-900 hover:!bg-zinc-800 !text-white !border-zinc-900"
                )}
                style={{ borderRadius: 8 }}
              >
                {isBuiltin ? (
                  <><IconShield size={13} />内置</>
                ) : isInstalled ? (
                  <><IconCheck size={13} />已添加</>
                ) : (
                  <><IconPlus size={13} strokeWidth={2.5} />添加 Skill</>
                )}
              </Button>
            </div>

            {/* 推荐 Prompt */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <IconMagic size={12} className="text-zinc-400" />
                  <span className="text-[13px] font-semibold text-zinc-700">推荐 Prompt</span>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="size-6 flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  style={{ borderRadius: 6 }}
                  title="复制"
                >
                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入推荐用法描述…"
                rows={2}
                className="w-full px-3 py-2 text-[13px] text-zinc-700 bg-white border border-zinc-200 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors resize-none leading-relaxed placeholder:text-zinc-300"
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* 内容区（技能 SKILL.md） */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-2">
                <IconTerminal size={12} className="text-zinc-400" />
                <span className="text-[13px] font-semibold text-zinc-700">技能详情</span>
              </div>
              <pre
                className="text-[12px] font-mono text-zinc-300 bg-zinc-900 px-3.5 py-3 overflow-auto max-h-[260px] leading-relaxed scrollbar-thin whitespace-pre-wrap break-words"
                style={{ borderRadius: 8 }}
              >
{skill.content || "（暂无内容）"}
              </pre>
            </div>

            {/* 元信息：作者 / 版本 / 协议 */}
            <div className="mt-4 flex items-center gap-3 text-[12px] text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1">
                <IconUser size={11} />{skill.author}
              </span>
              <span className="w-px h-3 bg-zinc-200" />
              <span className="flex items-center gap-1">
                <IconTag size={11} />v{skill.version}
              </span>
              {skill.category && (
                <>
                  <span className="w-px h-3 bg-zinc-200" />
                  <span className="flex items-center gap-1">
                    <IconBookOpen size={11} />{skill.category}
                  </span>
                </>
              )}
              <span className="w-px h-3 bg-zinc-200" />
              <span className="flex items-center gap-1">
                <IconShield size={11} />Stravision 协议保护
              </span>
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  )
}

// ================================================================
//  技能卡片
// ================================================================
const SkillCard = ({
  skill,
  installed,
  onClick,
  onInstall
}: {
  skill: StoreSkill
  installed: boolean
  onClick: () => void
  onInstall: (e: React.MouseEvent) => void
}) => {
  const isBuiltin = skill.is_builtin === 1
  return (
    <div
      onClick={onClick}
      /* HDS 沉浸光感 · 卡片档（2026-09-26 用户要求：改组件外观，不动布局）
         · dc-mat --regular = 半透底 + 背景模糊 + 1px 受光边 + 柔和投影（替换 bg-white / border-zinc-200）
         · dc-ctrl--press --card = 既有按压修饰符：按下 scale .985 + 亮度 .97（替代原来完全没有的按压反馈）
         ⚠️ 布局类一个没动：group / relative / flex flex-col / gap-2.5 / px-4 pt-4 pb-3.5 / 圆角 10。
         ⚠️ hover:border-emerald-300 保留 —— 材质只定边框的初始色，Tailwind 的 hover 类照样能改它。 */
      className="group relative flex flex-col gap-2.5 px-4 pt-4 pb-3.5 dc-mat dc-mat--regular dc-ctrl--press dc-press--card hover:border-emerald-300 transition-colors cursor-pointer"
      style={{ borderRadius: 10 }}
    >
      <div className="flex items-start gap-3">
        <SkillBadge name={skill.name} size="md" shape="circle" />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-zinc-900 truncate group-hover:text-emerald-700 transition-colors">
              {skill.name}
            </h3>
            {isBuiltin && (
              <IconShield size={11} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
            )}
          </div>
        </div>
      </div>
      <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-3 min-h-[3.6em]">
        {skill.description}
      </p>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-[12px] text-zinc-400 flex items-center gap-1">
          <IconUser size={11} />
          {skill.author}
        </span>
        {installed || isBuiltin ? (
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <IconCheck size={11} strokeWidth={3} />
            {isBuiltin ? "内置" : "已添加"}
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onInstall(e) }}
            className="size-6 flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            style={{ borderRadius: 6 }}
            title="添加至会话"
          >
            <IconPlus size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}

// ================================================================
//  主组件：技能商店（参考图 1 重设计）
// ================================================================
type MainTab = "recommended" | "official" | "skillhub" | "opensource"
type SubTab = "all" | "official" | "other"

export function SkillStore({ searchQuery = "" }: { searchQuery?: string }) {
  const [skills, setSkills] = useState<StoreSkill[]>([])
  const [installedIds, setInstalledIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<StoreSkill | null>(null)

  const [mainTab, setMainTab] = useState<MainTab>("recommended")
  const [subTab, setSubTab] = useState<SubTab>("all")
  const [localSearch, setLocalSearch] = useState(searchQuery)

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const [skillsRes, userRes] = await Promise.all([
        fetch('/api/skills/store'),
        fetch('/api/skills/user')
      ])
      const skillsData = await skillsRes.json()
      const userData = await userRes.json()

      const sorted = (Array.isArray(skillsData) ? skillsData : []).sort(
        (a, b) => (b.priority || 0) - (a.priority || 0)
      )
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
        toast.success("已添加至会话")
      } else {
        toast.error("添加失败")
      }
    } catch (error) {
      toast.error("添加失败")
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
      toast.error("移除失败")
    }
  }

  // 过滤逻辑
  const filteredSkills = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    return skills.filter(s => {
      // 主标签
      if (mainTab === "official" && s.is_builtin !== 1) return false
      if (mainTab === "skillhub" && (s.is_builtin === 1 || (s.author && s.author !== "StravisionAI"))) return false
      if (mainTab === "opensource" && (s.is_builtin === 1 || !s.author || s.author === "StravisionAI")) return false
      // 子标签
      if (subTab === "official" && !(s.is_builtin === 1 || s.author === "StravisionAI")) return false
      if (subTab === "other" && (s.is_builtin === 1 || s.author === "StravisionAI")) return false
      // 搜索
      if (q && !s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [skills, mainTab, subTab, localSearch])

  // 计数（基于主标签下的子集）
  const subCounts = useMemo(() => {
    const base = skills.filter(s => {
      if (mainTab === "official" && s.is_builtin !== 1) return false
      if (mainTab === "skillhub" && (s.is_builtin === 1 || (s.author && s.author !== "StravisionAI"))) return false
      if (mainTab === "opensource" && (s.is_builtin === 1 || !s.author || s.author === "StravisionAI")) return false
      return true
    })
    return {
      all: base.length,
      official: base.filter(s => s.is_builtin === 1 || s.author === "StravisionAI").length,
      other: base.filter(s => !(s.is_builtin === 1 || s.author === "StravisionAI")).length,
    }
  }, [skills, mainTab])

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "recommended", label: "推荐" },
    { key: "official", label: "官方" },
    { key: "skillhub", label: "SkillHub" },
    { key: "opensource", label: "开源社区" },
  ]

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "official", label: "官方自研" },
    { key: "other", label: "其他" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* 标题区 */}
      <div className="flex items-center justify-between gap-6 mb-7">
        <div>
          <h1 className="text-[32px] font-bold text-zinc-900 leading-none tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Skills
          </h1>
          <p className="text-[13px] text-zinc-500 mt-2.5 flex items-center gap-1">
            <span>找对技能，搞定任务</span>
            <a className="text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium inline-flex items-center gap-0.5">
              技能管理
              <span aria-hidden>→</span>
            </a>
          </p>
        </div>
        <SkillsIllustration className="hidden md:block shrink-0" />
      </div>

      {/* 主标签 + 搜索 */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-1 dc-ctrl--track p-1 rounded-xl">
          {mainTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={cn(
                "px-5 py-1.5 text-[13px] font-medium transition-all rounded-lg",
                /* 选中块 = dc-ctrl--thumb（比滑槽亮一档的白玻璃滑块），滑槽 = dc-ctrl--track。
                   两块读同一组 --mat-* 变量 → 选中块滑动过去时材质是连续的（不会突然换一种白）。 */
                mainTab === t.key
                  ? "dc-ctrl--thumb text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索技能"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] dc-ctrl--field text-zinc-700 placeholder-zinc-400 focus:border-emerald-300 focus:outline-none transition-colors"
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>

      {/* 子标签 */}
      <div className="flex items-center gap-6 mb-5 border-b border-zinc-200/80">
        {subTabs.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              "relative pb-2.5 text-[13px] font-medium transition-colors",
              subTab === t.key
                ? "text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <span className="inline-flex items-center gap-1">
              {t.label}
              <span className={cn(
                "text-[11px] tabular-nums",
                subTab === t.key ? "text-zinc-500" : "text-zinc-400"
              )}>
                {i === 0 ? `(${subCounts.all})` : subCounts[t.key as keyof typeof subCounts]}
              </span>
            </span>
            {subTab === t.key && (
              <motion.span
                layoutId="subtab-underline"
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-emerald-600 pointer-events-none"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      {filteredSkills.length === 0 ? (
        <EmptyState
          className="py-20"
          illustration={localSearch ? "search" : "empty-list"}
          illustrationWidth={190}
          title={localSearch ? `未搜索到「${localSearch}」相关技能` : "暂无技能"}
          description={localSearch ? "换个关键词试试，或浏览推荐技能。" : "等技能上架后，这里会展示可安装的能力包。"}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map(skill => {
            const installed = installedIds.includes(skill.skill_id) || skill.is_builtin === 1
            return (
              <SkillCard
                key={skill.skill_id}
                skill={skill}
                installed={installed}
                onClick={() => setSelectedSkill(skill)}
                onInstall={(e) => handleInstall(e, skill.skill_id)}
              />
            )
          })}
        </div>
      )}

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
