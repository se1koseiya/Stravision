"use client"

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { XCard, registerCatalog } from '@ant-design/x-card'
import type { A2UICommand_v0_9, ActionPayload, Catalog } from '@ant-design/x-card'
import { motion, AnimatePresence } from 'framer-motion'
import { BERRY_THEME } from '@/lib/ui/berry-theme'
import { IconArrowRight, IconBrain, IconCalendar, IconCamera, IconChartHistogram, IconChartLine, IconClose, IconComment, IconFileText, IconLightning, IconMagic, IconSearch } from "@/components/icon";

// ====== 能力数据定义 ======

interface Capability {
  id: string
  iconName: string
  title: string
  description: string
  color: string
  examples: string[]
}

const CAPABILITIES: Capability[] = [
  {
    id: 'device-control', iconName: 'Zap', title: '智能设备控制',
    description: '控制温室内的水泵、风扇、补光灯等设备，实现精准的环境调控',
    color: BERRY_THEME.primary, examples: ['打开水泵', '关闭风扇', '调节补光灯亮度', '移动摄像头到左侧'],
  },
  {
    id: 'environment-monitor', iconName: 'Activity', title: '环境监测分析',
    description: '实时监测温度、湿度、CO2、光照等环境参数，提供专业分析建议',
    color: BERRY_THEME.primary, examples: ['当前温室环境如何', '分析今日环境数据', '湿度是否正常', '光照强度够吗'],
  },
  {
    id: 'spectrum-analysis', iconName: 'BarChart3', title: '光谱数据分析',
    description: '获取18通道光谱数据，计算NDVI指数，评估植物健康状态',
    color: BERRY_THEME.primary, examples: ['获取光谱数据', '计算NDVI指数', '分析植物健康状况', '检测植物胁迫'],
  },
  {
    id: 'visual-inspection', iconName: 'Camera', title: '视觉巡检',
    description: '控制摄像头移动并捕获画面，进行病虫害识别和生长状态评估',
    color: BERRY_THEME.primary, examples: ['巡检温室', '拍摄植物照片', '检测病虫害', '评估生长状态'],
  },
  {
    id: 'schedule-task', iconName: 'Calendar', title: '定时任务管理',
    description: '创建和管理定时任务，实现自动化灌溉、通风、补光等操作',
    color: BERRY_THEME.primary, examples: ['每天早上8点打开补光灯', '每2小时检查一次温度', '查看所有定时任务', '取消明天的浇水任务'],
  },
  {
    id: 'report-generation', iconName: 'FileText', title: '报告生成',
    description: '生成精美的环境监测报告、数据分析报告，支持HTML和PDF导出',
    color: BERRY_THEME.primary, examples: ['生成今日环境报告', '导出本周数据分析', '生成设备运行报告', '创建种植管理报告'],
  },
  {
    id: 'knowledge-search', iconName: 'Search', title: '农业知识搜索',
    description: '搜索最新的农业种植技术、病虫害防治方法、最佳实践等专业知识',
    color: BERRY_THEME.primary, examples: ['草莓白粉病怎么防治', '5月份草莓管理要点', '如何提高草莓产量', '温室通风策略'],
  },
  {
    id: 'smart-advice', iconName: 'Brain', title: '智能决策建议',
    description: '基于当前环境数据和农业知识，提供专业的种植管理建议',
    color: BERRY_THEME.primary, examples: ['现在需要浇水吗', '如何优化当前环境', '制定本周管理计划', '分析产量提升方案'],
  },
  {
    id: 'chat', iconName: 'MessageSquare', title: '自然对话交互',
    description: '支持自然语言对话，理解复杂指令，提供友好的交互体验',
    color: BERRY_THEME.primary, examples: ['帮我分析一下现在的环境', '温度太高了怎么办', '今天需要做什么', '给我一些种植建议'],
  },
]

// ====== 图标渲染 ======

function IconRenderer({ name, size = 24 }: { name: string; size?: number }) {
  switch (name) {
    case 'Zap': return <IconLightning size={size} />
    case 'Activity': return <IconChartLine size={size} />
    case 'BarChart3': return <IconChartHistogram size={size} />
    case 'Camera': return <IconCamera size={size} />
    case 'Calendar': return <IconCalendar size={size} />
    case 'FileText': return <IconFileText size={size} />
    case 'Search': return <IconSearch size={size} />
    case 'Brain': return <IconBrain size={size} />
    case 'MessageSquare': return <IconComment size={size} />
    default: return <IconMagic size={size} />
  }
}

// ====== 注册 Catalog ======

const CATALOG_ID = 'berry-capabilities-catalog'

