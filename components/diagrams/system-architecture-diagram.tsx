"use client"

import React, { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { APP_VERSION_LABEL } from '@/lib/app-meta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconBrain, IconChartLine, IconCloudStorage, IconComment, IconCpu, IconDatabaseNetwork, IconExchange, IconGlobe, IconIpad, IconLayers, IconLightning, IconLinkOut, IconLock, IconMagic, IconMonitor, IconPhone, IconRadio, IconRobot, IconSeedling, IconServer, IconShield, IconSun, IconThermometer, IconUnlock, IconVideo, IconWater, IconWifi } from "@/components/icon";

type LayerType = 'frontend' | 'gateway' | 'backend' | 'data' | 'external' | 'device'

interface SystemNodeData extends Record<string, unknown> {
  label: string
  description?: string
  icon?: React.ReactNode
  layer: LayerType
  tech?: string[]
  status?: 'active' | 'inactive' | 'processing'
  isHighlighted?: boolean
}

const layerColors: Record<LayerType, { bg: string; border: string; text: string; glow: string; accent: string }> = {
  frontend: { 
    bg: 'bg-zinc-950/40', 
    border: 'border-white/5', 
    text: 'text-zinc-400',
    glow: 'shadow-white/5',
    accent: '#71717a' // zinc-500
  },
  gateway: { 
    bg: 'bg-zinc-950/40', 
    border: 'border-white/5', 
    text: 'text-zinc-400',
    glow: 'shadow-white/5',
    accent: '#71717a' // purple-500
  },
  backend: { 
    bg: 'bg-zinc-950/40', 
    border: 'border-primary/20', 
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    accent: '#059669' // emerald-500
  },
  data: { 
    bg: 'bg-zinc-950/40', 
    border: 'border-white/5', 
    text: 'text-zinc-400',
    glow: 'shadow-white/5',
    accent: '#52525B' // amber-500
  },
  external: { 
    bg: 'bg-zinc-950/40', 
    border: 'border-white/5', 
    text: 'text-zinc-400',
    glow: 'shadow-white/5',
    accent: '#71717a' // rose-500
  },
  device: { 
    bg: 'bg-zinc-950/40', 
    border: 'border-primary/20', 
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    accent: '#059669' // emerald-500
  },
}

const SystemNodeComponent = ({ data, selected }: NodeProps & { data: SystemNodeData }) => {
  const colors = layerColors[data.layer]
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative min-w-[200px] max-w-[240px] rounded-none border-l-2 backdrop-blur-xl transition-all duration-300",
        colors.border,
        selected && "ring-1 ring-white/20",
        isHovered && `shadow-lg ${colors.glow}`,
        colors.bg
      )}
      style={{ borderLeftColor: colors.accent }}
    >
      <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.accent }} />
      </div>
      
      <Handle type="target" position={Position.Top} className="!bg-white/10 !border-white/20 !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-white/10 !border-white/20 !w-1.5 !h-1.5" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-white/10 !border-white/20 !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-white/10 !border-white/20 !w-1.5 !h-1.5" />
      
      <div className="relative p-5">
        <div className="flex items-start gap-4">
          {data.icon && (
            <div className={cn(
              "p-2.5 rounded-none bg-zinc-900 border border-white/5 transition-colors",
              isHovered ? "text-white" : "text-zinc-500"
            )}>
              {data.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-[13px] tracking-tight truncate uppercase font-mono">
              {data.label}
            </div>
            {data.description && (
              <div className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed font-sans">
                {data.description}
              </div>
            )}
          </div>
        </div>
        
        {data.tech && data.tech.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {data.tech.map((t, i) => (
              <span key={i} className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest px-1 bg-white/5">
                {t}
              </span>
            ))}
          </div>
        )}
        
        {data.status === 'active' && (
          <div className="absolute top-3 right-3">
            <div className={cn(
              "size-1 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,148,86,0.5)]",
              data.layer === 'backend' || data.layer === 'device' ? "bg-primary" : "bg-white/30"
            )} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

const GroupNodeComponent = ({ data }: NodeProps & { data: { label: string; layer: LayerType } }) => {
  const colors = layerColors[data.layer]
  
  return (
    <div className={cn(
      "w-full h-full rounded-none border border-white/5 p-4 transition-all duration-500",
      "bg-zinc-900/10 backdrop-blur-3xl group"
    )}>
      <div className="absolute -top-3 left-4 bg-[#050505] px-2 py-0.5 border border-white/10">
        <div className={cn("text-[11px] font-mono font-bold uppercase tracking-[0.2em]", colors.text)}>
          {data.label}
        </div>
      </div>
      <div className="absolute inset-0 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}

const nodeTypes = {
  systemNode: SystemNodeComponent,
  groupNode: GroupNodeComponent,
}

const initialNodes: Node<SystemNodeData>[] = [
  // --- 前端层 ---
  {
    id: 'frontend-label',
    type: 'groupNode',
    position: { x: 50, y: 50 },
    data: { label: '表现层 / 前端服务', layer: 'frontend' },
    style: { width: 850, height: 180 },
  },
  {
    id: 'web-app',
    type: 'systemNode',
    position: { x: 40, y: 50 },
    data: {
      label: 'Web 应用端',
      description: 'Next.js 15 响应式界面',
      icon: <IconMonitor />,
      layer: 'frontend',
      tech: ['React 19', 'Tailwind', 'Motion'],
      status: 'active',
    },
    parentId: 'frontend-label',
    extent: 'parent',
  },
  {
    id: 'mobile-app',
    type: 'systemNode',
    position: { x: 290, y: 50 },
    data: {
      label: '移动客户端',
      description: 'PWA 与 原生移动应用',
      icon: <IconPhone />,
      layer: 'frontend',
      tech: ['PWA', 'React Native'],
      status: 'active',
    },
    parentId: 'frontend-label',
    extent: 'parent',
  },
  {
    id: 'admin-panel',
    type: 'systemNode',
    position: { x: 540, y: 50 },
    data: {
      label: '管理控制台',
      description: '系统管理与监控中心',
      icon: <IconIpad />,
      layer: 'frontend',
      tech: ['Admin UI', '数据大屏'],
      status: 'active',
    },
    parentId: 'frontend-label',
    extent: 'parent',
  },

  // --- 网关层 ---
  {
    id: 'gateway-label',
    type: 'groupNode',
    position: { x: 50, y: 280 },
    data: { label: '基础设施 / 通信网关', layer: 'gateway' },
    style: { width: 850, height: 180 },
  },
  {
    id: 'api-gateway',
    type: 'systemNode',
    position: { x: 40, y: 50 },
    data: {
      label: 'API 网关',
      description: '流量路由与鉴权',
      icon: <IconGlobe />,
      layer: 'gateway',
      tech: ['Next.js API', '中间件'],
      status: 'active',
    },
    parentId: 'gateway-label',
    extent: 'parent',
  },
  {
    id: 'auth-service',
    type: 'systemNode',
    position: { x: 290, y: 50 },
    data: {
      label: '身份认证服务',
      description: 'RBAC 与 多方授权',
      icon: <IconShield />,
      layer: 'gateway',
      tech: ['JWT', 'OAuth2', 'Clerk'],
      status: 'active',
    },
    parentId: 'gateway-label',
    extent: 'parent',
  },
  {
    id: 'mqtt-broker',
    type: 'systemNode',
    position: { x: 540, y: 50 },
    data: {
      label: 'MQTT 代理',
      description: '超低延迟 IoT 消息总线',
      icon: <IconRadio />,
      layer: 'gateway',
      tech: ['EMQX', 'WebSocket'],
      status: 'active',
    },
    parentId: 'gateway-label',
    extent: 'parent',
  },

  // --- 服务层 ---
  {
    id: 'backend-label',
    type: 'groupNode',
    position: { x: 50, y: 510 },
    data: { label: '核心智能 / 后端服务', layer: 'backend' },
    style: { width: 850, height: 180 },
  },
  {
    id: 'ai-service',
    type: 'systemNode',
    position: { x: 40, y: 50 },
    data: {
      label: 'AI 决策引擎',
      description: 'RAG 与 自主 Agent 调度',
      icon: <IconBrain />,
      layer: 'backend',
      tech: ['Qwen 2.5', '多模态模型', 'MCP'],
      status: 'active',
    },
    parentId: 'backend-label',
    extent: 'parent',
  },
  {
    id: 'device-service',
    type: 'systemNode',
    position: { x: 290, y: 50 },
    data: {
      label: '设备管理服务',
      description: '生命周期与状态管理',
      icon: <IconCpu />,
      layer: 'backend',
      tech: ['Node.js', 'PostgreSQL'],
      status: 'active',
    },
    parentId: 'backend-label',
    extent: 'parent',
  },
  {
    id: 'automation-service',
    type: 'systemNode',
    position: { x: 540, y: 50 },
    data: {
      label: '自动化执行引擎',
      description: '定时任务与事件联动',
      icon: <IconLightning />,
      layer: 'backend',
      tech: ['Temporal', '逻辑引擎'],
      status: 'active',
    },
    parentId: 'backend-label',
    extent: 'parent',
  },

  // --- 数据层 ---
  {
    id: 'data-label',
    type: 'groupNode',
    position: { x: 950, y: 280 },
    data: { label: '数据中心 / 注册存储', layer: 'data' },
    style: { width: 280, height: 410 },
  },
  {
    id: 'primary-db',
    type: 'systemNode',
    position: { x: 20, y: 50 },
    data: {
      label: '关系型数据库',
      description: '持久化业务逻辑存储',
      icon: <IconDatabaseNetwork />,
      layer: 'data',
      tech: ['PostgreSQL', 'Prisma'],
      status: 'active',
    },
    parentId: 'data-label',
    extent: 'parent',
  },
  {
    id: 'cache-db',
    type: 'systemNode',
    position: { x: 20, y: 160 },
    data: {
      label: '高速缓存层',
      description: '高性能会话数据缓存',
      icon: <IconLightning />,
      layer: 'data',
      tech: ['Redis'],
      status: 'active',
    },
    parentId: 'data-label',
    extent: 'parent',
  },
  {
    id: 'time-series-db',
    type: 'systemNode',
    position: { x: 20, y: 270 },
    data: {
      label: '时序数据库',
      description: '环境传感器历史记录',
      icon: <IconChartLine />,
      layer: 'data',
      tech: ['Timescale'],
      status: 'active',
    },
    parentId: 'data-label',
    extent: 'parent',
  },

  // --- 外部集层 ---
  {
    id: 'external-label',
    type: 'groupNode',
    position: { x: 950, y: 50 },
    data: { label: '第三方集成 / 模型接口', layer: 'external' },
    style: { width: 280, height: 180 },
  },
  {
    id: 'llm-provider',
    type: 'systemNode',
    position: { x: 20, y: 50 },
    data: {
      label: 'LLM 模型池',
      description: '大语言模型 API 接入',
      icon: <IconMagic />,
      layer: 'external',
      tech: ['Gemini', '通义千问'],
      status: 'active',
    },
    parentId: 'external-label',
    extent: 'parent',
  },

  // --- 设备层 ---
  {
    id: 'device-label',
    type: 'groupNode',
    position: { x: 50, y: 740 },
    data: { label: '感知层 / 边缘终端', layer: 'device' },
    style: { width: 850, height: 180 },
  },
  {
    id: 'sensors',
    type: 'systemNode',
    position: { x: 40, y: 50 },
    data: {
      label: '智能传感器集',
      description: '高精度环境数据遥测',
      icon: <IconThermometer />,
      layer: 'device',
      tech: ['LoRaWAN', 'ESP32'],
      status: 'active',
    },
    parentId: 'device-label',
    extent: 'parent',
  },
  {
    id: 'cameras',
    type: 'systemNode',
    position: { x: 290, y: 50 },
    data: {
      label: '视觉采集终端',
      description: 'AI 视觉识别与流传输',
      icon: <IconVideo />,
      layer: 'device',
      tech: ['RTSP', 'NVR'],
      status: 'active',
    },
    parentId: 'device-label',
    extent: 'parent',
  },
  {
    id: 'controllers',
    type: 'systemNode',
    position: { x: 540, y: 50 },
    data: {
      label: '控制执行器',
      description: '远程硬件开关与调控',
      icon: <IconCpu />,
      layer: 'device',
      tech: ['WebSocket', '继电器'],
      status: 'active',
    },
    parentId: 'device-label',
    extent: 'parent',
  },
]

const initialEdges: Edge[] = [
  // 前端到网关
  { id: 'e-web-gateway', source: 'web-app', target: 'api-gateway', animated: true, style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.4)' } },
  { id: 'e-mobile-gateway', source: 'mobile-app', target: 'api-gateway', animated: true, style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.4)' } },
  { id: 'e-admin-gateway', source: 'admin-panel', target: 'api-gateway', animated: true, style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.4)' } },
  
  // 网关到服务
  { id: 'e-gateway-ai', source: 'api-gateway', target: 'ai-service', animated: true, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
  { id: 'e-gateway-device', source: 'api-gateway', target: 'device-service', animated: true, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
  { id: 'e-gateway-automation', source: 'api-gateway', target: 'automation-service', animated: true, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
  
  // AI 到外部
  { id: 'e-ai-llm', source: 'ai-service', target: 'llm-provider', animated: true, style: { stroke: '#059669', strokeWidth: 2.5, strokeDasharray: '6,4' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
  
  // 服务到数据
  { id: 'e-ai-db', source: 'ai-service', target: 'primary-db', sourceHandle: 'right', targetHandle: 'left', animated: false, style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 } },
  { id: 'e-device-db', source: 'device-service', target: 'primary-db', sourceHandle: 'right', targetHandle: 'left', animated: false, style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 } },
  { id: 'e-device-timeseries', source: 'device-service', target: 'time-series-db', sourceHandle: 'right', targetHandle: 'left', animated: false, style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 } },
  { id: 'e-automation-db', source: 'automation-service', target: 'primary-db', sourceHandle: 'right', targetHandle: 'left', animated: false, style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2 } },
  
  // MQTT 到设备
  { id: 'e-mqtt-sensors', source: 'mqtt-broker', target: 'sensors', animated: true, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
  { id: 'e-mqtt-cameras', source: 'mqtt-broker', target: 'cameras', animated: true, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
  { id: 'e-mqtt-controllers', source: 'mqtt-broker', target: 'controllers', animated: true, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' } },
]

const minimapNodeColor = (node: Node) => {
  const layer = (node.data as SystemNodeData)?.layer
  const colorMap: Record<LayerType, string> = {
    frontend: '#3f3f46',
    gateway: '#3f3f46',
    backend: '#059669',
    data: '#3f3f46',
    external: '#3f3f46',
    device: '#059669',
  }
  return colorMap[layer] || '#71717A'
}

function SystemArchitectureDiagramInner() {
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)
  const { fitView } = useReactFlow()

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 800 })
  }, [fitView])

  return (
    <div className="w-full h-full relative group/flow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 1 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={60} size={1} color="rgba(255,255,255,0.02)" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={0.5} color="rgba(255,255,255,0.1)" />
        
        <Controls 
          className="!bg-black/50 !border-white/5 !rounded-none !backdrop-blur-xl"
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={minimapNodeColor}
          className="!bg-black/50 !border-white/5 !rounded-none !backdrop-blur-xl !bottom-24"
          maskColor="rgba(0,0,0,0.9)"
        />
      </ReactFlow>
      
      <div className="absolute top-8 right-8 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFitView}
          className="bg-black/40 border-white/10 text-white/50 hover:bg-black hover:text-white rounded-none backdrop-blur-xl font-mono text-[11px] tracking-widest uppercase transition-all"
        >
          <IconLayers className="w-3 h-3 mr-2" />
          全景视图
        </Button>
      </div>

      {/* Decorative Frame */}
      <div className="absolute inset-0 border border-white/5 pointer-events-none" />
      <div className="absolute top-0 left-0 w-8 h-px bg-primary/50" />
      <div className="absolute top-0 left-0 w-px h-8 bg-primary/50" />
      <div className="absolute bottom-0 right-0 w-8 h-px bg-primary/50" />
      <div className="absolute bottom-0 right-0 w-px h-8 bg-primary/50" />
    </div>
  )
}

export function SystemArchitectureDiagram() {
  return (
    <div className="w-full h-[850px] relative bg-[#050505] overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,148,86,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="absolute top-8 left-8 z-20">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-px bg-primary" />
            <h2 className="text-sm font-bold text-white tracking-[0.3em] uppercase font-mono">
              系统架构蓝图
            </h2>
          </div>
          <p className="text-[11px] text-zinc-600 font-mono tracking-wider ml-11 uppercase opacity-60">
            核心平台构架 {APP_VERSION_LABEL}
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 z-20 hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,148,86,0.5)]" />
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">核心正常运行</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">空闲节点</span>
        </div>
      </div>

      <div className="absolute top-8 right-32 z-20 flex gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
        {['表现层', '通信网关', '核心智能', '数据存储', '边缘终端'].map((l) => (
          <span key={l} className="text-[11px] font-mono text-zinc-600 border border-white/5 px-2 py-0.5 uppercase tracking-widest">
            {l}
          </span>
        ))}
      </div>
      
      <ReactFlowProvider>
        <SystemArchitectureDiagramInner />
      </ReactFlowProvider>
    </div>
  )
}
