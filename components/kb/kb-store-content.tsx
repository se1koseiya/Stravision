"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Empty, Spin } from "antd"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { IconArrowRight, IconArrowRightUp, IconBookOpen, IconBookshelf, IconCalendar, IconChartHistogram, IconCheck, IconClose, IconCompass, IconFileSearch, IconFileText, IconHeart, IconLayers, IconLightning, IconMagic, IconPlus, IconPreviewOpen, IconRight, IconSearch, IconShield, IconTag, IconTime, IconUser } from "@/components/icon";

interface MarketItem {
  id: number
  title: string
  summary: string | null
  content_type: string
  file_url: string | null
  mime_type: string | null
  file_size: number
  embedding_status: string
  view_count: number
  tags_cache: string
  created_at: number
  updated_at: number
}

export interface MarketCollection {
  id: number
  name: string
  description: string | null
  category: string
  color: string
  icon: string
  cover_image: string | null
  popularity: number
  official: 0 | 1
  item_count: number
  subscriber_count: number
  item_count_real: number
  is_subscribed: 0 | 1
  publisher_name?: string | null
  published_at: number | null
}

const PALETTE = [
  { bg: "rgba(22,119,255,0.10)", text: "#1677ff", border: "rgba(22,119,255,0.22)" },
  { bg: "rgba(82,196,26,0.10)", text: "#389e0d", border: "rgba(82,196,26,0.22)" },
  { bg: "rgba(250,140,22,0.10)", text: "#d46b08", border: "rgba(250,140,22,0.22)" },
  { bg: "rgba(124,58,237,0.10)", text: "#7c3aed", border: "rgba(124,58,237,0.22)" },
  { bg: "rgba(19,194,194,0.10)", text: "#08979c", border: "rgba(19,194,194,0.22)" },
  { bg: "rgba(235,47,150,0.10)", text: "#c41d7f", border: "rgba(235,47,150,0.22)" },
]

const hashIndex = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % PALETTE.length
}

// ================================================================
//  装饰插图：参考 MCP store 风格
// ================================================================
const KbIllustration = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="200"
    height="110"
    viewBox="0 0 200 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M5 85 C 35 35, 75 25, 110 50 S 175 70, 195 45"
      stroke="#1677ff"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
      opacity="0.85"
    />
    <circle cx="60" cy="48" r="22" fill="rgba(22,119,255,0.10)" />
    {[42, 48, 54, 60, 66, 72, 78].map(x => (
      <line key={x} x1={x} y1={28} x2={x} y2={68} stroke="#1677ff" strokeWidth="1" opacity="0.55" />
    ))}
    <circle cx="115" cy="58" r="24" fill="rgba(22,119,255,0.18)" />
    <circle cx="108" cy="22" r="4" fill="#1677ff" />
    <text x="98" y="55" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#1677ff" fontWeight="600">{`KB`}</text>
    <g transform="translate(165, 22)">
      <line x1="0" y1="-9" x2="0" y2="9" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-9" y1="0" x2="9" y2="0" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="-6.5" x2="6.5" y2="6.5" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="6.5" x2="6.5" y2="-6.5" stroke="#1677ff" strokeWidth="1.4" strokeLinecap="round" />
    </g>
    <circle cx="20" cy="20" r="1.6" fill="#1677ff" />
    <circle cx="180" cy="60" r="1.6" fill="#1677ff" />
    <circle cx="195" cy="80" r="1" fill="#1677ff" opacity="0.6" />
    <circle cx="40" cy="95" r="1.2" fill="#1677ff" opacity="0.5" />
  </svg>
)

// ================================================================
//  卡片图标
// ================================================================
const CollectionIcon = ({
  collection,
  size = "md",
  shape = "circle"
}: {
  collection: MarketCollection
  size?: "sm" | "md" | "lg"
  shape?: "circle" | "square"
}) => {
  const dim =
    size === "lg" ? "size-12 text-[18px]" :
      size === "sm" ? "size-8 text-[13px]" :
        "size-10 text-[15px]"
  const radius = shape === "square" ? "rounded-md" : "rounded-full"

  const [imgFailed, setImgFailed] = useState(false)

  if (!collection.cover_image || imgFailed) {
    const first = (collection.name || "?").trim().charAt(0).toUpperCase()
    const c = PALETTE[hashIndex(collection.name || "?")]
    return (
      <div
        className={cn(
          dim, radius,
          "flex items-center justify-center font-semibold shrink-0 select-none"
        )}
        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
      >
        {first}
      </div>
    )
  }
  return (
    <div
      className={cn(
        dim, radius,
        "flex items-center justify-center shrink-0 select-none bg-white border border-gray-200"
      )}
    >
      <img
        src={collection.cover_image}
        alt={collection.name}
        className="size-[80%] object-cover rounded-[inherit]"
        onError={() => setImgFailed(true)}
      />
    </div>
  )
}

