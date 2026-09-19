"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Empty, Spin } from "antd"
import { toast } from "sonner"
import type { MCPServer } from "@/lib/data/mcp-servers"
import { cn } from "@/lib/utils"
import { CustomMCPDialog } from "@/components/mcp/custom-mcp-dialog"
import { IconBookOpen, IconCheck, IconClose, IconCopy, IconLightning, IconMagic, IconPlus, IconSearch, IconServer, IconShield, IconTag, IconTerminal, IconUser } from "@/components/icon";

// ================================================================
//  装饰插图（匹配参考图：曲线 + 圆 + </> + * + 点）
// ================================================================
const PluginsIllustration = ({ className }: { className?: string }) => (
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
      stroke="#1677ff"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
      opacity="0.85"
    />
    {/* 左圆：竖线纹理 */}
    <circle cx="60" cy="48" r="22" fill="rgba(22,119,255,0.10)" />
    {[42, 48, 54, 60, 66, 72, 78].map(x => (
      <line
        key={x}
        x1={x}
        y1={28}
        x2={x}
        y2={68}
        stroke="#1677ff"
        strokeWidth="1"
        opacity="0.55"
      />
    ))}
    {/* 右圆：实心淡蓝 */}
    <circle cx="115" cy="58" r="24" fill="rgba(22,119,255,0.18)" />
    {/* 圆上小圆点 */}
    <circle cx="108" cy="22" r="4" fill="#1677ff" />
    {/* </> 符号 */}
    <text
      x="100"
      y="55"
      fontSize="11"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      fill="#1677ff"
      fontWeight="600"
    >{`</>`}</text>
    {/* 星号 */}
    <g transform="translate(165, 22)">
      <line x1="0" y1="-9" x2="0" y2="9" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-9" y1="0" x2="9" y2="0" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="-6.5" x2="6.5" y2="6.5" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="6.5" x2="6.5" y2="-6.5" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
    </g>
    {/* 散点 */}
    <circle cx="20" cy="20" r="1.6" fill="#1677ff" />
    <circle cx="180" cy="60" r="1.6" fill="#1677ff" />
    <circle cx="195" cy="80" r="1" fill="#1677ff" opacity="0.6" />
    <circle cx="40" cy="95" r="1.2" fill="#1677ff" opacity="0.5" />
  </svg>
)

// ================================================================
//  卡片图标：单字符 + 主题色圆（按名称哈希选色）
// ================================================================
const PALETTE = [
  { bg: "rgba(124,58,237,0.10)", text: "#7c3aed", border: "rgba(124,58,237,0.20)" }, // purple
  { bg: "rgba(22,119,255,0.10)", text: "#1677ff", border: "rgba(22,119,255,0.22)" }, // blue
  { bg: "rgba(82,196,26,0.10)", text: "#389e0d", border: "rgba(82,196,26,0.22)" },   // green
  { bg: "rgba(250,140,22,0.10)", text: "#d46b08", border: "rgba(250,140,22,0.22)" }, // orange
  { bg: "rgba(235,47,150,0.10)", text: "#c41d7f", border: "rgba(235,47,150,0.22)" }, // magenta
  { bg: "rgba(19,194,194,0.10)", text: "#08979c", border: "rgba(19,194,194,0.22)" }, // cyan
]

const hashIndex = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % PALETTE.length
}

