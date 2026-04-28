"use client";

import React, { useState, useRef, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  BackgroundVariant,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Server,
  Cloud,
  Cpu,
  MonitorPlay,
  Bot,
  Database,
  Wifi,
  Zap,
  Video,
  Activity,
  Layers,
  Thermometer,
  User,
  Download,
  LayoutTemplate,
  BrainCircuit,
  MessageSquare,
  Clock,
  Settings,
  ShieldAlert,
  Mic,
  ArrowRightLeft
} from 'lucide-react';
import { toPng } from 'html-to-image';

const icons = {
  User, Server, Cloud, Cpu, MonitorPlay, Bot, Database, Wifi, Zap, 
  Video, Activity, Layers, Thermometer, MessageSquare, Clock, Settings, 
  ShieldAlert, Mic, ArrowRightLeft
};

// --- Custom Nodes ---
const CustomNode = ({ data }: any) => {
  const IconComponent = icons[data.icon as keyof typeof icons] || Layers;

  return (
    <div className={`group relative flex items-center gap-4 rounded-xl border bg-white/95 p-3 pr-5 shadow-sm backdrop-blur-xl transition-all hover:shadow-md min-w-[210px] ${data.highlight ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
      <Handle id="target-top" type="target" position={Position.Top} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      <Handle id="target-left" type="target" position={Position.Left} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      <Handle id="target-right" type="target" position={Position.Right} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      <Handle id="target-bottom" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      
      <Handle id="source-top" type="source" position={Position.Top} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      <Handle id="source-left" type="source" position={Position.Left} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      <Handle id="source-right" type="source" position={Position.Right} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-indigo-500 opacity-0 group-hover:opacity-100" />

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${data.iconColor || 'bg-indigo-50 text-indigo-600'} shadow-sm ring-1 ring-black/5`}>
        <IconComponent size={20} strokeWidth={2.5} />
      </div>

      <div className="flex flex-col justify-center">
        <span className="text-[14px] font-bold tracking-wide text-slate-800">
          {data.label}
        </span>
        <span className="text-[12px] font-medium text-slate-500 mt-0.5">
          {data.sublabel}
        </span>
      </div>
    </div>
  );
};

