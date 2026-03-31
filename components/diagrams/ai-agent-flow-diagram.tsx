"use client"

import React, { useState, useCallback, useMemo } from 'react'
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
import { 
  Bot,
  Sparkles,
  BrainCircuit,
  Database,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  Globe,
  Play,
  RefreshCw,
  Ear,
  Volume2,
  FileText,
  Settings,
  GitBranch,
  Cloud,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type AgentNodeType = 
  | 'trigger' 
  | 'input' 
  | 'process' 
  | 'decision' 
  | 'action' 
  | 'output' 
  | 'external'
  | 'loop'
  | 'groupNode'

interface AgentNodeData extends Record<string, unknown> {
  label: string
  description?: string
  icon?: React.ReactNode
  type: AgentNodeType
  details?: string[]
  status?: 'idle' | 'running' | 'success' | 'error'
  condition?: string
}

const nodeTypeStyles: Record<AgentNodeType, { accent: string; label: string }> = {
  trigger: { accent: '#f43f5e', label: '触发点' },
  input: { accent: '#3b82f6', label: '输入层' },
  process: { accent: '#10b981', label: '处理层' },
  decision: { accent: '#f59e0b', label: '决策点' },
  action: { accent: '#a855f7', label: '执行层' },
  output: { accent: '#14b8a6', label: '输出层' },
  external: { accent: '#71717a', label: '外联层' },
  loop: { accent: '#6366f1', label: '闭环层' },
  groupNode: { accent: '#ffffff', label: '组合' },
}

const AgentNodeComponent = ({ data, selected }: NodeProps & { data: AgentNodeData }) => {
  const styles = nodeTypeStyles[data.type] || nodeTypeStyles.process
  const [isHovered, setIsHovered] = useState(false)
  
  const statusIndicator = useMemo(() => {
    switch (data.status) {
      case 'running':
        return <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse border border-amber-400" />
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-500" />
      default:
        return null
    }
  }, [data.status])
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative min-w-[220px] max-w-[280px] rounded-none border border-white/5 border-l-4 backdrop-blur-3xl transition-all duration-300 bg-zinc-950/60",
        selected && "ring-1 ring-white/30 border-l-white",
        isHovered && "shadow-2xl shadow-black/80 ring-1 ring-white/10"
      )}
      style={{ borderLeftColor: styles.accent }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/20 !border-white/30 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-white/20 !border-white/30 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-white/20 !border-white/30 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-white/20 !border-white/30 !w-2 !h-2" />
      
      <div className="relative p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-none bg-zinc-900 border border-white/5 transition-colors",
            isHovered ? "text-white" : "text-zinc-500"
          )}>
            {data.icon || <Bot className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white text-[14px] leading-tight tracking-tight uppercase font-mono">{data.label}</span>
              {statusIndicator}
            </div>
            {data.description && (
              <div className="text-[11px] text-zinc-500 mt-2 leading-relaxed font-sans">{data.description}</div>
            )}
          </div>
        </div>
        
        {data.details && data.details.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
            {data.details.map((detail, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
                <div className="w-1.5 h-[1px] bg-white/20" />
                {detail}
              </div>
            ))}
          </div>
        )}

        <div className="absolute -top-3 right-2 opacity-50">
          <span className="text-[8px] font-mono uppercase tracking-[0.2em] bg-zinc-900 border border-white/5 px-2 py-0.5 text-zinc-400">{styles.label}</span>
        </div>
      </div>
    </motion.div>
  )
}