// ================================================================
//  详情视图（弹窗）— 重新设计：标题区 / 导航 / 主体内容 / 相关资源
// ================================================================
type DetailTab = "overview" | "documents" | "related"

const TYPE_LABELS: Record<string, string> = {
  note: "笔记", text: "文本", image: "图片",
  document: "文档", pdf: "PDF", audio: "音频",
  video: "视频", web_clip: "剪藏", link: "链接"
}

function formatSize(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—"
  if (ts < 1e12) ts = ts * 1000
  const d = new Date(ts)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function CollectionDetailView({
  collection,
  subscribedIds,
  allCollections,
  onClose,
  onSubscribe,
  onUnsubscribe,
  onOpen,
  onSelect
}: {
  collection: MarketCollection
  subscribedIds: Set<number>
  allCollections: MarketCollection[]
  onClose: () => void
  onSubscribe: (c: MarketCollection) => Promise<void>
  onUnsubscribe: (c: MarketCollection) => Promise<void>
  onOpen: (c: MarketCollection) => void
  onSelect: (c: MarketCollection) => void
}) {
  const isSubscribed = subscribedIds.has(collection.id)
  const isOfficial = collection.official === 1
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<DetailTab>("overview")
  const [items, setItems] = useState<MarketItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // 关闭：先关掉 pointer-events（立刻让点击穿透），再通知父组件卸载
  const handleClose = () => {
    if (!open) return
    setOpen(false)
    onClose()
  }
  // 兜底：动画完成后强制再调一次 onClose，确保父组件状态推进
  const handleExitComplete = () => {
    if (!open) onClose()
  }

  // 仅在切到 documents tab 时按需加载
  useEffect(() => {
    if (tab !== "documents") return
    if (!isSubscribed) return
    if (items.length > 0) return
    setItemsLoading(true)
    fetch(`/api/knowledge/market/${collection.id}/items?limit=50`)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data?.list) ? data.list : []))
      .catch(() => toast.error("加载文档失败"))
      .finally(() => setItemsLoading(false))
  }, [tab, isSubscribed, collection.id, items.length])

  // 相关推荐：同分类 or 官方，排除自身，最多 4 条
  const related = useMemo(() => {
    return allCollections
      .filter(c => c.id !== collection.id)
      .filter(c => c.category === collection.category || (isOfficial && c.official === 1))
      .slice(0, 4)
  }, [allCollections, collection.id, collection.category, isOfficial])

  // Esc 键关闭弹窗
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // 文档类型分布（基于已加载 items）
  const typeDistribution = useMemo(() => {
    const map: Record<string, number> = {}
    items.forEach(it => {
      const k = TYPE_LABELS[it.content_type] || it.content_type || "其他"
      map[k] = (map[k] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={handleExitComplete}
      className={cn(
        "fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-6",
        !open && "pointer-events-none"
      )}
    >
      <motion.div
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: open ? 1 : 0, y: open ? 0 : 20, scale: open ? 1 : 0.98 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full sm:max-w-3xl lg:max-w-4xl max-h-[92vh] bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ borderRadius: 12 }}
      >
        {/* ====== 1. 标题区域 / Hero ====== */}
        <div className="relative shrink-0">
          {/* Cover image as background — 仅在有图时出现；无图则不显示任何色块 */}
          {collection.cover_image && (
            <div className="relative h-32 sm:h-40 w-full overflow-hidden">
              <img
                src={collection.cover_image}
                alt={collection.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none" }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 size-8 flex items-center justify-center text-gray-500 bg-white/80 hover:bg-white hover:text-gray-900 backdrop-blur-sm border border-gray-200/60 transition-all"
            style={{ borderRadius: 8 }}
            title="关闭 (Esc)"
            aria-label="关闭"
          >
            <IconClose size={15} strokeWidth={2.2} />
          </button>

          <div className="px-6 sm:px-8 pt-5 sm:pt-6 pb-4 sm:pb-5">
            {/* Title block */}
            <div className="flex items-start gap-4">
              <CollectionIcon collection={collection} size="lg" shape="square" />
              <div className="flex-1 min-w-0">
                {/* Badges row — 取消外框，仅用文字+图标区分 */}
                <div className="flex items-center gap-3 mb-1.5 flex-wrap text-[11.5px]">
                  {isOfficial && (
                    <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                      <IconShield size={11} strokeWidth={2.5} />
                      官方认证
                    </span>
                  )}
                  {collection.category && (
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <IconTag size={11} />
                      {collection.category}
                    </span>
                  )}
                  {isSubscribed && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <IconCheck size={11} strokeWidth={3} />
                      已订阅
                    </span>
                  )}
                </div>

                <h2 className="text-[22px] sm:text-[24px] font-semibold leading-tight text-gray-900 tracking-tight">
                  {collection.name}
                </h2>
                {collection.description && (
                  <p className="text-[13px] text-gray-500 leading-relaxed mt-1.5 pr-4 line-clamp-2">
                    {collection.description}
                  </p>
                )}
              </div>

              {/* Actions — aligned to the rightmost side */}
              <div className="flex flex-col gap-1.5 shrink-0 self-start">
                {isSubscribed ? (
                  <Button
                    onClick={() => onOpen(collection)}
                    className="!h-8 !px-3.5 text-[12.5px] font-medium gap-1.5 !bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-600 shadow-sm"
                    style={{ borderRadius: 8 }}
                  >
                    <IconArrowRightUp size={13} strokeWidth={2.5} />
                    进入对话
                  </Button>
                ) : null}
                <Button
                  onClick={() => isSubscribed ? onUnsubscribe(collection) : onSubscribe(collection)}
                  className={cn(
                    "!h-8 !px-3.5 text-[12.5px] font-medium gap-1.5",
                    isSubscribed
                      ? "!bg-white !text-red-500 !border !border-red-200 hover:!bg-red-50 hover:!border-red-300"
                      : "!bg-gray-900 hover:!bg-gray-800 !text-white !border-gray-900"
                  )}
                  style={{ borderRadius: 8 }}
                >
                  {isSubscribed ? (
                    <><IconCheck size={13} />已订阅</>
                  ) : (
                    <><IconPlus size={13} strokeWidth={2.5} />订阅</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ====== 1.5 关键指标——纯文本行 + 竖线分隔，无外框 ====== */}
        <div
          className="shrink-0 flex items-center divide-x divide-gray-200 px-6 sm:px-8 py-3 border-y border-gray-200/80 text-[12px]"
        >
          <InlineStat
            icon={<IconFileText size={12} className="text-gray-400" />}
            label="文档"
            value={collection.item_count_real ?? 0}
          />
          <InlineStat
            icon={<IconHeart size={12} className="text-gray-400" />}
            label="订阅"
            value={collection.subscriber_count ?? 0}
          />
          <InlineStat
            icon={<IconUser size={12} className="text-gray-400" />}
            label="发布者"
            value={collection.publisher_name || "匿名"}
            isText
          />
          <InlineStat
            icon={<IconCalendar size={12} className="text-gray-400" />}
            label="更新"
            value={formatDate(collection.published_at)}
            isText
          />
        </div>

        {/* ====== 2. 内容导航 / Tabs ====== */}
        <div className="shrink-0 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 px-6 sm:px-8">
          <div className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {([
              { key: "overview", label: "概览", icon: <IconCompass size={13} /> },
              { key: "documents", label: "文档", icon: <IconFileSearch size={13} />, badge: collection.item_count_real ?? 0 },
              { key: "related", label: "相关推荐", icon: <IconMagic size={13} />, badge: related.length }
            ] as { key: DetailTab; label: string; icon: React.ReactNode; badge?: number }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors whitespace-nowrap",
                  tab === t.key ? "text-blue-600" : "text-gray-500 hover:text-gray-800"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  tab === t.key ? "text-blue-600" : "text-gray-400"
                )}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span className="ml-0.5 text-[10.5px] tabular-nums text-gray-400">
                    {t.badge}
                  </span>
                )}
                {tab === t.key && (
                  <motion.span
                    layoutId="kb-detail-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-600 pointer-events-none"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ====== 3. 主体内容 ====== */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="px-6 sm:px-8 py-6 sm:py-7"
              >
                {tab === "overview" && (
                  <OverviewTab
                    collection={collection}
                    isSubscribed={isSubscribed}
                  />
                )}
                {tab === "documents" && (
                  <DocumentsTab
                    collection={collection}
                    items={items}
                    isSubscribed={isSubscribed}
                    loading={itemsLoading}
                    typeDistribution={typeDistribution}
                    onOpen={onOpen}
                  />
                )}
                {tab === "related" && (
                  <RelatedTab
                    related={related}
                    subscribedIds={subscribedIds}
                    onSelect={onSelect}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ----- Inline stat (Hero 指标行) —— 无外框，竖线分隔 -----
function InlineStat({
  icon, label, value, isText = false
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  isText?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 px-4 first:pl-0 last:pr-0 min-w-0">
      {icon}
      <span className="text-gray-500">{label}</span>
      <span
        className={cn(
          "text-gray-900 truncate",
          isText ? "font-medium" : "font-semibold tabular-nums"
        )}
        title={String(value)}
      >
        {value}
      </span>
    </div>
  )
}

// ----- Overview Tab -----
function OverviewTab({
  collection, isSubscribed
}: {
  collection: MarketCollection
  palette?: { bg: string; text: string; border: string }
  isSubscribed: boolean
}) {
  const isOfficial = collection.official === 1

  return (
    <div className="divide-y divide-gray-100">
      {/* 推荐用法 —— 无外框，纯文字+内联 code */}
      <section className="pb-6">
        <SectionHeader
          icon={<IconLightning size={13} />}
          title="推荐用法"
          subtitle="如何让 AI 在回答时自动检索此知识库"
        />
        <p className="text-[13px] text-gray-700 leading-relaxed">
          在 AI 助手对话中输入
          <code className="mx-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[12.5px] font-medium">
            /{collection.name}
          </code>
          即可让 AI 在回答时自动检索本知识库。
        </p>
        {!isSubscribed && (
          <p className="text-[11.5px] text-gray-400 mt-2">
            订阅后即可在对话中启用该知识库
          </p>
        )}
      </section>

      {/* 核心信息 —— 文字网格，无外框 */}
      <section className="py-6">
        <SectionHeader icon={<IconChartHistogram size={13} />} title="核心信息" />
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
          <InfoItem label="条目数" value={String(collection.item_count_real ?? 0)} />
          <InfoItem label="订阅人数" value={String(collection.subscriber_count ?? 0)} />
          <InfoItem label="分类" value={collection.category || "未分类"} isText />
          <InfoItem label="发布者" value={collection.publisher_name || "匿名"} isText />
        </dl>
      </section>

      {/* 描述 —— 无外框，直接文本 */}
      {collection.description && (
        <section className="py-6">
          <SectionHeader icon={<IconFileText size={13} />} title="知识库简介" />
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
            {collection.description}
          </p>
        </section>
      )}

      {/* 元信息底栏 —— 无外框，纯图标+文字 */}
      <section className="pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-gray-500">
          <MetaItem icon={<IconBookshelf size={11} />} text="知识库" />
          {isOfficial && (
            <MetaItem icon={<IconShield size={11} />} text="官方认证" accent />
          )}
          <MetaItem icon={<IconBookOpen size={11} />} text={`${collection.item_count_real ?? 0} 个文档`} />
          <MetaItem icon={<IconCalendar size={11} />} text={`发布于 ${formatDate(collection.published_at)}`} />
        </div>
      </section>
    </div>
  )
}

function InfoItem({
  label, value, isText = false
}: {
  label: string
  value: string
  isText?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-gray-500 mb-1">{label}</dt>
      <dd
        className={cn(
          "text-gray-900 truncate",
          isText ? "text-[13px] font-medium" : "text-[20px] font-semibold tabular-nums leading-none"
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

function MetaItem({
  icon, text, accent = false
}: {
  icon: React.ReactNode
  text: string
  accent?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-1", accent && "text-blue-600")}>
      {icon}
      {text}
    </span>
  )
}

function SectionHeader({
  icon, title, subtitle
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <span className="text-blue-500">{icon}</span>
        <h3 className="text-[13px] font-semibold text-gray-900 tracking-tight">{title}</h3>
      </div>
      {subtitle && (
        <p className="text-[11.5px] text-gray-500 mt-0.5 pl-5">{subtitle}</p>
      )}
    </div>
  )
}

// ----- Documents Tab -----
function DocumentsTab({
  collection, items, isSubscribed, loading, typeDistribution, onOpen
}: {
  collection: MarketCollection
  items: MarketItem[]
  isSubscribed: boolean
  loading: boolean
  typeDistribution: [string, number][]
  onOpen: (c: MarketCollection) => void
}) {
  if (!isSubscribed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <IconFileSearch size={28} className="text-gray-300 mb-3" strokeWidth={1.4} />
        <h3 className="text-[14px] font-medium text-gray-700 mb-1">
          订阅后查看文档列表
        </h3>
        <p className="text-[12.5px] text-gray-400 max-w-sm leading-relaxed mb-5">
          「{collection.name}」共 {collection.item_count_real ?? 0} 个文档，订阅后即可浏览并基于文档与 AI 对话。
        </p>
        <Button
          onClick={() => onOpen(collection)}
          className="!h-8 !px-3.5 !text-[12.5px] !font-medium !bg-gray-900 hover:!bg-gray-800 !text-white !border-gray-900 gap-1.5"
          style={{ borderRadius: 8 }}
        >
          <IconArrowRightUp size={13} strokeWidth={2.5} />
          订阅并查看
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spin />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Empty
        description={
          <span className="text-[12.5px] text-gray-500">该知识库暂无文档</span>
        }
        className="py-12"
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* 文档统计概览 —— 无外框，纯 inline pills */}
      {typeDistribution.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-gray-500">
          <IconLayers size={12} className="text-gray-400" />
          <span>类型分布</span>
          {typeDistribution.map(([type, count], i) => (
            <span key={type} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">·</span>}
              <span className="text-gray-700">{type}</span>
              <span className="text-gray-400 tabular-nums">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* 文档列表 —— 行式 + hover 底色，无外框 */}
      <div>
        <SectionHeader
          icon={<IconFileText size={13} />}
          title="文档列表"
          subtitle={`共 ${items.length} 个文档，按更新时间排序`}
        />
        <ul className="divide-y divide-gray-100 -mx-2">
          {items.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
            >
              <DocumentRow item={item} />
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DocumentRow({ item }: { item: MarketItem }) {
  return (
    <div className="group flex items-start gap-3 px-2 py-3 -mx-2 hover:bg-gray-50 transition-colors cursor-default">
      <IconFileText size={15} className="text-gray-400 mt-0.5 shrink-0" strokeWidth={1.6} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-[13px] font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
            {item.title}
          </h4>
          <span className="shrink-0 text-[11px] text-gray-400">
            {TYPE_LABELS[item.content_type] || item.content_type}
          </span>
        </div>
        {item.summary && (
          <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-1">
            {item.summary}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
          {item.file_size > 0 && (
            <span>{formatSize(item.file_size)}</span>
          )}
          <span>{formatDate(item.updated_at)}</span>
          {item.view_count > 0 && (
            <span className="flex items-center gap-0.5">
              <IconPreviewOpen size={10} />
              {item.view_count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ----- Related Tab -----
function RelatedTab({
  related, subscribedIds, onSelect
}: {
  related: MarketCollection[]
  subscribedIds: Set<number>
  onSelect: (c: MarketCollection) => void
}) {
  if (related.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <IconCompass size={28} className="text-gray-300 mb-3" strokeWidth={1.4} />
        <h3 className="text-[14px] font-medium text-gray-700 mb-1">
          暂无相关推荐
        </h3>
        <p className="text-[12.5px] text-gray-400 max-w-sm">
          稍后再来看看，或者去知识库市场探索更多领域。
        </p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader
        icon={<IconMagic size={13} />}
        title="相关推荐"
        subtitle="同分类或同标签的优质知识库"
      />
      <ul className="divide-y divide-gray-100 -mx-2">
        {related.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: i * 0.04 }}
          >
            <button
              type="button"
              onClick={() => onSelect(c)}
              className="group w-full text-left flex items-center gap-3 px-2 py-3 -mx-2 hover:bg-gray-50 transition-colors"
            >
              <CollectionIcon collection={c} size="sm" shape="square" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13.5px] font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                    {c.name}
                  </h4>
                  {c.official === 1 && (
                    <IconShield size={11} className="text-blue-500 shrink-0" strokeWidth={2.5} />
                  )}
                  {subscribedIds.has(c.id) && (
                    <span className="text-[11px] text-emerald-600 font-medium">已订阅</span>
                  )}
                </div>
                {c.description && (
                  <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-1 mt-0.5">
                    {c.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                  {c.category && <span>{c.category}</span>}
                  <span className="flex items-center gap-0.5">
                    <IconFileText size={10} />
                    <span className="tabular-nums">{c.item_count_real ?? 0}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <IconHeart size={10} />
                    <span className="tabular-nums">{c.subscriber_count ?? 0}</span>
                  </span>
                </div>
              </div>
              <IconArrowRight
                size={14}
                className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0"
                strokeWidth={2}
              />
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

// ================================================================
//  卡片
// ================================================================
const CollectionCard = ({
  collection,
  subscribed,
  onClick,
  onSubscribe
}: {
  collection: MarketCollection
  subscribed: boolean
  onClick: () => void
  onSubscribe: (e: React.MouseEvent) => void
}) => {
  const isOfficial = collection.official === 1
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2.5 px-4 pt-4 pb-3.5 bg-white border border-gray-200/80 hover:border-blue-300 transition-colors cursor-pointer"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start gap-3">
        <CollectionIcon collection={collection} size="md" shape="circle" />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
              {collection.name}
            </h3>
            {isOfficial && (
              <IconShield size={11} className="text-blue-500 shrink-0" strokeWidth={2.5} />
            )}
          </div>
          {collection.category && (
            <span className="text-[11px] text-gray-400 mt-0.5 inline-block">· {collection.category}</span>
          )}
        </div>
      </div>
      <p className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-3 min-h-[3.6em]">
        {collection.description || "暂无描述"}
      </p>
      <div className="mt-auto flex items-center justify-between pt-1">
        <Space stats={collection} />
        {subscribed ? (
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <IconCheck size={11} strokeWidth={3} />
            已订阅
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onSubscribe(e) }}
            className="size-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            style={{ borderRadius: 6 }}
            title="订阅"
          >
            <IconPlus size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}

function Space({ stats }: { stats: MarketCollection }) {
  return (
    <span className="text-[11.5px] text-gray-400 flex items-center gap-2.5">
      <span className="flex items-center gap-1">
        <IconFileText size={11} />
        {stats.item_count_real ?? 0}
      </span>
      <span className="flex items-center gap-1">
        <IconHeart size={11} />
        {stats.subscriber_count ?? 0}
      </span>
    </span>
  )
}

// ================================================================
//  主组件
// ================================================================
type MainTab = "recommended" | "official" | "subscribed" | "agriculture"
type SubTab = "all" | "official" | "other"

// 统一从底部 re-export CollectionDetailModal，避免在模块顶部 forward-reference
export { CollectionDetailView as CollectionDetailModal }

export function KBStoreContent({
  searchQuery = "",
  darkMode = false,
  onOpenCollection
}: {
  searchQuery?: string
  darkMode?: boolean
  onOpenCollection?(id: number): void
}) {
  const [collections, setCollections] = useState<MarketCollection[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MarketCollection | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>("recommended")
  const [subTab, setSubTab] = useState<SubTab>("all")
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [sort, setSort] = useState<"published_at" | "popularity" | "created_at">("published_at")

  const isDark = darkMode

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge/market?limit=200&sort=${sort}`)
      const data = await res.json()
      const list: MarketCollection[] = Array.isArray(data?.list) ? data.list : []
      setCollections(list)
      // 初始化订阅集合
      const subs = new Set<number>()
      list.forEach(c => { if (c.is_subscribed === 1) subs.add(c.id) })
      setSubscribedIds(subs)
    } catch (e) {
      console.error(e)
      toast.error("加载知识库市场失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [sort])

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const handleSubscribe = async (c: MarketCollection) => {
    try {
      const res = await fetch(`/api/knowledge/market/${c.id}/subscribe`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "订阅失败")
      }
      const next = new Set(subscribedIds)
      next.add(c.id)
      setSubscribedIds(next)
      toast.success(`已订阅「${c.name}」`)
    } catch (e: any) {
      toast.error(e.message || "订阅失败")
    }
  }

  const handleUnsubscribe = async (c: MarketCollection) => {
    try {
      const res = await fetch(`/api/knowledge/market/${c.id}/subscribe`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "取消失败")
      }
      const next = new Set(subscribedIds)
      next.delete(c.id)
      setSubscribedIds(next)
      toast.success(`已取消订阅「${c.name}」`)
    } catch (e: any) {
      toast.error(e.message || "取消失败")
    }
  }

  const handleCardSubscribe = async (e: React.MouseEvent, c: MarketCollection) => {
    e.stopPropagation()
    if (subscribedIds.has(c.id)) {
      await handleUnsubscribe(c)
    } else {
      await handleSubscribe(c)
    }
  }

  // 过滤
  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    return collections.filter(c => {
      // 主标签
      if (mainTab === "official" && c.official !== 1) return false
      if (mainTab === "subscribed" && c.is_subscribed !== 1) return false
      if (mainTab === "agriculture" && c.category !== "agriculture") return false
      if (mainTab === "recommended") {
        // 推荐：官方 + 农业
        if (c.official !== 1 && c.category !== "agriculture") return false
      }
      // 子标签
      if (subTab === "official" && c.official !== 1) return false
      if (subTab === "other" && c.official === 1) return false
      // 搜索
      if (q) {
        const hay = `${c.name} ${c.description || ""} ${c.category}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [collections, mainTab, subTab, localSearch])

  const subCounts = useMemo(() => {
    const base = collections.filter(c => {
      if (mainTab === "official" && c.official !== 1) return false
      if (mainTab === "subscribed" && c.is_subscribed !== 1) return false
      if (mainTab === "agriculture" && c.category !== "agriculture") return false
      if (mainTab === "recommended") {
        if (c.official !== 1 && c.category !== "agriculture") return false
      }
      return true
    })
    return {
      all: base.length,
      official: base.filter(c => c.official === 1).length,
      other: base.filter(c => c.official !== 1).length,
    }
  }, [collections, mainTab])

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "recommended", label: "推荐" },
    { key: "official", label: "官方" },
    { key: "agriculture", label: "农业" },
    { key: "subscribed", label: "已订阅" },
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
            Knowledge Base
          </h1>
          <p className="text-[13px] text-gray-500 mt-2.5 flex items-center gap-1">
            <span>探索精选知识库，让 AI 助手更懂你的领域</span>
          </p>
        </div>
        <KbIllustration className="hidden md:block shrink-0" />
      </div>

      {/* 主标签 + 搜索 + 排序 */}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100/70 p-1 rounded-xl">
          {mainTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={cn(
                "px-4 py-1.5 text-[13px] font-medium transition-all rounded-lg",
                mainTab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="h-8 px-2 text-[12.5px] bg-white border border-gray-200 text-gray-700 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            style={{ borderRadius: 8 }}
          >
            <option value="published_at">最新发布</option>
            <option value="popularity">最受欢迎</option>
            <option value="created_at">最新创建</option>
          </select>
          <div className="relative w-56">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索知识库"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              style={{ borderRadius: 10 }}
            />
          </div>
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
                layoutId="kb-subtab-underline"
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600 pointer-events-none"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Empty
            description={
              <span className="text-[13px] text-gray-500">
                {localSearch ? `未搜索到 "${localSearch}" 相关知识库` : "暂无可显示的知识库"}
              </span>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const subscribed = subscribedIds.has(c.id)
            return (
              <CollectionCard
                key={c.id}
                collection={c}
                subscribed={subscribed}
                onClick={() => setSelected(c)}
                onSubscribe={(e) => handleCardSubscribe(e, c)}
              />
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <CollectionDetailView
            key={selected.id}
            collection={selected}
            subscribedIds={subscribedIds}
            allCollections={filtered}
            onClose={() => setSelected(null)}
            onSubscribe={handleSubscribe}
            onUnsubscribe={handleUnsubscribe}
            onOpen={(c) => {
              setSelected(null)
              if (onOpenCollection) {
                onOpenCollection(c.id)
              } else {
                // 没有外部导航回调时，通知 AI 助手开启基于该 KB 的对话
                window.dispatchEvent(new CustomEvent('berry:open-kb-chat', { detail: { collectionId: c.id, name: c.name } }))
              }
            }}
            onSelect={(c) => setSelected(c)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