const GroupNode = ({ data }: any) => {
  return (
    <div className={`relative h-full w-full rounded-2xl border-2 border-dashed ${data.borderColor || 'border-slate-300'} ${data.bgColor || 'bg-slate-50/30'} backdrop-blur-sm transition-colors`}>
      <div className="absolute -left-4 -top-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
        <div className={`h-2.5 w-2.5 rounded-full ${data.dotColor || 'bg-slate-500'}`} />
        <span className="text-[14px] font-bold text-slate-700">
          {data.label}
        </span>
      </div>
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
  customGroup: GroupNode,
};

// --- System Architecture Data (Detailed, Strictly Existing Components) ---
const sysNodes = [
  { id: 'user', type: 'customNode', position: { x: 50, y: 320 }, data: { label: '农场主 / 管理员', sublabel: '设备监管 & 语音下达', icon: 'User', highlight: true } },
  
  // 1. Frontend layer
  { id: 'parent-frontend', type: 'customGroup', position: { x: 340, y: 150 }, data: { label: '前端展示交互层 (Next.js UI)', borderColor: 'border-blue-400', bgColor: 'bg-blue-50/20', dotColor: 'bg-blue-500' }, style: { width: 320, height: 350 }, zIndex: -1 },
  { id: 'web-dashboard', type: 'customNode', position: { x: 40, y: 60 }, parentId: 'parent-frontend', extent: 'parent', data: { label: '大屏控制台UI', sublabel: '设备卡片 / 仪表盘', icon: 'MonitorPlay' } },
  { id: 'webrtc-voice', type: 'customNode', position: { x: 40, y: 160 }, parentId: 'parent-frontend', extent: 'parent', data: { label: 'Pipecat 语音组件', sublabel: 'Daily.co 实时语音流', icon: 'Mic', iconColor: 'bg-rose-50 text-rose-500' } },
  { id: 'video-player', type: 'customNode', position: { x: 40, y: 260 }, parentId: 'parent-frontend', extent: 'parent', data: { label: 'HLS/FLV 播放器', sublabel: '前端监控视频流拉取', icon: 'Video' } },

  // 2. Next.js Backend Services Layer (NEW)
  { id: 'parent-backend', type: 'customGroup', position: { x: 740, y: 70 }, data: { label: '核心业务后端 (Next.js Node API)', borderColor: 'border-violet-400', bgColor: 'bg-violet-50/20', dotColor: 'bg-violet-500' }, style: { width: 330, height: 440 }, zIndex: -1 },
  { id: 'scheduler', type: 'customNode', position: { x: 40, y: 60 }, parentId: 'parent-backend', extent: 'parent', data: { label: '定时任务引擎', sublabel: 'lib/scheduler 定时调度', icon: 'Clock' } },
  { id: 'automation', type: 'customNode', position: { x: 40, y: 160 }, parentId: 'parent-backend', extent: 'parent', data: { label: '自动化规则引擎', sublabel: 'lib/automation 条件触发', icon: 'Settings' } },
  { id: 'db-prisma', type: 'customNode', position: { x: 40, y: 260 }, parentId: 'parent-backend', extent: 'parent', data: { label: '持久化存储', sublabel: 'Prisma + SQLite3', icon: 'Database' } },
  { id: 'mqtt-client', type: 'customNode', position: { x: 40, y: 360 }, parentId: 'parent-backend', extent: 'parent', data: { label: 'MQTT Service', sublabel: '后端设备状态同步池', icon: 'Activity' } },

  // Gateway (MQTT Broker)
  { id: 'broker', type: 'customNode', position: { x: 750, y: 560 }, data: { label: 'MQTT Broker', sublabel: '中心消息总线 / 发布订阅', icon: 'Wifi', highlight: true, iconColor: 'bg-emerald-50 text-emerald-600' } },

  // 3. Agent Layer
  { id: 'parent-ai', type: 'customGroup', position: { x: 1150, y: -20 }, data: { label: 'AI Agent 引擎层 (莓小智 XiaoZhi)', borderColor: 'border-fuchsia-400', bgColor: 'bg-fuchsia-50/20', dotColor: 'bg-fuchsia-500' }, style: { width: 520, height: 350 }, zIndex: -1 },
  { id: 'agent-core', type: 'customNode', position: { x: 35, y: 60 }, parentId: 'parent-ai', extent: 'parent', data: { label: 'Agent 思维编排', sublabel: 'Vercel AI SDK 路由', icon: 'Cpu' } },
  { id: 'vlm', type: 'customNode', position: { x: 35, y: 160 }, parentId: 'parent-ai', extent: 'parent', data: { label: '大语言视觉模型', sublabel: 'QWEN / DEEPSEEK', icon: 'Cloud' } },
  { id: 'mcp-server', type: 'customNode', position: { x: 35, y: 260 }, parentId: 'parent-ai', extent: 'parent', data: { label: 'MCP 工具注册表', sublabel: '函数调用与封装层', icon: 'Server' } },
  { id: 'skills', type: 'customNode', position: { x: 280, y: 60 }, parentId: 'parent-ai', extent: 'parent', data: { label: '专属 Skills 库', sublabel: 'iot-control等指令Markdown', icon: 'Layers' } },
  { id: 'pipecat-server', type: 'customNode', position: { x: 280, y: 160 }, parentId: 'parent-ai', extent: 'parent', data: { label: '语音交互后处理', sublabel: 'Pipecat AI TTS/ASR 链路', icon: 'Bot' } },

  // 4. IoT Layer
  { id: 'parent-iot', type: 'customGroup', position: { x: 1150, y: 380 }, data: { label: 'IoT物理层与下位机', borderColor: 'border-amber-400', bgColor: 'bg-amber-50/20', dotColor: 'bg-amber-500' }, style: { width: 300, height: 460 }, zIndex: -1 },
  { id: 'camera', type: 'customNode', position: { x: 35, y: 60 }, parentId: 'parent-iot', extent: 'parent', data: { label: '监控摄像头', sublabel: '推流与定时抽帧', icon: 'Video' } },
  { id: 'sensors', type: 'customNode', position: { x: 35, y: 160 }, parentId: 'parent-iot', extent: 'parent', data: { label: '传感器组', sublabel: '温湿度 / 土壤等读数', icon: 'Thermometer' } },
  { id: 'motors', type: 'customNode', position: { x: 35, y: 260 }, parentId: 'parent-iot', extent: 'parent', data: { label: '步进电机控制', sublabel: '滑台移动 / 坐标系原点', icon: 'ArrowRightLeft' } },
  { id: 'relays', type: 'customNode', position: { x: 35, y: 360 }, parentId: 'parent-iot', extent: 'parent', data: { label: '各路继电器', sublabel: 'GPIO高低电平控制', icon: 'Zap' } },
];

const edgeProps = { type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } };
const dataEdge = { ...edgeProps, style: { stroke: '#3b82f6', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } };
const voiceEdge = { ...edgeProps, style: { stroke: '#f43f5e', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' } };
const iotEdge = { ...edgeProps, style: { stroke: '#10b981', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } };

const sysEdges = [
  // User to UI
  { id: 'ese1', source: 'user', sourceHandle: 'source-right', target: 'web-dashboard', targetHandle: 'target-left', ...edgeProps },
  { id: 'ese2', source: 'user', sourceHandle: 'source-right', target: 'webrtc-voice', targetHandle: 'target-left', ...voiceEdge },
  { id: 'ese3', source: 'user', sourceHandle: 'source-bottom', target: 'video-player', targetHandle: 'target-left', ...edgeProps },

  // UI to Backend/Agent
  { id: 'ese4', source: 'web-dashboard', sourceHandle: 'source-right', target: 'mqtt-client', targetHandle: 'target-left', ...dataEdge },
  { id: 'ese5', source: 'webrtc-voice', sourceHandle: 'source-right', target: 'pipecat-server', targetHandle: 'target-bottom', ...voiceEdge },

  // Backend Internal
  { id: 'ese6', source: 'scheduler', sourceHandle: 'source-bottom', target: 'automation', targetHandle: 'target-top', ...edgeProps, animated: false },
  { id: 'ese7', source: 'automation', sourceHandle: 'source-right', target: 'mqtt-client', targetHandle: 'target-top', ...dataEdge },
  { id: 'ese8', source: 'automation', sourceHandle: 'source-bottom', target: 'db-prisma', targetHandle: 'target-top', ...edgeProps, animated: false },
  
  // Backend to Agent 
  { id: 'ese8b', source: 'scheduler', sourceHandle: 'source-right', target: 'agent-core', targetHandle: 'target-left', ...dataEdge, label: '定时触发推理任务' },
  { id: 'ese8c', source: 'automation', sourceHandle: 'source-right', target: 'agent-core', targetHandle: 'target-left', ...dataEdge },

  // Agent Internal
  { id: 'ese9', source: 'agent-core', sourceHandle: 'source-bottom', target: 'vlm', targetHandle: 'target-top', ...edgeProps, animated: false },
  { id: 'ese10', source: 'agent-core', sourceHandle: 'source-right', target: 'skills', targetHandle: 'target-left', ...edgeProps, animated: false },
  { id: 'ese11', source: 'agent-core', sourceHandle: 'source-bottom', target: 'mcp-server', targetHandle: 'target-top', ...edgeProps, animated: false },
  { id: 'ese12', source: 'pipecat-server', sourceHandle: 'source-left', target: 'agent-core', targetHandle: 'target-right', ...voiceEdge },

  // Agent to Backend (MCP Tools)
  { id: 'ese13', source: 'mcp-server', sourceHandle: 'source-bottom', target: 'mqtt-client', targetHandle: 'target-right', ...dataEdge, label: 'MCP触发设备协议' },

  // MQTT Client to Broker
  { id: 'ese14', source: 'mqtt-client', sourceHandle: 'source-bottom', target: 'broker', targetHandle: 'target-top', ...iotEdge },

  // Broker to IoT
  { id: 'ese15', source: 'broker', sourceHandle: 'source-right', target: 'sensors', targetHandle: 'target-left', ...iotEdge },
  { id: 'ese16', source: 'broker', sourceHandle: 'source-right', target: 'motors', targetHandle: 'target-left', ...iotEdge },
  { id: 'ese17', source: 'broker', sourceHandle: 'source-right', target: 'relays', targetHandle: 'target-left', ...iotEdge },

  // Camera to Player & VLM
  { id: 'ese18', source: 'camera', sourceHandle: 'source-left', target: 'video-player', targetHandle: 'target-right', ...edgeProps, style: { stroke: '#64748b', strokeDasharray: '4 4' }, label: 'HLS拉流' },
  { id: 'ese19', source: 'camera', sourceHandle: 'source-left', target: 'vlm', targetHandle: 'target-bottom', ...edgeProps, style: { stroke: '#d946ef', strokeDasharray: '5 5' }, label: '抽帧视觉巡检' },
];


// --- Agent Architecture Data (Detailed OODA internal mechanics) ---
const agentNodes = [
  { id: 'trigger-1', type: 'customNode', position: { x: 50, y: 160 }, data: { label: 'WebRTC / 语音文字触发', sublabel: '前端即时请求 (Voice/Chat)', icon: 'MessageSquare' } },
  { id: 'trigger-2', type: 'customNode', position: { x: 50, y: 280 }, data: { label: '后端轮询触发', sublabel: 'cron定时 / Threshold自动化', icon: 'Clock' } },
  
  { id: 'parent-perc', type: 'customGroup', position: { x: 380, y: 100 }, data: { label: 'Perceive (感知与上下文增强)', borderColor: 'border-cyan-400', bgColor: 'bg-cyan-50/20', dotColor: 'bg-cyan-500' }, style: { width: 330, height: 350 }, zIndex: -1 },
  { id: 'perc-db', type: 'customNode', position: { x: 40, y: 60 }, parentId: 'parent-perc', extent: 'parent', data: { label: '提取历史会话 / 日志', sublabel: 'SQLite / Prisma 查询', icon: 'Database' } },
  { id: 'perc-sensor', type: 'customNode', position: { x: 40, y: 160 }, parentId: 'parent-perc', extent: 'parent', data: { label: '获取实时 MQTT Telemetry', sublabel: '传感器当前数值载入', icon: 'Thermometer' } },
  { id: 'perc-vision', type: 'customNode', position: { x: 40, y: 260 }, parentId: 'parent-perc', extent: 'parent', data: { label: '附加上下文视界截图', sublabel: '视觉巡检 VLM 分析前置', icon: 'Video' } },

  { id: 'parent-think', type: 'customGroup', position: { x: 800, y: 100 }, data: { label: 'Think & Decide (分析规划中枢)', borderColor: 'border-purple-400', bgColor: 'bg-purple-50/20', dotColor: 'bg-purple-500' }, style: { width: 330, height: 350 }, zIndex: -1 },
  { id: 'think-skills', type: 'customNode', position: { x: 40, y: 60 }, parentId: 'parent-think', extent: 'parent', data: { label: '调用 Skills (系统级Prompt)', sublabel: '农业常识防错 / 格式限定', icon: 'ShieldAlert' } },
  { id: 'think-llm', type: 'customNode', position: { x: 40, y: 160 }, parentId: 'parent-think', extent: 'parent', data: { label: 'QWEN 计算 / 意图生成', sublabel: 'Core Reasoning Engine', icon: 'BrainCircuit' } },
  { id: 'think-plan', type: 'customNode', position: { x: 40, y: 260 }, parentId: 'parent-think', extent: 'parent', data: { label: '生成分步任务清单', sublabel: '<TASK_LIST> 稳定输出', icon: 'Layers' } },

  { id: 'parent-act', type: 'customGroup', position: { x: 1220, y: 150 }, data: { label: 'Act & Verify (执行与校验)', borderColor: 'border-rose-400', bgColor: 'bg-rose-50/20', dotColor: 'bg-rose-500' }, style: { width: 300, height: 260 }, zIndex: -1 },
  { id: 'act-mcp', type: 'customNode', position: { x: 40, y: 60 }, parentId: 'parent-act', extent: 'parent', data: { label: '构造 MCP Tools 参数参数', sublabel: '下发合规 JSON 设备指令', icon: 'Server' } },
  { id: 'act-verify', type: 'customNode', position: { x: 40, y: 160 }, parentId: 'parent-act', extent: 'parent', data: { label: '比对 Action 后状态 (Verify)', sublabel: '阻塞校验：成功/失败阻断', icon: 'MonitorPlay' } },
];

const agentEdges = [
  { id: 'eae1', source: 'trigger-1', sourceHandle: 'source-right', target: 'perc-db', targetHandle: 'target-left', ...edgeProps },
  { id: 'eae2', source: 'trigger-2', sourceHandle: 'source-right', target: 'perc-db', targetHandle: 'target-left', ...edgeProps },
  { id: 'eae3', source: 'trigger-2', sourceHandle: 'source-right', target: 'perc-sensor', targetHandle: 'target-left', ...edgeProps },
  
  { id: 'eae4', source: 'perc-db', sourceHandle: 'source-right', target: 'think-llm', targetHandle: 'target-left', ...edgeProps },
  { id: 'eae5', source: 'perc-sensor', sourceHandle: 'source-right', target: 'think-llm', targetHandle: 'target-left', ...edgeProps },
  { id: 'eae6', source: 'perc-vision', sourceHandle: 'source-right', target: 'think-llm', targetHandle: 'target-left', ...edgeProps },

  { id: 'eae7', source: 'think-skills', sourceHandle: 'source-bottom', target: 'think-llm', targetHandle: 'target-top', ...edgeProps, animated: false },
  { id: 'eae8', source: 'think-llm', sourceHandle: 'source-bottom', target: 'think-plan', targetHandle: 'target-top', ...edgeProps, animated: false },
  
  { id: 'eae9', source: 'think-plan', sourceHandle: 'source-right', target: 'act-mcp', targetHandle: 'target-left', ...dataEdge },
  { id: 'eae10', source: 'act-mcp', sourceHandle: 'source-bottom', target: 'act-verify', targetHandle: 'target-top', ...dataEdge },

  { 
    id: 'eae11', source: 'act-verify', sourceHandle: 'source-left', target: 'perc-sensor', targetHandle: 'target-bottom', 
    type: 'smoothstep', animated: true, 
    style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    label: '回流重新感知', labelStyle: { fill: '#10b981', fontWeight: 600, fontSize: 12 }, labelBgStyle: { fill: 'white', fillOpacity: 0.9, rx: 4 }
  },
];


function DiagramContent() {
  const [activeTab, setActiveTab] = useState<'system'|'agent'>('system');
  const [nodes, setNodes, onNodesChange] = useNodesState(sysNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(sysEdges);
  const { fitView } = useReactFlow();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const switchTab = useCallback((tab: 'system'|'agent') => {
    setActiveTab(tab);
    if (tab === 'system') {
      setNodes(sysNodes);
      setEdges(sysEdges);
    } else {
      setNodes(agentNodes);
      setEdges(agentEdges);
    }
    setTimeout(() => { fitView({ padding: 0.2, duration: 800 }); }, 50);
  }, [setNodes, setEdges, fitView]);

  const handleExport = useCallback(() => {
    if (reactFlowWrapper.current === null) return;
    const viewport = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
    if (viewport) {
      toPng(reactFlowWrapper.current, { 
        filter: (node) => !(node?.classList?.contains('react-flow__panel') || node?.classList?.contains('react-flow__controls')),
        pixelRatio: 2, backgroundColor: '#f8faff',
      }).then((dataUrl) => {
        const link = document.createElement('a'); link.download = `berry-realm-${activeTab}-architecture.png`; link.href = dataUrl; link.click();
      });
    }
  }, [activeTab]);

  return (
    <div className="relative h-full w-full bg-[#f8faff] overflow-hidden" ref={reactFlowWrapper}>
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-300/10 blur-[100px]"></div>
      <div className="pointer-events-none absolute -right-20 top-40 h-[30rem] w-[30rem] rounded-full bg-emerald-300/10 blur-[120px]"></div>
      
      <ReactFlow
        nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={2} color="#cbd5e1" />
        <Controls className="!rounded-xl border border-slate-200 !bg-white/90 shadow-sm backdrop-blur-md" />
        
        <Panel position="top-center" className="mt-5 z-50">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl p-2 rounded-2xl shadow-lg border border-slate-200/50">
            <button onClick={() => switchTab('system')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <LayoutTemplate size={18} /> 主系统架构
            </button>
            <button onClick={() => switchTab('agent')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'agent' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <BrainCircuit size={18} /> 莓小智 Agent 架构
            </button>
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            <button onClick={handleExport} className="flex items-center justify-center gap-2 px-5 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm ml-1 group">
              <Download size={18} className="text-indigo-500 group-hover:-translate-y-0.5 transition-transform" />
              <span className="font-medium text-[14px]">导出高清图</span>
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function SystemArchitectureDiagram() { return <ReactFlowProvider><DiagramContent /></ReactFlowProvider>; }