const catalog: Catalog = {
  catalogId: CATALOG_ID,
  components: {
    Banner: { type: 'object', properties: { title: { type: 'string' }, subtitle: { type: 'string' } }, required: ['title'] as string[] },
    CapabilityGrid: { type: 'object', properties: {} },
    CapabilityItem: {
      type: 'object',
      properties: { capabilityId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, iconName: { type: 'string' }, color: { type: 'string' }, index: { type: 'number' } },
      required: ['capabilityId', 'title', 'description'] as string[],
    },
    ExamplePanel: {
      type: 'object',
      properties: { capabilityId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, iconName: { type: 'string' }, color: { type: 'string' }, examples: { type: 'array', items: { type: 'string' } } },
      required: ['capabilityId', 'title', 'examples'] as string[],
    },
  },
}
registerCatalog(catalog)

// ====== x-card 协议组件实现 ======

function Column({ children }: { children?: React.ReactNode }) {
  return <div className="flex flex-col w-full">{children}</div>
}

function Banner({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative h-48 sm:h-56 overflow-hidden rounded-2xl">
      <Image src="/ability.png" alt="AI 助手能力" fill className="object-cover" priority />
      <div className="relative h-full flex flex-col justify-center px-8 sm:px-12 py-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="max-w-md">
          <h3 className="text-3xl sm:text-4xl font-black tracking-wide text-emerald-600 dark:text-emerald-400 mb-3">
            {title || '莓小智 AI 助手能力'}
          </h3>
          <p className="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
            {subtitle || '多维度感知、智能分析、专业决策，让农业管理更科学、更高效'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

function CapabilityItemComponent({
  capabilityId, title, description, iconName, color, index,
}: {
  capabilityId?: string; title?: string; description?: string; iconName?: string; color?: string; index?: number
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: (index ?? 0) * 0.05 }}
      data-action={`{"name":"open_examples","context":{"capabilityId":"${capabilityId}"}}`}
      className="group relative p-5 rounded-2xl border border-zinc-200/60 dark:border-white/10 bg-white dark:bg-zinc-900/80 backdrop-blur-xl transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] text-left overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${color || '#059669'}20, transparent)` }} />
      <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, ${color || '#059669'}, ${color || '#059669'}40)` }} />
      <div className="relative">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 text-white shadow-sm" style={{ backgroundColor: color || '#059669' }}>
          <IconRenderer name={iconName || 'Sparkles'} />
        </div>
        <h4 className="font-bold text-zinc-900 dark:text-white mb-1.5 text-base">{title}</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-3">{description}</p>
        <div className="flex items-center justify-end"><IconArrowRight size={16} className="text-zinc-300 group-hover:translate-x-1 transition-transform duration-200" /></div>
      </div>
    </motion.button>
  )
}

function CapabilityGridComponent({ children }: { children?: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">{children}</div>
}

function ExamplePanelComponent({
  title, description, iconName, color, examples, onClose, onSelectExample,
}: {
  title?: string; description?: string; iconName?: string; color?: string; examples?: string[]
  onClose?: () => void; onSelectExample?: (example: string) => void
}) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
        <div className="mt-3 p-5 rounded-2xl border border-zinc-200/60 dark:border-white/10 bg-white dark:bg-zinc-900/80">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0" style={{ backgroundColor: color || '#059669' }}>
                <IconRenderer name={iconName || 'Sparkles'} size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{description}</p>
              </div>
            </div>
            {onClose && (<button onClick={onClose} className="flex shrink-0 items-center justify-center p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><IconClose size={16} className="text-zinc-400" /></button>)}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-3"><IconMagic size={14} className="text-emerald-500" /><span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">试试这些示例</span></div>
            {(examples || []).map((example, i) => (
              <button key={i} onClick={() => onSelectExample?.(example)} className="w-full group flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all text-left">
                <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold" style={{ backgroundColor: `${color || '#059669'}15`, color: color || '#059669' }}>{i + 1}</span>
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white truncate">{example}</span>
                <IconArrowRight size={14} className="shrink-0 text-zinc-300 group-hover:translate-x-0.5 group-hover:text-emerald-500 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ====== 直接渲染的兜底 UI（不依赖 x-card 命令管道）======

function DirectRenderFallback({
  activeCapabilityId,
  onToggleCapability,
  onExampleClick,
}: {
  activeCapabilityId: string | null
  onToggleCapability: (id: string) => void
  onExampleClick?: (example: string) => void
}) {
  const activeCap = activeCapabilityId ? CAPABILITIES.find(c => c.id === activeCapabilityId) : null

  return (
    <div className="flex flex-col w-full">
      {/* Banner */}
      <div className="relative h-48 sm:h-56 overflow-hidden rounded-2xl">
        <Image src="/ability.png" alt="AI 助手能力" fill className="object-cover" priority />
        <div className="relative h-full flex flex-col justify-center px-8 sm:px-12 py-6">
          <div className="max-w-md">
            <h3 className="text-3xl sm:text-4xl font-black tracking-wide text-emerald-600 dark:text-emerald-400 mb-3">
              莓小智 AI 助手能力
            </h3>
            <p className="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
              多维度感知、智能分析、专业决策，让农业管理更科学、更高效
            </p>
          </div>
        </div>
      </div>

      {/* 网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {CAPABILITIES.map((cap, idx) => (
          <motion.button
            key={cap.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onToggleCapability(cap.id)}
            className={`group relative p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left overflow-hidden ${
              activeCapabilityId === cap.id
                ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-sm'
                : 'border-zinc-200/60 dark:border-white/10 bg-white dark:bg-zinc-900/80 hover:shadow-black/5 hover:scale-[1.02]'
            }`}
          >
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" style={{ background: `linear-gradient(135deg, ${cap.color}20, transparent)` }} />
            <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(90deg, ${cap.color}, ${cap.color}40)` }} />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 text-white shadow-sm" style={{ backgroundColor: cap.color }}>
                <IconRenderer name={cap.iconName} />
              </div>
              <h4 className="font-bold text-zinc-900 dark:text-white mb-1.5 text-base">{cap.title}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-3">{cap.description}</p>
              <div className="flex items-center justify-end">
                <IconArrowRight size={16} className={`transition-transform duration-200 ${activeCapabilityId === cap.id ? 'rotate-90 text-emerald-500' : 'text-zinc-300 group-hover:translate-x-1'}`} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* 示例面板 */}
      {activeCap && (
        <ExamplePanelComponent
          title={activeCap.title}
          description={activeCap.description}
          iconName={activeCap.iconName}
          color={activeCap.color}
          examples={activeCap.examples}
          onClose={() => onToggleCapability(activeCap.id)}
          onSelectExample={onExampleClick}
        />
      )}
    </div>
  )
}

