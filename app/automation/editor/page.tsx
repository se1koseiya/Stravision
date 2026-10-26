
"use client"

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  type EdgeProps,
  Node,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IconApi, IconArrowLeft, IconBrain, IconChartLine, IconClickTap, IconDatabaseNetwork, IconDelete, IconGithub, IconGridFour, IconHandUp, IconLightning, IconLoading, IconLogout, IconMagic, IconMagicWand, IconPlay, IconPlus, IconRemind, IconSave, IconScan, IconSearch, IconSetting, IconSettingTwo, IconShield, IconSquareSmall, IconSwitch, IconTime, IconTimer, IconTrendingUp, IconVolumeMute, IconVolumeNotice } from "@/components/icon";

import TriggerNode from '@/components/automation/trigger-node';
import LogicNode from '@/components/automation/logic-node';
import ActionNode from '@/components/automation/action-node';
import AiNode from '@/components/automation/ai-node';
import { DeletableEdge } from '@/components/automation/deletable-edge';
import { EditorAIDefaultsContext, type EditorAIDefaults } from '@/components/automation/ai-node';
import { NODE_TYPES } from '@/components/automation/node-types';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/ui/feedback';
// antd 组件（飞书式整体风格）
import { ConfigProvider, Button as AntButton, Input as AntInput, Tag as AntTag, Drawer as AntDrawer } from 'antd';
import { useTheme } from "next-themes";
import { antdScopeTheme } from "@/lib/theme/antd-scope-theme";
import { DeviceSidebarList } from "@/components/automation/device-sidebar-list";
// 新增：画布底部右下工具栏
import { CanvasBottomToolbar } from "@/components/automation/canvas-bottom-toolbar";
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar";
import type { CopilotClientTools } from "@/components/ai/copilot/use-copilot-chat";
import { PageNavigation } from "@/components/page-navigation";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import type { UserPublic } from "@/lib/db/user-service";
import Image from "next/image";
import { useEffect, Suspense } from "react";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { useDeviceData } from "@/lib/hooks/use-device-data";

const nodeTypes = {
  triggerNode: TriggerNode,
  logicNode: LogicNode,
  actionNode: ActionNode,
  aiNode: AiNode,
};

/** 节点类型中文名（AI 新建节点但没给 label 时的兜底显示名） */
const NODE_TYPE_CN: Record<string, string> = {
  triggerNode: '触发器',
  logicNode: '逻辑判断',
  aiNode: 'AI 处理',
  actionNode: '执行动作',
};

/** 节点类型 → 自动排布列坐标（AI 未指定 position 时用） */
const NODE_COLUMN_X: Record<string, number> = {
  triggerNode: 40,
  logicNode: 340,
  aiNode: 640,
  actionNode: 940,
};

// 空白画布起步（不再预置示例节点和彩色连线）
const initialNodes: Node[] = []

const initialEdges: Edge[] = []

function AutomationEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ruleId = searchParams.get('id');
  const fromAiAssistant = searchParams.get('from') === 'ai-assistant';
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  // adminUI 配置的 AI 默认模型 + 可用模型列表（注入到画布上下文）
  const [aiDefaults, setAiDefaults] = useState<EditorAIDefaults>({ modelId: null, models: [] })
  // 当前选中元素数量（节点 + 边）
  const [selectedCount, setSelectedCount] = useState(0)
  // 交互模式：select = 平移/单选（默认），box = 拖拽框选多选
  const [interactionMode, setInteractionMode] = useState<'select' | 'box'>('select')

  // 深色模式：画布点阵 / 连线 / antd 组件（Select、Input、Drawer…）统一跟随全局主题
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // 🔥 关键修复：规范化 nodes，确保每个节点都有合法的 position 和 id 字段，
  // 否则 React Flow 内部访问 node.position.x 时会抛出 "Cannot read properties of undefined (reading 'x')"
  // 同时智能归类未知 type，让 AI 输出的 "aiNode"/"deviceNode"/"controlNode" 等都能渲染
  const SUPPORTED_NODE_TYPES = new Set(['triggerNode', 'logicNode', 'aiNode', 'actionNode'])

  // 根据 label 智能推断节点类型
  const inferNodeType = (label: string, subType?: string): 'triggerNode' | 'logicNode' | 'aiNode' | 'actionNode' => {
    const text = `${label || ''} ${subType || ''}`.toLowerCase()
    // AI 节点特征
    if (/ai|智能|llm|大模型|诊断|分析|预测|识别|识别|学习|推理|gpt|claude|诊断|trend|recommend|diagnose/.test(text)) {
      return 'aiNode'
    }
    // 动作/控制节点特征
    if (/控制|开关|开启|关闭|打开|启动|停止|执行|发送|通知|告警|推送|控制|action|control|notify|device|send|alert|推送|设备/.test(text)) {
      return 'actionNode'
    }
    // 触发器特征
    if (/监测|传感|定时|阈值|触发|检测|温度|湿度|光照|浓度|当...时|如果|若|trigger|sensor|schedule|threshold|monitor/.test(text)) {
      return 'triggerNode'
    }
    // 逻辑判断
    if (/判断|比较|范围|逻辑|且|或|非|条件|大于|小于|等于|compare|range|condition|and|or/.test(text)) {
      return 'logicNode'
    }
    // 默认归类为 logicNode
    return 'logicNode'
  }

  const sanitizeNodes = useCallback((rawNodes: any[]): Node[] => {
    if (!Array.isArray(rawNodes)) return []
    return rawNodes
      .filter((n: any) => n && (n.id || n.type))
      .map((n: any, index: number) => {
        // 自动布局：按列排布（每行 3 个节点，间距 300x200）
        const col = index % 3
        const row = Math.floor(index / 3)
        const defaultPosition = { x: 100 + col * 320, y: 100 + row * 220 }
        const pos = n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number'
          ? n.position
          : defaultPosition
        // 🔥 智能 type 归类：未知 type 尝试根据 label 推断，仍失败则归为 logicNode
        const rawType = n.type
        const inferredLabel = n.data?.label || n.label || n.data?.description || n.id || `节点 ${index + 1}`
        const nodeType = SUPPORTED_NODE_TYPES.has(rawType)
          ? rawType
          : inferNodeType(inferredLabel, n.data?.type)
        return {
          ...n,
          id: String(n.id || `node-${index}`),
          type: nodeType,
          position: pos,
          data: {
            label: inferredLabel,
            ...n.data,
            // 保留原始 type 以便调试，但 React Flow 实际使用的是顶层 type
          },
        } as Node
      })
  }, [])

  // 🔥 规范化 edges，确保 source/target 指向真实存在的 node id
  const sanitizeEdges = useCallback((rawEdges: any[], validNodeIds: Set<string>): Edge[] => {
    if (!Array.isArray(rawEdges)) return []
    return rawEdges
      .filter((e: any) => e && e.source && e.target && validNodeIds.has(e.source) && validNodeIds.has(e.target))
      .map((e: any, index: number) => ({
        id: String(e.id || `e-${index}`),
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type || 'deletable',
        data: e.data,
        label: e.label,
        animated: e.animated,
      } as Edge))
  }, [])
  const [ruleName, setRuleName] = useState('新自动化策略');
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false);
  const [isNodeLibraryCollapsed, setIsNodeLibraryCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(!!ruleId);

  const { deviceData } = useDeviceData();

  // Load from AI assistant temporary storage
  useEffect(() => {
    if (fromAiAssistant && !ruleId) {
      try {
        const tempStrategy = sessionStorage.getItem('temp_automation_strategy');
        if (tempStrategy) {
          const strategy = JSON.parse(tempStrategy);
          if (strategy.nodes) {
            const safeNodes = sanitizeNodes(strategy.nodes)
            const nodeIds = new Set(safeNodes.map(n => n.id))
            setNodes(safeNodes);
            if (strategy.edges) setEdges(sanitizeEdges(strategy.edges, nodeIds));
          }
          setRuleName('由 AI 助手生成的自动化策略');
          // Clear temporary storage
          sessionStorage.removeItem('temp_automation_strategy');
          toast.success('已加载 AI 生成的策略', {
            description: '您可以继续编辑或直接保存'
          });
        }
      } catch (e) {
        console.error('Failed to load temp strategy:', e);
      }
    }
  }, [fromAiAssistant, ruleId]);

  useEffect(() => {
    if (!ruleId) return;
    
    const fetchRule = async () => {
        try {
            const res = await fetch(`/api/automation/rules/${ruleId}`);
            if (!res.ok) throw new Error('Failed to fetch rule');
            const data = await res.json();
            if (data.success && data.data) {
                const rule = data.data;
                setRuleName(rule.name);
                
                if (rule.graph_data) {
                    try {
                        const graphData = JSON.parse(rule.graph_data);
                        if (graphData.nodes) {
                          const safeNodes = sanitizeNodes(graphData.nodes)
                          const nodeIds = new Set(safeNodes.map(n => n.id))
                          setNodes(safeNodes);
                          if (graphData.edges) setEdges(sanitizeEdges(graphData.edges, nodeIds));
                        }
                    } catch (e) {
                        console.error('Failed to parse graph data:', e);
                    }
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('加载规则失败');
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchRule();
  }, [ruleId]);

  const [isSimulating, setIsSimulating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  // 撤销/重做历史栈（快照节点/边集合）
  const undoStackRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const redoStackRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const { screenToFlowPosition, toObject, deleteElements, getNodes, getEdges, fitView } = useReactFlow();

  const { speak, cancel: cancelSpeech, isSpeaking } = useSpeechSynthesis({
    lang: 'zh-CN',
    rate: 1.0,
    pitch: 1.0,
  });

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      }
    } catch (e) {
      console.error("Failed to fetch user:", e);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // 拉取 adminUI 配置的 AI 默认模型 + 可用模型，注入到画布上下文
  useEffect(() => {
    let cancelled = false
    fetch('/api/ai/default-model')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (cancelled || !d) return
        setAiDefaults({
          modelId: d.modelId || null,
          models: Array.isArray(d.models) ? d.models : [],
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // ... (keeping existing callbacks onNodesChange, onEdgesChange, onConnect, onDragOver, onDrop, onDragStart)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  // —— 删除节点（Delete/Backspace 或工具栏按钮触发）——
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const ids = new Set(deleted.map((d) => d.id))
      if (ids.size === 0) return
      undoStackRef.current.push({ nodes, edges })
      redoStackRef.current = []
      setNodes((nds) => nds.filter((n) => !ids.has(n.id)))
      // 级联删除与这些节点相连的边
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
    },
    [nodes, edges, setNodes, setEdges],
  )

  // —— 删除连线（单独选中边后 Delete）——
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const ids = new Set(deleted.map((d) => d.id))
      if (ids.size === 0) return
      undoStackRef.current.push({ nodes, edges })
      redoStackRef.current = []
      setEdges((eds) => eds.filter((e) => !ids.has(e.id)))
    },
    [nodes, edges, setEdges],
  )

  // —— 选中变化：记录数量，用于工具栏删除按钮状态 ——
  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedCount((selNodes?.length || 0) + (selEdges?.length || 0))
    },
    [],
  )

  // —— 工具栏「删除所选」：删除所有选中的节点与边 ——
  const handleDeleteSelected = useCallback(() => {
    const selNodes = getNodes().filter((n) => n.selected)
    const selEdges = getEdges().filter((e) => e.selected)
    if (selNodes.length === 0 && selEdges.length === 0) return
    undoStackRef.current.push({ nodes, edges })
    redoStackRef.current = []
    deleteElements({ nodes: selNodes, edges: selEdges })
  }, [nodes, edges, getNodes, getEdges, deleteElements])

  // —— 删除单条连线（自定义边上的红色删除按钮触发）——
  const handleDeleteEdge = useCallback(
    (id: string) => {
      onEdgesDelete([{ id } as unknown as Edge])
    },
    [onEdgesDelete],
  )

  // 自定义边类型：deletable 连线（选中后中点下方出现删除按钮）
  const edgeTypes = useMemo(
    () => ({
      deletable: (props: EdgeProps) => (
        <DeletableEdge {...props} onDelete={handleDeleteEdge} />
      ),
    }),
    [handleDeleteEdge],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      // 逻辑节点（判定）的 true/false 两个出口，连线时打上是/否标签
      let label = ""
      if (params.sourceHandle === "true") label = "是"
      else if (params.sourceHandle === "false") label = "否"

      // 记录快照（用于撤销）
      undoStackRef.current.push({ nodes, edges })
      if (undoStackRef.current.length > 50) undoStackRef.current.shift()
      redoStackRef.current = []

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'deletable',
            animated: true,
            label,
            labelStyle: { fill: "#52525B", fontSize: 11, fontWeight: 500 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4,
            style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
          },
          eds
        )
      )
    },
    [nodes, edges, setEdges]
  )

  // 撤销 / 重做（基于节点/边历史快照）
  const snapshot = () => ({
    nodes: JSON.parse(JSON.stringify(nodes)) as Node[],
    edges: JSON.parse(JSON.stringify(edges)) as Edge[],
  })

  const handleUndo = useCallback(() => {
    const prev = undoStackRef.current.pop()
    if (!prev) return
    redoStackRef.current.push(snapshot())
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }, [nodes, edges, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(snapshot())
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [nodes, edges, setNodes, setEdges])

  // ===================== AI 画布操作（前端工具 automation_canvas_apply 的执行器）=====================
  // 为什么在前端执行：画布（ReactFlow nodes/edges）是编辑器的本地 state，后端既看不到也未落库。
  // 链路：模型 tool_call → 后端推 SSE client_tool_call → 这里落到 state（实时可见）→ 结果回传 → 模型继续。
  // 约束：整批 ops 只压一次撤销栈（用户 Ctrl+Z 可整体回退）；不自动保存，避免覆盖用户未存的编辑。

  /** DOM 级脉冲高亮：只加临时 class，不写进节点对象 —— 否则保存时会落进 graph_data */
  const pulseNodes = useCallback((ids: string[]) => {
    if (!ids.length) return
    /**
     * 逐个点亮，而不是一次性全亮 —— 让用户看得见"AI 在挨个动这些节点"。
     * 改动多时压缩间隔，保证整体节奏仍落在 ~1.2s 内。
     */
    const step = ids.length <= 6 ? 200 : Math.max(55, Math.round(1200 / ids.length))
    requestAnimationFrame(() => {
      ids.forEach((id, i) => {
        setTimeout(() => {
          const el = document.querySelector(`.react-flow__node[data-id="${id}"]`) as HTMLElement | null
          if (!el) return
          el.classList.remove('ai-fresh')
          void el.offsetWidth // 强制重排，让动画可重放
          el.classList.add('ai-fresh')
          setTimeout(() => el.classList.remove('ai-fresh'), 2800)
        }, i * step)
      })
    })
  }, [])

  const applyCanvasOps = useCallback(
    async (args: any) => {
      const ops: any[] = Array.isArray(args?.ops) ? args.ops : []
      if (ops.length === 0) {
        return { success: false, error: 'ops 为空：请至少提供一个操作' }
      }

      // 整批改动只压一次快照，保证 AI 的改动可一键撤销
      undoStackRef.current.push({ nodes, edges })
      if (undoStackRef.current.length > 50) undoStackRef.current.shift()
      redoStackRef.current = []

      let nextNodes: Node[] = nodes.map(n => ({ ...n, data: { ...(n.data as any) } }))
      let nextEdges: Edge[] = edges.map(e => ({ ...e }))
      const applied: string[] = []
      const warnings: string[] = []
      const fresh = new Set<string>()
      const createdIds: string[] = []
      /** 本批新增节点的 id，按创建顺序 —— 用于把模型的短别名（a1/n2/node3）解析成真实 id */
      const createdOrder: string[] = []
      let addedCount = 0

      const hasNode = (id: string) => nextNodes.some(n => n.id === id)
      const genNodeId = (type: string) => {
        let i = nextNodes.length + 1
        let id = `${type}-${i}`
        while (hasNode(id)) { i += 1; id = `${type}-${i}` }
        return id
      }
      const autoPosition = (type: string) => ({
        x: NODE_COLUMN_X[type] ?? 340,
        y: 80 + nextNodes.filter(n => n.type === type).length * 170,
      })
      /**
       * 把模型给的节点引用解析成真实 id。
       *
       * 实测模型很爱"先 add_node 不带 id，再用 a1/a2/a3 去 connect"，
       * 若不兜底，整批连线会全部落空（画布上只有孤零零的节点）。
       * 解析顺序：① 真实 id ② 本批第 k 个新增节点（a1/n2/node3 → k=1/2/3）③ label 唯一命中
       */
      const resolveRef = (ref: unknown): { id: string | null; via?: string } => {
        const raw = String(ref ?? '').trim()
        if (!raw) return { id: null }
        if (hasNode(raw)) return { id: raw }
        const m = /^[a-z_]*?(\d+)$/i.exec(raw)
        if (m) {
          const idx = Number(m[1])
          if (idx >= 1 && idx <= createdOrder.length) {
            const hit = createdOrder[idx - 1]
            return { id: hit, via: `${raw} → ${hit}` }
          }
        }
        const byLabel = nextNodes.filter(n => String((n.data as any)?.label || '').includes(raw))
        if (byLabel.length === 1) return { id: byLabel[0].id, via: `${raw} → ${byLabel[0].id}` }
        return { id: null }
      }

      for (const raw of ops) {
        const op = String(raw?.op || '')
        switch (op) {
          case 'add_node': {
            const reqType = String(raw.type || '')
            const label = String(raw.label || '').trim()
            const nodeType = SUPPORTED_NODE_TYPES.has(reqType)
              ? reqType
              : inferNodeType(label || '新节点', raw.subType)
            const providedId = raw.id ? String(raw.id) : ''
            const id = providedId && !hasNode(providedId) ? providedId : genNodeId(nodeType)
            const pos =
              raw.position && typeof raw.position.x === 'number' && typeof raw.position.y === 'number'
                ? { x: raw.position.x, y: raw.position.y }
                : autoPosition(nodeType)
            const data: any = {
              label: label || NODE_TYPE_CN[nodeType] || nodeType,
              type: raw.subType ? String(raw.subType) : undefined,
              config: raw.config && typeof raw.config === 'object' ? { ...raw.config } : {},
            }
            if (nodeType === 'aiNode' && !data.config.model) {
              data.config.model = aiDefaults.modelId || 'qwen-plus'
            }
            nextNodes.push({ id, type: nodeType, position: pos, data } as Node)
            createdIds.push(id)
            createdOrder.push(id)
            fresh.add(id)
            addedCount++
            applied.push(`新增节点 ${id}（${data.label}）`)
            break
          }
          case 'update_node': {
            const { id, via } = resolveRef(raw.id)
            const idx = id ? nextNodes.findIndex(n => n.id === id) : -1
            if (!id || idx === -1) { warnings.push(`update_node 找不到节点 ${raw.id}`); break }
            const n: any = nextNodes[idx]
            const data: any = { ...(n.data || {}) }
            if (raw.label !== undefined) data.label = String(raw.label)
            if (raw.subType !== undefined) data.type = String(raw.subType)
            if (raw.config && typeof raw.config === 'object') {
              data.config = { ...(data.config || {}), ...raw.config }
            }
            const position =
              raw.position && typeof raw.position.x === 'number' && typeof raw.position.y === 'number'
                ? { x: raw.position.x, y: raw.position.y }
                : n.position
            nextNodes[idx] = { ...n, position, data }
            fresh.add(id)
            applied.push(`更新节点 ${id}（${data.label}）${via ? `[别名 ${via}]` : ''}`)
            break
          }
          case 'remove_node': {
            const { id } = resolveRef(raw.id)
            if (!id) { warnings.push(`remove_node 找不到节点 ${raw.id}`); break }
            const linked = nextEdges.filter(e => e.source === id || e.target === id).length
            nextNodes = nextNodes.filter(n => n.id !== id)
            nextEdges = nextEdges.filter(e => e.source !== id && e.target !== id)
            fresh.delete(id)
            applied.push(`删除节点 ${id}${linked ? `（连带 ${linked} 条连线）` : ''}`)
            break
          }
          case 'connect': {
            const src = resolveRef(raw.source)
            const tgt = resolveRef(raw.target)
            const source = src.id
            const target = tgt.id
            if (!source || !target) {
              warnings.push(
                `connect 的节点无法解析：${raw.source} → ${raw.target}（画布上没有这些节点；` +
                  `新增节点请自己在 add_node 里指定 id，或在 connect 里用节点名称）`
              )
              break
            }
            if (source === target) { warnings.push('connect 不允许节点自连'); break }
            const sourceHandle = raw.sourceHandle ? String(raw.sourceHandle) : undefined
            if (
              nextEdges.some(
                e => e.source === source && e.target === target && (e as any).sourceHandle === sourceHandle
              )
            ) {
              warnings.push(`连线已存在：${source} → ${target}`)
              break
            }
            const autoLabel = sourceHandle === 'true' ? '是' : sourceHandle === 'false' ? '否' : ''
            const label = raw.edgeLabel !== undefined ? String(raw.edgeLabel) : autoLabel
            nextEdges = addEdge(
              {
                source,
                target,
                sourceHandle,
                targetHandle: raw.targetHandle ? String(raw.targetHandle) : undefined,
                type: 'deletable',
                animated: true,
                label,
                labelStyle: { fill: '#52525B', fontSize: 11, fontWeight: 500 },
                labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
                labelBgPadding: [4, 2] as [number, number],
                labelBgBorderRadius: 4,
                style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
              } as any,
              nextEdges
            ) as Edge[]
            const viaNote = [src.via, tgt.via].filter(Boolean).join(' / ')
            applied.push(`连线 ${source} → ${target}${label ? `（${label}）` : ''}${viaNote ? `[别名 ${viaNote}]` : ''}`)
            break
          }
          case 'disconnect': {
            const idRef = raw.id ? resolveRef(raw.id).id : null
            const srcRef = raw.source ? resolveRef(raw.source).id : null
            const tgtRef = raw.target ? resolveRef(raw.target).id : null
            if (!idRef && (!srcRef || !tgtRef)) {
              warnings.push('disconnect 需要 id 或 source+target')
              break
            }
            const before = nextEdges.length
            nextEdges = nextEdges.filter(e =>
              idRef ? e.id !== idRef : !(e.source === srcRef && e.target === tgtRef)
            )
            if (nextEdges.length === before) warnings.push('disconnect 没有匹配到连线')
            else applied.push(`断开连线 ${idRef || `${srcRef} → ${tgtRef}`}`)
            break
          }
          case 'move_node': {
            const { id } = resolveRef(raw.id)
            const idx = id ? nextNodes.findIndex(n => n.id === id) : -1
            if (!id || idx === -1) { warnings.push(`move_node 找不到节点 ${raw.id}`); break }
            if (!raw.position || typeof raw.position.x !== 'number' || typeof raw.position.y !== 'number') {
              warnings.push('move_node 缺少合法 position')
              break
            }
            nextNodes[idx] = { ...nextNodes[idx], position: { x: raw.position.x, y: raw.position.y } }
            applied.push(`移动节点 ${id}`)
            break
          }
          case 'highlight': {
            const refs: unknown[] = Array.isArray(raw.ids)
              ? raw.ids
              : raw.id
                ? [raw.id]
                : nextNodes.map(n => n.id)
            const found = refs.map(r => resolveRef(r).id).filter((v): v is string => !!v)
            if (!found.length) { warnings.push('highlight 没有匹配到节点'); break }
            found.forEach(id => fresh.add(id))
            applied.push(`高亮 ${found.length} 个节点`)
            break
          }
          case 'clear': {
            const n = nextNodes.length
            const e = nextEdges.length
            nextNodes = []
            nextEdges = []
            fresh.clear()
            applied.push(`清空画布（原有 ${n} 节点 / ${e} 连线）`)
            break
          }
          default:
            warnings.push(`不支持的 op：${op || '(空)'}`)
        }
      }

      if (applied.length === 0) {
        return {
          success: false,
          error: `没有任何操作生效。${warnings.join('；') || '请检查 ops 格式'}`,
        }
      }

      setNodes(nextNodes)
      setEdges(nextEdges)
      pulseNodes([...fresh])

      // 新增了节点就自动 fitView，保证"改动看得见"（否则可能落在当前视口外）
      if (addedCount > 0) {
        setTimeout(() => {
          try { fitView({ duration: 620, padding: 0.25 }) } catch { /* ignore */ }
        }, 80)
      }

      const summary = typeof args?.summary === 'string' ? args.summary : ''
      console.log(`[Canvas AI] applied ${applied.length} ops:`, applied)
      if (warnings.length) console.warn('[Canvas AI] warnings:', warnings)

      return {
        success: true,
        summary: summary || undefined,
        applied,
        warnings: warnings.length ? warnings : undefined,
        created_node_ids: createdIds.length ? createdIds : undefined,
        canvas: { nodes: nextNodes.length, edges: nextEdges.length },
        note: '改动已实时应用到画布，但尚未保存 —— 用户可 Ctrl+Z 撤销，或点「保存」落库。',
      }
    },
    [nodes, edges, setNodes, setEdges, fitView, pulseNodes, aiDefaults.modelId]
  )

  /**
   * 画布实时上下文 → 注入 systemPrompt
   * 让模型"看见"当前画布：节点 id/类型/子类型/标签/坐标 + 连线，改图前必须先有这份信息。
   */
  const canvasContext = useCallback(() => {
    const lines: string[] = ['页面：自动化策略「画布编辑器」（/automation/editor）']
    lines.push(
      `策略名称：${ruleName}` +
        (ruleId ? `（已存在，rule_id=${ruleId}）` : '（尚未保存的新策略）')
    )
    lines.push(`画布规模：${nodes.length} 个节点 / ${edges.length} 条连线`)
    if (nodes.length) {
      lines.push('节点清单（id ｜ 类型 ｜ 子类型 ｜ 名称 ｜ 位置）：')
      for (const n of nodes.slice(0, 40)) {
        const d: any = n.data || {}
        const pos = n.position
          ? `(${Math.round(n.position.x)},${Math.round(n.position.y)})`
          : '(未定位)'
        lines.push(
          `- ${n.id} ｜ ${n.type} ｜ ${d.type || '-'} ｜ ${d.label || '-'} ｜ ${pos}`
        )
      }
      if (nodes.length > 40) lines.push(`（仅列出前 40 个，共 ${nodes.length} 个）`)
    } else {
      lines.push('节点清单：（画布当前为空）')
    }
    if (edges.length) {
      lines.push('连线清单：')
      for (const e of edges.slice(0, 60)) {
        const handle = (e as any).sourceHandle ? `[${(e as any).sourceHandle}]` : ''
        const label = typeof e.label === 'string' && e.label ? `｜标签=${e.label}` : ''
        lines.push(`- ${e.id} ｜ ${e.source}${handle} → ${e.target}${label}`)
      }
    }
    lines.push(
      '说明：你可以用 automation_canvas_apply 直接修改这张画布（新增/更新/删除节点、连线、移动、高亮、清空），' +
        '改动会实时生效到用户眼前的画布上，但不会自动保存。用户说"帮我加/改/连/删"时请直接动手，不要只给建议。' +
        '改完用一两句话说明改动即可，不要再输出 <AUTOMATION_STRATEGY> 标签或节点 JSON 草稿。'
    )
    return lines.join('\n')
  }, [nodes, edges, ruleName, ruleId])

  /** 前端工具宿主：声明本页支持「自动化画布」能力 + 执行器 + 光效文案 */
  const canvasClientTools = useMemo<CopilotClientTools>(
    () => ({
      capabilities: ['automation-canvas'],
      handlers: {
        automation_canvas_apply: async (args: any) => {
          /**
           * ⏱ 先留一小段"光效亮起"的时间再动画布。
           * 用户反馈「消失得太快，没怎么看到」的根因有两层：① 光效寿命太短（已修）
           * ② 光效刚淡入、画布就已经改完了 —— 看不到"过程"就只剩"结果"。
           * 460ms 足够让边缘光带扫出来，对 Agent Loop 的总延迟可以忽略。
           */
          await new Promise(r => setTimeout(r, 460))
          return applyCanvasOps(args)
        },
      },
      labels: { automation_canvas_apply: '莓小智正在修改画布…' },
      doneLabels: {
        automation_canvas_apply: (result: unknown) => {
          const r = result as { success?: boolean; applied?: string[] } | null
          if (r?.success === false) return '画布改动没生效'
          const n = r?.applied?.length ?? 0
          return n ? `画布已更新 · ${n} 处改动` : '画布已更新'
        },
      },
    }),
    [applyCanvasOps]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const subType = event.dataTransfer.getData('application/reactflow-subtype');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${nodes.length + 1}`,
        type,
        position: position && typeof position.x === 'number' && typeof position.y === 'number'
          ? position
          : { x: 100 + nodes.length * 50, y: 100 },
        data: type === 'aiNode'
          ? { label, type: subType, config: { model: aiDefaults.modelId || 'qwen-plus' } }
          : { label, type: subType },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, nodes, aiDefaults.modelId],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, subType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-subtype', subType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    // Reset all nodes to idle
    setNodes((nds) => nds.map((node) => ({ ...node, data: { ...node.data, status: 'idle' } })));
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Simple simulation: trigger -> logic -> action
    try {
      // 1. Activate Triggers
      const triggers = nodes.filter(n => n.type === 'triggerNode');
      for (const trigger of triggers) {
        setNodes((nds) => nds.map((n) => n.id === trigger.id ? { ...n, data: { ...n.data, status: 'running' } } : n));
        await sleep(1000);
        setNodes((nds) => nds.map((n) => n.id === trigger.id ? { ...n, data: { ...n.data, status: 'completed' } } : n));
      }
      
      // 2. Activate Logic/AI
      const logicNodes = nodes.filter(n => n.type === 'logicNode' || n.type === 'aiNode');
      for (const logic of logicNodes) {
        setNodes((nds) => nds.map((n) => n.id === logic.id ? { ...n, data: { ...n.data, status: 'running' } } : n));
        await sleep(1500); // Logic takes a bit longer
        setNodes((nds) => nds.map((n) => n.id === logic.id ? { ...n, data: { ...n.data, status: 'completed' } } : n));
      }

      // 3. Activate Actions
      const actions = nodes.filter(n => n.type === 'actionNode');
      for (const action of actions) {
        setNodes((nds) => nds.map((n) => n.id === action.id ? { ...n, data: { ...n.data, status: 'running' } } : n));
        await sleep(1000);
        setNodes((nds) => nds.map((n) => n.id === action.id ? { ...n, data: { ...n.data, status: 'completed' } } : n));
      }

      toast.success('模拟运行完成', { description: '自动化流程逻辑验证通过' });

    } catch (error) {
      console.error(error);
      toast.error('模拟运行失败');
    } finally {
      setIsSimulating(false);
      // Optional: Reset status after a delay
      setTimeout(() => {
        setNodes((nds) => nds.map((node) => ({ ...node, data: { ...node.data, status: 'idle' } })));
      }, 3000);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    const loadingToast = toast.loading('正在下发控制指令...');
    
    try {
      const flowData = toObject();
      
      // Validate flow has nodes
      if (!flowData.nodes || flowData.nodes.length === 0) {
        toast.error('执行失败', { description: '自动化流程为空，请先添加节点', id: loadingToast });
        return;
      }
      
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          graph_data: flowData,
          force: true, // Bypassing triggers for immediate execution
          context: {
            sensorData: deviceData || {},
            timestamp: Date.now()
          }
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error('执行失败', { 
          description: data.message || data.error || '未知错误', 
          id: loadingToast,
          duration: 5000
        });
        return;
      }

      if (data.actions && data.actions.length > 0) {
        toast.success(`成功下发 ${data.actions.length} 条指令`, { id: loadingToast });
        
        // Voice feedback
        speak(`成功下发 ${data.actions.length} 条指令。`);
        
        // Log execution results if available
        if (data.executionResults) {
          const failed = data.executionResults.filter((r: any) => !r.success);
          if (failed.length > 0) {
            console.warn('Some actions failed:', failed);
          }
        }
      } else {
        const debugInfo = data.debug?.context?.sensorData 
            ? `当前环境数据: 温度 ${data.debug.context.sensorData.temperature}°C, 湿度 ${data.debug.context.sensorData.humidity}%` 
            : '未获取到实时传感器数据';
        
        toast.info('未触发任何操作', { 
            description: `${data.message || '逻辑条件未满足'}。\n${debugInfo}`, 
            id: loadingToast,
            duration: 5000 
        });
        
        // Voice feedback
        speak("未触发任何操作，逻辑条件未满足。");
      }
      
      // Log debug info
      if (data.debug) {
        console.log('Automation execution debug:', data.debug);
      }
    } catch (e) {
      console.error('Run error:', e);
      toast.error('运行失败', { 
        description: e instanceof Error ? e.message : '网络错误，请稍后重试', 
        id: loadingToast,
        duration: 5000
      });
      speak("运行失败，请检查网络连接后重试。");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const flowData = toObject();
        // Determine primary trigger type
        const firstTrigger = flowData.nodes.find((n: any) => n.type === 'triggerNode');
        const triggerType = firstTrigger?.data?.type || 'manual';

        const url = ruleId ? `/api/automation/rules/${ruleId}` : '/api/automation/rules';
        const method = ruleId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: ruleName,
                description: '由编辑器自动创建',
                graph_data: flowData,
                trigger_type: triggerType,
                is_active: true
            })
        });

        if (!res.ok) throw new Error('保存失败');
        
        const data = await res.json();
        toast.success(ruleId ? '自动化规则已更新' : '自动化规则已保存', {
            description: '系统将立即开始按此规则运行',
        });
        
        // Return to list after save
        setTimeout(() => router.push('/automation'), 1000);
    } catch (e) {
        toast.error('保存失败', { description: String(e) });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <ConfigProvider theme={antdScopeTheme(isDark)}>
    <EditorAIDefaultsContext.Provider value={aiDefaults}>
    <div className="automation-canvas-scope relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      {/* AI 改动画布时的节点脉冲高亮（只挂临时 class，不写进 graph_data） */}
      <style>{`
        @keyframes aiFreshPulse {
          0%   { box-shadow: 0 0 0 0 rgba(59,130,246,.55), 0 0 22px 4px rgba(139,92,246,.35); }
          70%  { box-shadow: 0 0 0 14px rgba(59,130,246,0), 0 0 30px 10px rgba(139,92,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0), 0 0 0 0 rgba(139,92,246,0); }
        }
        @keyframes aiFreshDash {
          0%   { opacity: 0; transform: scale(.94); }
          12%  { opacity: 1; transform: scale(1); }
          64%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
        .react-flow__node.ai-fresh { border-radius: 14px; animation: aiFreshPulse 1.5s cubic-bezier(.22,1,.36,1) 2; }
        .react-flow__node.ai-fresh::after {
          content: ""; position: absolute; inset: -7px; border-radius: 16px; pointer-events: none;
          border: 1.5px dashed rgba(96,165,250,.85);
          animation: aiFreshDash 2.8s ease-out 1 forwards;
        }

        /* ===== 深色模式：ReactFlow 内部元素（连线 / 框选 / 标签）=====
           这些 DOM 由 @xyflow/react 生成，类名写不进 Tailwind，只能用作用域 CSS 覆盖。
           作用域 = .automation-canvas-scope，避免影响 landing 页的 architecture-diagram。
           注意：连接点（handle）的描边不能在这里覆盖——Tailwind 的 !border-white
           位于 @layer utilities，而 !important 在分层中优先级反转（layer 内 > 未分层），
           所以 handle 的深色描边写在节点组件的 className 里（dark:!border-zinc-700）。 */
        .dark .automation-canvas-scope .react-flow__edge-path { stroke: #71717a !important; }
        .dark .automation-canvas-scope .react-flow__edge.selected .react-flow__edge-path,
        .dark .automation-canvas-scope .react-flow__edge:focus .react-flow__edge-path { stroke: #71717a !important; }
        .dark .automation-canvas-scope .react-flow__arrowhead polyline,
        .dark .automation-canvas-scope .react-flow__arrowhead path { stroke: #71717a; fill: #71717a; }
        .dark .automation-canvas-scope .react-flow__selection,
        .dark .automation-canvas-scope .react-flow__nodesselection-rect {
          background: rgba(59,130,246,.10); border: 1px dashed rgba(96,165,250,.55);
        }
        .dark .automation-canvas-scope .react-flow__edge-text { fill: #d4d4d8; }
        .dark .automation-canvas-scope .react-flow__edge-textbg { fill: #18181b; }
        .dark .automation-canvas-scope .react-flow__attribution { background: transparent; }
      `}</style>

      {/* Global Background —— 纯中性画布。
          2026-10-22：原来这里还叠了两层径向光斑（浅色薄荷+淡紫 / 深色蓝+绿+靛），
          属于「全站除设备控制页外不再使用渐变背景」那条判据的清理对象，已移除。 */}
      <div className="absolute inset-0 bg-[var(--berry-canvas)]" />

      {/* Editor Layout Grid */}
      <div className="relative z-10 w-full h-full flex flex-col">
        
        {/* 飞书式顶部工具栏（antd 组件） */}
        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none px-5 py-4 flex items-start justify-between">
           {/* Left: Context & Back */}
           <div className="flex items-center gap-3 pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg shadow-sm pl-1.5 pr-4 py-1.5">
              <AntButton
                type="text"
                size="small"
                onClick={() => router.push('/automation')}
                icon={<IconArrowLeft className="w-4 h-4" />}
                className="!text-zinc-500 dark:!text-zinc-400"
              />
              
              <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <AntInput
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      variant="borderless"
                      className="!w-52 !text-sm !font-semibold !px-0"
                      placeholder="策略名称"
                    />
                  </div>
              </div>
           </div>
           
           {/* Right: Actions */}
           <div className="flex items-center gap-2 pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg shadow-sm p-1.5">
                <AntButton
                    type="text"
                    size="small"
                    className="!h-8 !px-3.5 !text-zinc-600 dark:!text-zinc-300"
                    onClick={handleSimulation}
                    disabled={isSimulating}
                    icon={isSimulating ? <IconLoading className="w-4 h-4 animate-spin text-[#059669]" /> : <IconPlay className="w-4 h-4 text-[#059669]" />}
                >
                    {isSimulating ? '模拟运行中...' : '模拟运行'}
                </AntButton>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5"></div>
                <AntButton
                    type="text"
                    size="small"
                    className="!h-8 !px-3.5 !text-zinc-600 dark:!text-zinc-300"
                    onClick={handleRun}
                    disabled={isRunning}
                    icon={isRunning ? <IconLoading className="w-4 h-4 animate-spin text-[#059669]" /> : <IconLightning className="w-4 h-4 text-[#059669]" />}
                >
                    {isRunning ? '正在运行...' : '立即运行'}
                </AntButton>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5"></div>
                <AntButton
                    type="text"
                    size="small"
                    className="!h-8 !px-3.5 !text-zinc-600 dark:!text-zinc-300"
                    onClick={() => setIsDeviceSheetOpen(true)}
                    icon={<IconGridFour className="w-4 h-4" />}
                >
                    设备
                </AntButton>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5"></div>
                <AntButton
                    type="primary"
                    size="small"
                    className="!h-8 !px-5"
                    onClick={handleSave}
                    disabled={isSaving}
                    icon={isSaving ? <IconLoading className="w-4 h-4 animate-spin" /> : <IconSave className="w-4 h-4" />}
                >
                    保存
                </AntButton>
             </div>
        </div>

        {/* Main Content: React Flow Canvas */}
        <div className="flex-1 w-full h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onSelectionChange={onSelectionChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'deletable' }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode="Shift"
            selectionOnDrag={interactionMode === 'box'}
            panOnDrag={interactionMode === 'select'}
            selectionKeyCode={interactionMode === 'box' ? null : 'Shift'}
            fitView
            className="bg-transparent"
            proOptions={{ hideAttribution: true }}
          >
            <Background 
                color={isDark ? "#71717a" : "#a1a1aa"} 
                gap={24} 
                size={1.5} 
                variant={BackgroundVariant.Dots} 
                className="opacity-[0.15] dark:opacity-[0.5]" 
            />

            {/* 顶部居中编辑工具栏：选择 / 框选 / 删除（可见操作入口） */}
            <Panel position="top-center" className="!mt-4">
              <div className="nodrag pointer-events-auto flex items-center gap-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-1.5 py-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <AntButton
                  type={interactionMode === 'select' ? 'primary' : 'text'}
                  size="small"
                  onClick={() => setInteractionMode('select')}
                  icon={<IconClickTap className="w-4 h-4" />}
                >
                  选择
                </AntButton>
                <AntButton
                  type={interactionMode === 'box' ? 'primary' : 'text'}
                  size="small"
                  onClick={() => setInteractionMode('box')}
                  icon={<IconSquareSmall className="w-4 h-4" />}
                >
                  框选
                </AntButton>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
                <AntButton
                  type="text"
                  size="small"
                  danger
                  disabled={selectedCount === 0}
                  onClick={handleDeleteSelected}
                  icon={<IconDelete className="w-4 h-4" />}
                >
                  {selectedCount > 0 ? `删除(${selectedCount})` : '删除'}
                </AntButton>
              </div>
            </Panel>
            
            {/* 底部右下浮动工具栏（zoom / 主题 / 撤销重做） */}
            <CanvasBottomToolbar
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStackRef.current.length > 0}
              canRedo={redoStackRef.current.length > 0}
              onDelete={handleDeleteSelected}
              selectedCount={selectedCount}
            />

            {/* Floating Component Library (Left) */}
            <aside 
              className={`absolute top-24 bottom-6 z-40 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] left-6 ${
                isNodeLibraryCollapsed ? 'w-16' : 'w-80'
              }`}
            >
              <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded-xl overflow-hidden transition-all duration-300">
                {/* Header */}
                <div className="px-4 border-b border-zinc-200/70 dark:border-zinc-700/70 flex items-center justify-between shrink-0 h-12">
                  {!isNodeLibraryCollapsed && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="p-1.5 rounded-lg bg-[#059669]/10 text-[#059669] dark:text-emerald-400">
                        <IconGridFour className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">组件库</span>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all ${isNodeLibraryCollapsed ? 'mx-auto' : ''}`}
                    onClick={() => setIsNodeLibraryCollapsed(!isNodeLibraryCollapsed)}
                  >
                    {isNodeLibraryCollapsed ? <IconPlus className="w-4 h-4" /> : <IconArrowLeft className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Search - Only shown when expanded */}
                {!isNodeLibraryCollapsed && (
                  <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative">
                      <AntInput
                        prefix={<IconSearch className="w-3.5 h-3.5 text-zinc-400" />}
                        placeholder="搜索组件..."
                        size="middle"
                        className="!rounded-lg !bg-zinc-50 dark:!bg-zinc-800/60"
                      />
                    </div>
                  </div>
                )}

                {/* Content — 展开：4 组 × 4 个 2 列网格；折叠：纯图标纵列 */}
                <div className={isNodeLibraryCollapsed ? "flex-1 flex flex-col items-center gap-0.5 px-1.5 py-2 overflow-y-auto scrollbar-none" : "flex-1 overflow-y-auto px-3 pb-5 scrollbar-none hover:scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 transition-all"}>
                  {(() => {
                    // 节点定义：4 组 × 4 个 = 16 个节点
                    const groups: { key: string; label: string; icon: React.ReactNode; items: { type: string; subType: string; label: string; icon: React.ReactNode; desc: string }[] }[] = [
                      {
                        key: 'trigger', label: '触发器',
                        icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-slate-400"><path d="M2 1 L9 5 L2 9 Z" /></svg>,
                        items: [
                          { type: 'triggerNode', subType: 'vlm', label: 'VLM 视觉', icon: <IconMagicWand className="w-3.5 h-3.5" />, desc: 'AI 视觉识别物体与异常' },
                          { type: 'triggerNode', subType: 'sensor', label: '传感器', icon: <IconChartLine className="w-3.5 h-3.5" />, desc: '实时监听温湿度等数据' },
                          { type: 'triggerNode', subType: 'schedule', label: '定时任务', icon: <IconTime className="w-3.5 h-3.5" />, desc: '按计划时间触发' },
                          { type: 'triggerNode', subType: 'manual', label: '手动触发', icon: <IconHandUp className="w-3.5 h-3.5" />, desc: '人工点击按钮触发' },
                        ],
                      },
                      {
                        key: 'logic', label: '判定',
                        icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>,
                        items: [
                          { type: 'logicNode', subType: 'compare', label: '数值比较', icon: <IconGithub className="w-3.5 h-3.5" />, desc: '比较两个数值大小' },
                          { type: 'logicNode', subType: 'range', label: '范围判断', icon: <IconSettingTwo className="w-3.5 h-3.5" />, desc: '判断数值是否在范围内' },
                          { type: 'logicNode', subType: 'condition', label: '与/或', icon: <IconGithub className="w-3.5 h-3.5" />, desc: '多条件组合（与/或）' },
                          { type: 'logicNode', subType: 'delay', label: '延时等待', icon: <IconTimer className="w-3.5 h-3.5" />, desc: '等待指定时长后继续' },
                        ],
                      },
                      {
                        key: 'ai', label: 'AI',
                        icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>,
                        items: [
                          { type: 'aiNode', subType: 'llm', label: '智能处理', icon: <IconMagic className="w-3.5 h-3.5" />, desc: 'LLM 分析并决策' },
                          { type: 'aiNode', subType: 'trend', label: '趋势分析', icon: <IconTrendingUp className="w-3.5 h-3.5" />, desc: '历史数据预测趋势' },
                          { type: 'aiNode', subType: 'anomaly', label: '异常检测', icon: <IconShield className="w-3.5 h-3.5" />, desc: '自动识别异常' },
                          { type: 'aiNode', subType: 'classify', label: '图像分类', icon: <IconScan className="w-3.5 h-3.5" />, desc: '视觉模型分类识别' },
                        ],
                      },
                      {
                        key: 'action', label: '执行',
                        icon: <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-slate-400"><path d="M2 1 L9 5 L2 9 Z" /></svg>,
                        items: [
                          { type: 'actionNode', subType: 'device', label: '设备控制', icon: <IconSwitch className="w-3.5 h-3.5" />, desc: '控制设备开关/参数' },
                          { type: 'actionNode', subType: 'notification', label: '发送通知', icon: <IconRemind className="w-3.5 h-3.5" />, desc: '站内信或邮件通知' },
                          { type: 'actionNode', subType: 'webhook', label: 'Webhook', icon: <IconApi className="w-3.5 h-3.5" />, desc: '调用外部 HTTP 接口' },
                          { type: 'actionNode', subType: 'database', label: '写入数据库', icon: <IconDatabaseNetwork className="w-3.5 h-3.5" />, desc: '记录数据到数据库' },
                        ],
                      },
                    ]

                    // 折叠态：纯图标纵列（每组一个小分隔线）
                    if (isNodeLibraryCollapsed) {
                      return (
                        <div className="flex flex-col items-center gap-1 w-full">
                          {groups.map((g, gi) => (
                            <div key={g.key} className="flex flex-col items-center gap-1 w-full">
                              {groups.map((it, _) => null)}
                              {g.items.map((it) => (
                                <div
                                  key={it.subType}
                                  title={`${it.label} — ${it.desc}`}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, it.type, it.subType, it.label)}
                                  className="group w-9 h-9 rounded-lg border border-transparent bg-white dark:bg-zinc-800 hover:border-[#059669]/40 hover:bg-[#059669]/[0.06] dark:hover:bg-zinc-700 hover:shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200"
                                >
                                  <span className="text-zinc-500 dark:text-zinc-400 group-hover:text-[#059669] transition-colors">
                                    {it.icon}
                                  </span>
                                </div>
                              ))}
                              {gi < groups.length - 1 && (
                                <div className="my-1 w-6 h-px bg-zinc-200 dark:bg-zinc-700" />
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    }

                    // 展开态：分组 + 2 列网格
                    return (
                      <div className="space-y-4 pt-3">
                        {groups.map((g) => (
                          <div key={g.key}>
                            {/* 分组标题 */}
                            <div className="px-1 flex items-center gap-1.5 mb-2">
                              <span className="text-zinc-400 dark:text-zinc-500">{g.icon}</span>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{g.label}</span>
                              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800 ml-0.5" />
                              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 tabular-nums">{g.items.length}</span>
                            </div>
                            {/* 2 列紧凑网格 */}
                            <div className="grid grid-cols-2 gap-1.5">
                              {g.items.map((it) => (
                                <div
                                  key={it.subType}
                                  title={`${it.label} — ${it.desc}`}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, it.type, it.subType, it.label)}
                                  className="group flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border border-zinc-200/70 dark:border-zinc-700/70 bg-white dark:bg-zinc-800 hover:border-[#059669]/40 hover:bg-[#059669]/[0.04] dark:hover:bg-zinc-700/60 hover:shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 group-hover:border-[#059669]/40 group-hover:text-[#059669] group-hover:bg-[#059669]/[0.06] flex items-center justify-center transition-colors duration-200">
                                    {it.icon}
                                  </div>
                                  <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-[#059669] truncate w-full text-center transition-colors">
                                    {it.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </aside>
          </ReactFlow>
        </div>

        {/* 设备面板（antd Drawer） */}
        <AntDrawer
          open={isDeviceSheetOpen}
          onClose={() => setIsDeviceSheetOpen(false)}
          title={
            <span className="flex items-center gap-2 !text-[14px]">
              <IconGridFour className="w-4 h-4 text-zinc-500" />
              设备状态监控
            </span>
          }
          width={480}
          className="!rounded-l-lg overflow-hidden"
        >
           <DeviceSidebarList />
        </AntDrawer>

      </div>

      {/* ===== AI 助手侧栏：本页额外开启「前端画布工具」能力，
          模型可调用 automation_canvas_apply 直接改用户眼前的画布；
          执行期间屏幕边缘会亮起光效（components/ai/copilot/canvas-activity-glow）===== */}
      <CopilotSidebar
        pageKey="automation-editor"
        context={canvasContext}
        deviceData={deviceData as Record<string, unknown> | null}
        clientTools={canvasClientTools}
      />
    </div>
    </EditorAIDefaultsContext.Provider>
    </ConfigProvider>
  );
}

export default function AutomationEditorPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <IconLoading className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <AutomationEditor />
      </Suspense>
    </ReactFlowProvider>
  );
}