const DecisionNodeComponent = ({ data, selected }: NodeProps & { data: AgentNodeData }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotate: 45 }}
      animate={{ opacity: 1, scale: 1, rotate: 45 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "relative w-[150px] h-[150px] rounded-none border-2 border-amber-500/30 backdrop-blur-3xl transition-all duration-300 bg-zinc-950/80 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
        selected && "ring-2 ring-white/50 border-amber-500"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/40 !border-white/60 !w-2.5 !h-2.5 !top-[-6px] !left-1/2 !-translate-x-1/2" />
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-emerald-500 !border-emerald-400 !w-3 !h-3 !bottom-[-8px] !left-1/2 !-translate-x-1/2" />
      <Handle type="source" position={Position.Right} id="no" className="!bg-rose-500 !border-rose-400 !w-3 !h-3 !right-[-8px] !top-1/2 !-translate-y-1/2" />
      
      <div className="absolute inset-0 flex items-center justify-center -rotate-45 p-4">
        <div className="text-center">
          <div className="flex justify-center mb-2 text-amber-500">
            <GitBranch className="w-6 h-6" />
          </div>
          <div className="font-black text-white text-[13px] leading-none tracking-tighter uppercase font-mono">{data.label}</div>
          {data.condition && (
            <div className="text-[10px] text-zinc-400 mt-2 leading-tight font-sans">
              {data.condition}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const GroupNodeComponent = ({ data }: NodeProps & { data: { label: string } }) => {
  return (
    <div className="relative w-full h-full  border border-white/[0.03] bg-white/[0.01]">
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-zinc-900 border border-white/10 text-[9px] font-mono text-white/40 uppercase tracking-[0.2em] z-10">
        {data.label}
      </div>
    </div>
  )
}

const nodeTypes = {
  agentNode: AgentNodeComponent,
  decisionNode: DecisionNodeComponent,
  groupNode: GroupNodeComponent,
}

const initialNodes: Node<AgentNodeData>[] = [
  // --- 层级组 ---
  {
    id: 'g-perception',
    type: 'groupNode',
    position: { x: 50, y: 150 },
    data: { label: '感知与采集层 (Perception)', type: 'groupNode' },
    style: { width: 320, height: 600, backgroundColor: 'rgba(244, 63, 94, 0.02)' },
  },
  {
    id: 'g-logic',
    type: 'groupNode',
    position: { x: 420, y: 150 },
    data: { label: '逻辑与决策层 (Logic)', type: 'groupNode' },
    style: { width: 320, height: 600, backgroundColor: 'rgba(59, 130, 246, 0.02)' },
  },
  {
    id: 'g-action',
    type: 'groupNode',
    position: { x: 790, y: 150 },
    data: { label: '执行与交互层 (Action)', type: 'groupNode' },
    style: { width: 620, height: 600, backgroundColor: 'rgba(168, 85, 247, 0.02)' },
  },
  {
    id: 'g-memory',
    type: 'groupNode',
    position: { x: 50, y: 800 },
    data: { label: '记忆与进化层 (Memory & Evolution)', type: 'groupNode' },
    style: { width: 1360, height: 220, backgroundColor: 'rgba(16, 185, 129, 0.02)' },
  },

  // --- 感知提取节点 ---
  {
    id: 'trigger',
    type: 'agentNode',
    position: { x: 40, y: 60 },
    data: {
      label: '输入采集 / 触发点',
      description: '监测传感器阈值或主动指令',
      icon: <Zap />,
      type: 'trigger',
      details: ['语音唤醒', '定时任务', '环境突变'],
      status: 'idle',
    },
    parentId: 'g-perception',
    extent: 'parent',
  },
  {
    id: 'input-processing',
    type: 'agentNode',
    position: { x: 40, y: 240 },
    data: {
      label: '语义解析引擎',
      description: '深度理解自然语言意图',
      icon: <Ear />,
      type: 'input',
      details: ['ASR 优化', 'NLP 意图识别'],
      status: 'idle',
    },
    parentId: 'g-perception',
    extent: 'parent',
  },
  {
    id: 'context-builder',
    type: 'agentNode',
    position: { x: 40, y: 420 },
    data: {
      label: '上下文感知建模',
      description: '构建当前实时的运行全景',
      icon: <Database />,
      type: 'process',
      details: ['长短期记忆注入', '设备全息信息'],
      status: 'idle',
    },
    parentId: 'g-perception',
    extent: 'parent',
  },

  // --- 逻辑决策节点 ---
  {
    id: 'tool-selector',
    type: 'agentNode',
    position: { x: 40, y: 60 },
    data: {
      label: 'MCP 智能调度器',
      description: '根据意图匹配最优化工具链',
      icon: <Settings />,
      type: 'process',
      details: ['动态 API 绑定', '参数预计算'],
      status: 'idle',
    },
    parentId: 'g-logic',
    extent: 'parent',
  },
  {
    id: 'decision-valid',
    type: 'decisionNode',
    position: { x: 85, y: 300 },
    data: {
      label: '执行决策',
      type: 'decision',
      condition: '是否引用物理硬件操作?',
    },
    parentId: 'g-logic',
    extent: 'parent',
  },

  // --- 执行节点 ---
  {
    id: 'llm-direct',
    type: 'agentNode',
    position: { x: 40, y: 60 },
    data: {
      label: 'LLM 认知回复',
      description: '直接生成多轮对话建议',
      icon: <BrainCircuit />,
      type: 'process',
      details: ['思维链推理', 'Prompt 增强'],
      status: 'idle',
    },
    parentId: 'g-action',
    extent: 'parent',
  },
  {
    id: 'tool-executor',
    type: 'agentNode',
    position: { x: 40, y: 300 },
    data: {
      label: '物理终端控制器',
      description: '驱动边缘侧继电器与执行机构',
      icon: <Play />,
      type: 'action',
      details: ['水循环管理', '能源调度'],
      status: 'idle',
    },
    parentId: 'g-action',
    extent: 'parent',
  },
  {
    id: 'external-llm',
    type: 'agentNode',
    position: { x: 340, y: 300 },
    data: {
      label: '云端分布式模型',
      description: '跨区域模型同步与负载均衡',
      icon: <Cloud />,
      type: 'external',
      details: ['多云 API 系统', '延迟敏感分发'],
      status: 'idle',
    },
    parentId: 'g-action',
    extent: 'parent',
  },
  {
    id: 'decision-success',
    type: 'decisionNode',
    position: { x: 235, y: 440 },
    data: {
      label: '执行闭环校验',
      type: 'decision',
      condition: '硬件反馈与感知是否对齐?',
    },
    parentId: 'g-action',
    extent: 'parent',
  },

  // --- 记忆进化节点 ---
  {
    id: 'reasoning-engine',
    type: 'agentNode',
    position: { x: 40, y: 60 },
    data: {
      label: '反思与自我修正',
      description: '基于反馈不断演进的推理策略',
      icon: <BrainCircuit />,
      type: 'process',
      details: ['强化学习反馈', '错误追踪分析'],
      status: 'idle',
    },
    parentId: 'g-memory',
    extent: 'parent',
  },
  {
    id: 'response-builder',
    type: 'agentNode',
    position: { x: 380, y: 60 },
    data: {
      label: '多模态交付构建',
      description: '生成最终的音视频、界面指令',
      icon: <FileText />,
      type: 'process',
      details: ['TTS 音色映射', '3D 孪生更新'],
      status: 'idle',
    },
    parentId: 'g-memory',
    extent: 'parent',
  },
  {
    id: 'output-delivery',
    type: 'agentNode',
    position: { x: 720, y: 60 },
    data: {
      label: '终端全向分发',
      description: '全平台实时同步 Agent 状态',
      icon: <Volume2 />,
      type: 'output',
      details: ['广播播报', 'Admin 推送'],
      status: 'idle',
    },
    parentId: 'g-memory',
    extent: 'parent',
  },
  {
    id: 'memory-update',
    type: 'agentNode',
    position: { x: 1060, y: 60 },
    data: {
      label: '持久化记忆库',
      description: '将成功经验永久固化在知识图谱',
      icon: <Database />,
      type: 'process',
      details: ['矢量库同步', '经验权重更新'],
      status: 'idle',
    },
    parentId: 'g-memory',
    extent: 'parent',
  },
]

const initialEdges: Edge[] = [
  // 连接逻辑
  { id: 'e-trigger-input', source: 'trigger', target: 'input-processing', animated: true, style: { stroke: '#f43f5e', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' } },
  { id: 'e-input-context', source: 'input-processing', target: 'context-builder', animated: true, style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.4)' } },
  { id: 'e-context-tool', source: 'context-builder', target: 'tool-selector', animated: true, style: { stroke: '#3b82f6', strokeWidth: 3.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e-tool-decision', source: 'tool-selector', target: 'decision-valid', animated: true, style: { stroke: '#3b82f6', strokeWidth: 3.5 } },
  
  {
    id: 'e-decision-llm',
    source: 'decision-valid',
    target: 'llm-direct',
    sourceHandle: 'no',
    animated: true,
    style: { stroke: '#f43f5e', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
    label: '否',
    labelStyle: { fill: '#f43f5e', fontWeight: 900, fontSize: 13 },
    labelBgStyle: { fill: '#000', fillOpacity: 0.9 },
  },
  {
    id: 'e-decision-tool',
    source: 'decision-valid',
    target: 'tool-executor',
    sourceHandle: 'yes',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 4 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: '是',
    labelStyle: { fill: '#10b981', fontWeight: 900, fontSize: 13 },
    labelBgStyle: { fill: '#000', fillOpacity: 0.9 },
  },

  { id: 'e-tool-external', source: 'tool-executor', target: 'external-llm', sourceHandle: 'right', targetHandle: 'left', animated: true, style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2.5, strokeDasharray: '6,4' } },
  { id: 'e-tool-result', source: 'tool-executor', target: 'decision-success', animated: true, style: { stroke: '#a855f7', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' } },
  { id: 'e-llm-reasoning', source: 'llm-direct', target: 'reasoning-engine', animated: true, style: { stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 } },
  
  {
    id: 'e-success-reasoning',
    source: 'decision-success',
    target: 'reasoning-engine',
    sourceHandle: 'yes',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 4 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  { id: 'e-reasoning-response', source: 'reasoning-engine', target: 'response-builder', animated: true, style: { stroke: '#10b981', strokeWidth: 3.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
  { id: 'e-response-output', source: 'response-builder', target: 'output-delivery', animated: true, style: { stroke: '#14b8a6', strokeWidth: 3.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' } },
  { id: 'e-response-memory', source: 'response-builder', target: 'memory-update', animated: true, style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 2, strokeDasharray: '8,4' } },
]

const minimapNodeColor = (node: Node) => {
  const type = (node.data as AgentNodeData)?.type
  const colorMap: Partial<Record<AgentNodeType, string>> = {
    trigger: '#f43f5e',
    input: '#3b82f6',
    process: '#10b981',
    decision: '#f59e0b',
    action: '#a855f7',
    output: '#14b8a6',
    external: '#71717a',
  }
  return colorMap[type!] || '#6b7280'
}

function AIAgentFlowDiagramInner() {
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)
  const [isSimulating, setIsSimulating] = useState(false)
  const { fitView } = useReactFlow()

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.1, duration: 800 })
  }, [fitView])

  const simulateFlow = useCallback(async () => {
    if (isSimulating) return
    setIsSimulating(true)
    
    const flowSteps = [
      'trigger',
      'input-processing',
      'context-builder',
      'tool-selector',
      'decision-valid',
      'tool-executor',
      'external-llm',
      'decision-success',
      'reasoning-engine',
      'response-builder',
      'output-delivery',
      'memory-update',
    ]
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })))
    
    for (const nodeId of flowSteps) {
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: 'running' } }
          : n
      ))
      await sleep(600)
      setNodes(nds => nds.map(n => 
        n.id === nodeId 
          ? { ...n, data: { ...n.data, status: 'success' } }
          : n
      ))
    }
    
    await sleep(2000)
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })))
    setIsSimulating(false)
  }, [isSimulating])

  return (
    <div className="w-full h-full relative group/flow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.05}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={60} size={1} color="rgba(255,255,255,0.02)" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={0.5} color="rgba(255,255,255,0.1)" />
        
        <Controls 
          className="!bg-black/80 !border-white/10 !rounded-none !backdrop-blur-xl"
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={minimapNodeColor}
           className="!bg-black/80 !border-white/10 !rounded-none !backdrop-blur-xl !bottom-24"
          maskColor="rgba(0,0,0,0.95)"
        />
      </ReactFlow>
      
      <div className="absolute top-8 right-8 z-10 flex gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={simulateFlow}
          disabled={isSimulating}
          className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-none backdrop-blur-3xl font-mono text-[11px] tracking-widest uppercase py-5 px-6"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              正在运行...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              过程模拟演示
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFitView}
          className="bg-black/40 border-white/20 text-white/70 hover:bg-black hover:text-white rounded-none backdrop-blur-3xl font-mono text-[11px] tracking-widest uppercase py-5 px-6"
        >
          <Layers className="w-4 h-4 mr-2" />
          重置并居中
        </Button>
      </div>

       {/* Decorative Frame */}
       <div className="absolute inset-0 border border-white/5 pointer-events-none" />
       {/* Corner accents */}
       <div className="absolute top-0 left-0 w-10 h-1 border-l-2 border-t-2 border-indigo-500/50" />
       <div className="absolute bottom-0 right-0 w-10 h-1 border-r-2 border-b-2 border-emerald-500/50" />
    </div>
  )
}

export function AIAgentFlowDiagram() {
  return (
    <div className="w-full h-[1000px] relative bg-[#050505] overflow-hidden border border-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.02)_0%,transparent_80%)] pointer-events-none" />
      
      <div className="absolute top-10 left-10 z-20">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
            <h2 className="text-xl font-black text-white tracking-[0.4em] uppercase font-mono">
              智能体决策自主演进流程
            </h2>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono tracking-[0.2em] ml-16 uppercase opacity-40">
            Autonomous Intelligent Agent Reasoning & Feedback Loop v4.0 PRO
          </p>
        </div>
      </div>

      <div className="absolute top-10 right-48 z-20 hidden lg:flex gap-6 opacity-30 hover:opacity-100 transition-all duration-500">
        {['感知层', '逻辑层', '执行层', '进化层'].map((l) => (
          <div key={l} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500/50" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em]">
              {l}
            </span>
          </div>
        ))}
      </div>
      
      <ReactFlowProvider>
        <AIAgentFlowDiagramInner />
      </ReactFlowProvider>
    </div>
  )
}