// ====== 主组件 ======

interface CapabilitiesCardProps {
  onExampleClick?: (example: string) => void
}

export function CapabilitiesCard({ onExampleClick }: CapabilitiesCardProps) {
  const [activeCapabilityId, setActiveCapabilityId] = useState<string | null>(null)
  const [useDirectMode, setUseDirectMode] = useState(false)
  const boxMountedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeCapability = activeCapabilityId ? CAPABILITIES.find(c => c.id === activeCapabilityId) : null

  // 如果 x-card 渲染超时（500ms 内未挂载成功），自动切换到直接渲染模式
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!boxMountedRef.current) {
        setUseDirectMode(true)
      }
    }, 500)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  // 构建命令队列
  const commands: A2UICommand_v0_9[] = useMemo(() => [
    { version: 'v0.9', createSurface: { surfaceId: 'capabilities', catalogId: CATALOG_ID } },
    { version: 'v0.9', updateComponents: { surfaceId: 'capabilities', components: [
      { id: 'root', component: 'Column', children: ['banner', 'grid', ...(activeCapability ? ['examples-panel'] : [])] },
      { id: 'banner', component: 'Banner', title: '莓小智 AI 助手能力', subtitle: '多维度感知、智能分析、专业决策，让农业管理更科学、更高效' },
      { id: 'grid', component: 'CapabilityGrid', children: CAPABILITIES.map(c => `item-${c.id}`) },
      ...CAPABILITIES.map((cap, idx) => ({
        id: `item-${cap.id}`, component: 'CapabilityItem',
        capabilityId: cap.id, title: cap.title, description: cap.description,
        iconName: cap.iconName, color: cap.color, index: idx,
      })),
      ...(activeCapability ? [{
        id: 'examples-panel', component: 'ExamplePanel',
        capabilityId: activeCapability.id, title: activeCapability.title,
        description: activeCapability.description, iconName: activeCapability.iconName,
        color: activeCapability.color, examples: activeCapability.examples,
      }] : []),
    ]}},
  ], [activeCapability])

  // 处理 action
  const handleAction = useCallback((payload: ActionPayload) => {
    boxMountedRef.current = true // 标记 x-card 已成功触发交互
    if (payload.name === 'open_examples') {
      const capId = payload.context?.capabilityId as string | undefined
      if (capId) setActiveCapabilityId(prev => prev === capId ? null : capId)
    }
    if (payload.name === 'select_example') {
      const example = payload.context?.example as string | undefined
      if (example && onExampleClick) onExampleClick(example)
    }
  }, [onExampleClick])

  const toggleCapability = useCallback((id: string) => {
    setActiveCapabilityId(prev => prev === id ? null : id)
  }, [])

  // ====== 渲染：优先使用 x-card，失败则兜底直接渲染 ======
  if (useDirectMode) {
    return (
      <div className="my-6 w-full max-w-5xl">
        <DirectRenderFallback
          activeCapabilityId={activeCapabilityId}
          onToggleCapability={toggleCapability}
          onExampleClick={onExampleClick}
        />
      </div>
    )
  }

  return (
    <div className="my-6 w-full max-w-5xl">
      <XCard.Box
        commands={commands}
        onAction={handleAction}
        components={{
          Column,
          Banner,
          CapabilityGrid: CapabilityGridComponent,
          CapabilityItem: CapabilityItemComponent,
          ExamplePanel: (props: any) =>
            ExamplePanelComponent({
              ...props,
              onClose: () => setActiveCapabilityId(null),
              onSelectExample: onExampleClick,
            }),
        }}
      >
        <XCard.Card id="capabilities" />
      </XCard.Box>
    </div>
  )
}