const ServerIcon = ({
  server,
  size = "md",
  shape = "circle"
}: {
  server: MCPServer
  size?: "sm" | "md" | "lg"
  shape?: "circle" | "square"
}) => {
  const dim =
    size === "lg" ? "size-12 text-[20px]" :
      size === "sm" ? "size-8 text-[13px]" :
        "size-10 text-[15px]"
  const radius = shape === "square" ? "rounded-md" : "rounded-full"

  // 退回到首字母（优先用英文 name，再退到 displayName 中的首个英文字符）+ 颜色
  const getFirstLetter = (s: MCPServer): string => {
    const a = s.name || ""
    const b = s.displayName || ""
    const re = /[A-Za-z]/
    const m1 = a.match(re)
    if (m1) return m1[0].toUpperCase()
    const m2 = b.match(re)
    if (m2) return m2[0].toUpperCase()
    return (b.trim().charAt(0) || "?").toUpperCase()
  }

  // 跟踪图标是否加载失败：失败时也展示首字母兜底
  const [imgFailed, setImgFailed] = useState(false)

  // 图标缺失 / 加载失败时直接展示首字母 + 配色
  if (!server.icon || imgFailed) {
    const first = getFirstLetter(server)
    const c = PALETTE[hashIndex(server.name || server.displayName || "?")]
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

  // 优先使用服务器图标（加载失败时回退到首字母）
  return (
    <div
      className={cn(
        dim,
        radius,
        "flex items-center justify-center shrink-0 select-none bg-white border border-gray-200"
      )}
    >
      <img
        src={server.icon}
        alt={server.displayName}
        className="size-[60%] object-contain"
        onError={() => setImgFailed(true)}
      />
    </div>
  )
}

// ================================================================
//  插件详情视图（参考 skill-store SkillDetailView）
// ================================================================
const ServerDetailView = ({
  server,
  installedIds,
  onClose,
  onInstall,
  onUninstall,
  onCustom
}: {
  server: MCPServer
  installedIds: Set<string>
  onClose: () => void
  onInstall: (e: React.MouseEvent, server: MCPServer) => void
  onUninstall: (e: React.MouseEvent, server: MCPServer) => void
  onCustom: () => void
}) => {
  const isInstalled = installedIds.has(server.id)
  const isOfficial = server.official === true
  const [copied, setCopied] = useState(false)
  // 每个插件的专属推荐 Prompt：admin 可在后台编辑，详情页打开时自动加载
  const [prompt, setPrompt] = useState<string>(
    server.recommended_prompt || server.recommendedPrompt || ""
  )

  const handleCopyPrompt = () => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("推荐 Prompt 已复制")
  }

  const c = PALETTE[hashIndex(server.displayName || "?")]
  const commandLine = `${server.command} ${(server.args || []).join(' ')}`
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
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: open ? 1 : 0, y: open ? 0 : 12, scale: open ? 1 : 0.98 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[88vh] bg-white border border-gray-200/80 flex flex-col overflow-hidden"
        style={{ borderRadius: 12 }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 z-50 size-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          style={{ borderRadius: 8 }}
          title="关闭"
        >
          <IconClose size={16} />
        </button>

        <ScrollArea className="flex-1">
          <div className="px-6 pt-6 pb-5">
            {/* 顶部：图标 + 标题 + 添加按钮 */}
            <div className="flex items-start gap-3.5">
              <ServerIcon server={server} size="lg" shape="square" />
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-[18px] font-semibold leading-tight text-gray-900 tracking-tight">
                  {server.displayName}
                </h2>
                <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5 pr-2">
                  {server.description}
                </p>
              </div>
              <Button
                onClick={(e) => isInstalled ? onUninstall(e, server) : onInstall(e, server)}
                className={cn(
                  "h-8 px-3.5 text-[12.5px] font-medium shrink-0 gap-1.5",
                  isInstalled
                    ? "!bg-white !text-red-500 !border !border-red-200 hover:!bg-red-50 hover:!border-red-300"
                    : "!bg-gray-900 hover:!bg-gray-800 !text-white !border-gray-900"
                )}
                style={{ borderRadius: 8 }}
              >
                {isInstalled ? (
                  <><IconCheck size={13} />已添加</>
                ) : (
                  <><IconPlus size={13} strokeWidth={2.5} />添加插件</>
                )}
              </Button>
            </div>

            {/* 推荐 Prompt */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <IconMagic size={12} className="text-gray-400" />
                  <span className="text-[12.5px] font-semibold text-gray-700">推荐 Prompt</span>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="size-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
                className="w-full px-3 py-2 text-[12.5px] text-gray-700 bg-white border border-gray-200 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors resize-none leading-relaxed placeholder:text-gray-300"
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* 启动命令 */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-2">
                <IconTerminal size={12} className="text-gray-400" />
                <span className="text-[12.5px] font-semibold text-gray-700">启动命令</span>
              </div>
              <pre
                className="text-[12px] font-mono text-gray-300 bg-gray-900 px-3.5 py-3 overflow-auto max-h-[180px] leading-relaxed scrollbar-thin whitespace-pre-wrap break-words"
                style={{ borderRadius: 8 }}
              >
{commandLine || "（暂无命令）"}
              </pre>
            </div>

            {/* 核心功能 */}
            {server.features && server.features.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <IconLightning size={12} className="text-gray-400" />
                  <span className="text-[12.5px] font-semibold text-gray-700">核心功能</span>
                  <span className="text-[11px] text-gray-400">({server.features.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {server.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200"
                      style={{ borderRadius: 6 }}
                    >
                      <IconCheck size={11} className="text-blue-600 shrink-0" strokeWidth={3} />
                      <span className="text-[12px] text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 元信息：提供者 / 分类 / 协议 */}
            <div className="mt-4 flex items-center gap-3 text-[11.5px] text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <IconServer size={11} />{server.provider || "第三方"}
              </span>
              <span className="w-px h-3 bg-gray-200" />
              <span className="flex items-center gap-1">
                <IconTag size={11} />{server.category}
              </span>
              {isOfficial && (
                <>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="flex items-center gap-1">
                    <IconShield size={11} />官方认证
                  </span>
                </>
              )}
              <span className="w-px h-3 bg-gray-200" />
              <span className="flex items-center gap-1">
                <IconBookOpen size={11} />MCP 协议
              </span>
            </div>
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  )
}

// ================================================================
//  插件卡片
// ================================================================
const ServerCard = ({
  server,
  installed,
  onClick,
  onInstall
}: {
  server: MCPServer
  installed: boolean
  onClick: () => void
  onInstall: (e: React.MouseEvent) => void
}) => {
  const isOfficial = server.official === true
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2.5 px-4 pt-4 pb-3.5 bg-white border border-gray-200/80 hover:border-blue-300 transition-colors cursor-pointer"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start gap-3">
        <ServerIcon server={server} size="md" shape="circle" />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
              {server.displayName}
            </h3>
            {isOfficial && (
              <IconShield size={11} className="text-blue-500 shrink-0" strokeWidth={2.5} />
            )}
          </div>
          {server.category && (
            <span className="text-[11px] text-gray-400 mt-0.5 inline-block">· {server.category}</span>
          )}
        </div>
      </div>
      <p className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-3 min-h-[3.6em]">
        {server.description}
      </p>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-[11.5px] text-gray-400 flex items-center gap-1">
          <IconServer size={11} />
          {server.provider || "第三方"}
        </span>
        {installed ? (
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <IconCheck size={11} strokeWidth={3} />
            已添加
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onInstall(e) }}
            className="size-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
//  主组件：MCP 插件商店（参考 skill-store 重设计）
// ================================================================
type MainTab = "recommended" | "official" | "mcphub" | "opensource"
type SubTab = "all" | "official" | "other"

export function MCPStoreContent({ searchQuery = "", darkMode = false, onTryInChat }: { searchQuery?: string, darkMode?: boolean, onTryInChat?(toolName: string): void }) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [customServers, setCustomServers] = useState<MCPServer[]>([])
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)

  const [mainTab, setMainTab] = useState<MainTab>("recommended")
  const [subTab, setSubTab] = useState<SubTab>("all")
  const [localSearch, setLocalSearch] = useState(searchQuery)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/mcp-store')
      const data = await res.json()
      setServers(Array.isArray(data) ? data : [])

      const installed = localStorage.getItem("mcp-installed-servers")
      if (installed) setInstalledIds(new Set(JSON.parse(installed)))

      const custom = localStorage.getItem("mcp-custom-servers")
      if (custom) setCustomServers(JSON.parse(custom))
    } catch (error) {
      console.error("Failed to fetch mcp servers", error)
      toast.error("加载插件商店失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 当外部 searchQuery 变化时同步
  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const handleInstall = async (e: React.MouseEvent, server: MCPServer) => {
    e.stopPropagation()
    const next = new Set(installedIds)
    next.add(server.id)
    setInstalledIds(next)
    localStorage.setItem("mcp-installed-servers", JSON.stringify([...next]))
    const config = { ...server, envVars: { ...server.envVars } }
    localStorage.setItem(`mcp-config-${server.id}`, JSON.stringify(config))
    toast.success(`${server.displayName} 已准备就绪`)
  }

  const handleUninstall = async (e: React.MouseEvent, server: MCPServer) => {
    e.stopPropagation()
    const next = new Set(installedIds)
    next.delete(server.id)
    setInstalledIds(next)
    localStorage.setItem("mcp-installed-servers", JSON.stringify([...next]))
    toast.success(`已移除 ${server.displayName}`)
  }

  // 全部服务器（含自定义）
  const allServers = useMemo(() => {
    return [...servers, ...customServers]
  }, [servers, customServers])

  // 过滤逻辑
  const filteredServers = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    return allServers.filter(s => {
      // 主标签
      if (mainTab === "official" && !s.official) return false
      if (mainTab === "mcphub" && s.official) return false
      if (mainTab === "opensource" && s.official) return false
      if (mainTab === "recommended") {
        // 推荐：仅显示官方 + 农业类
        if (!s.official && s.category !== "agriculture") return false
      }
      // 子标签
      if (subTab === "official" && !s.official) return false
      if (subTab === "other" && s.official) return false
      // 搜索
      if (q && !s.displayName.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))
  }, [allServers, mainTab, subTab, localSearch])

  // 计数
  const subCounts = useMemo(() => {
    const base = allServers.filter(s => {
      if (mainTab === "official" && !s.official) return false
      if (mainTab === "mcphub" && s.official) return false
      if (mainTab === "opensource" && s.official) return false
      if (mainTab === "recommended") {
        if (!s.official && s.category !== "agriculture") return false
      }
      return true
    })
    return {
      all: base.length,
      official: base.filter(s => s.official).length,
      other: base.filter(s => !s.official).length,
    }
  }, [allServers, mainTab])

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "recommended", label: "推荐" },
    { key: "official", label: "官方" },
    { key: "mcphub", label: "MCP Hub" },
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
          <h1 className="text-[32px] font-bold text-gray-900 leading-none tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Plugins
          </h1>
          <p className="text-[13px] text-gray-500 mt-2.5 flex items-center gap-1">
            <span>扩展 AI 工具，连接万物</span>
          </p>
        </div>
        <PluginsIllustration className="hidden md:block shrink-0" />
      </div>

      {/* 主标签 + 搜索 */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-1 bg-gray-100/70 p-1 rounded-xl">
          {mainTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={cn(
                "px-5 py-1.5 text-[13px] font-medium transition-all rounded-lg",
                mainTab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索插件"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>

      {/* 子标签 */}
      <div className="flex items-center gap-6 mb-5 border-b border-gray-200/80">
        {subTabs.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              "relative pb-2.5 text-[13px] font-medium transition-colors",
              subTab === t.key
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="inline-flex items-center gap-1">
              {t.label}
              <span className={cn(
                "text-[11px] tabular-nums",
                subTab === t.key ? "text-gray-500" : "text-gray-400"
              )}>
                {i === 0 ? `(${subCounts.all})` : subCounts[t.key as keyof typeof subCounts]}
              </span>
            </span>
            {subTab === t.key && (
              <motion.span
                layoutId="plugin-subtab-underline"
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600 pointer-events-none"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      {filteredServers.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Empty
            description={
              <span className="text-[13px] text-gray-500">
                {localSearch ? `未搜索到 "${localSearch}" 相关插件` : "暂无插件"}
              </span>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServers.map(server => {
            const installed = installedIds.has(server.id)
            return (
              <ServerCard
                key={server.id}
                server={server}
                installed={installed}
                onClick={() => setSelectedServer(server)}
                onInstall={(e) => handleInstall(e, server)}
              />
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedServer && (
          <ServerDetailView
            key={selectedServer.id}
            server={selectedServer}
            installedIds={installedIds}
            onClose={() => setSelectedServer(null)}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
            onCustom={() => setCustomDialogOpen(true)}
          />
        )}
      </AnimatePresence>

      <CustomMCPDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        onSave={(server) => {
          const next = [...customServers, server]
          setCustomServers(next)
          localStorage.setItem("mcp-custom-servers", JSON.stringify(next))
          // 自动安装
          const installed = new Set(installedIds)
          installed.add(server.id)
          setInstalledIds(installed)
          localStorage.setItem("mcp-installed-servers", JSON.stringify([...installed]))
          const config = { ...server, envVars: { ...server.envVars } }
          localStorage.setItem(`mcp-config-${server.id}`, JSON.stringify(config))
          toast.success(`${server.displayName} 已添加并准备就绪`)
        }}
      />
    </div>
  )
}
