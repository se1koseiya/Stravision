
"use client"

import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TriggerNode from '@/components/automation/trigger-node';
import LogicNode from '@/components/automation/logic-node';
import ActionNode from '@/components/automation/action-node';
import AiNode from '@/components/automation/ai-node';
import { NODE_TYPES } from '@/components/automation/node-types';
import { Button } from '@/components/ui/button';
import { Plus, Play, Save, Settings, ArrowLeft, Wand2, LogOut, LayoutGrid, Loader2, Bolt, Search, Sparkles, BrainCircuit, Zap, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DeviceSidebarList } from "@/components/automation/device-sidebar-list";
import { PageNavigation } from "@/components/page-navigation";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import type { UserPublic } from "@/lib/db/user-service";
import Image from "next/image";
import { useEffect, Suspense } from "react";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { cn } from "@/lib/utils";
import { useDeviceData } from "@/lib/hooks/use-device-data";

const nodeTypes = {
  triggerNode: TriggerNode,
  logicNode: LogicNode,
  actionNode: ActionNode,
  aiNode: AiNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'triggerNode',
    position: { x: 100, y: 150 },
    data: { label: 'VLM 视觉识别', type: 'vlm' },
  },
  {
    id: '2',
    type: 'logicNode',
    position: { x: 500, y: 150 },
    data: { label: '置信度判断', type: 'compare' },
  },
  {
    id: '3',
    type: 'actionNode',
    position: { x: 900, y: 150 },
    data: { label: '发送病害预警', type: 'notification' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#22c55e', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
];

function AutomationEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ruleId = searchParams.get('id');
  const fromAiAssistant = searchParams.get('from') === 'ai-assistant';
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
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
          if (strategy.nodes) setNodes(strategy.nodes);
          if (strategy.edges) setEdges(strategy.edges);
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
                        if (graphData.nodes) setNodes(graphData.nodes);
                        if (graphData.edges) setEdges(graphData.edges);
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
  const [isAiInputVisible, setIsAiInputVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ daily_limit: number, daily_usage: number, balance: number } | null>(null);
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const { screenToFlowPosition, toObject } = useReactFlow();

  // Voice Interaction Hooks
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: 'zh-CN',
    onResult: (result, isFinal) => {
      if (isFinal) {
        setAiPrompt(prev => prev ? `${prev} ${result}` : result);
      }
    },
    onError: (err) => {
      console.error("Speech recognition error:", err);
      toast.error("语音识别出错: " + err);
    }
  });

  const { speak, cancel: cancelSpeech, isSpeaking } = useSpeechSynthesis({
    lang: 'zh-CN',
    rate: 1.0,
    pitch: 1.0,
  });

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
      toast.info("正在聆听...", { icon: <Mic className="w-4 h-4 animate-pulse" /> });
    }
  };

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

  // ... (keeping existing callbacks onNodesChange, onEdgesChange, onConnect, onDragOver, onDrop, onDragStart)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds)),
    [],
  );

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
        position,
        data: { label, type: subType },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, nodes],
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

  const fetchQuota = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const data = await res.json();
      if (data.quota) {
        setQuotaInfo(data.quota);
      }
    } catch (e) {
      console.error('Failed to fetch quota:', e);
    }
  };

  useEffect(() => {
    if (isAiInputVisible) {
      fetchQuota();
    }
  }, [isAiInputVisible]);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('请输入需求描述');
      return;
    }
    
    setIsAiGenerating(true);
    const loadingToast = toast.loading('AI 正在思考并生成自动化策略...');
    
    try {
      const response = await fetch('/api/automation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('配额不足', { 
            description: data.reason || '您的 AI 生成配额已耗尽，请稍后再试或联系管理员', 
            id: loadingToast,
            duration: 5000
          });
        } else {
          toast.error('生成失败', { 
            description: data.error || '未知错误', 
            id: loadingToast,
            duration: 5000
          });
        }
        speak("抱歉，生成策略失败。" + (data.reason || data.error || ''));
        return;
      }
      
      // Validate generated data
      if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
        toast.error('生成失败', { 
          description: 'AI 生成的策略格式不正确，请重新描述需求', 
          id: loadingToast,
          duration: 5000
        });
        speak("生成的策略格式不正确，请重新描述需求。");
        return;
      }
      
      // Ensure all nodes have required fields
      const validatedNodes = data.nodes.map((node: any, index: number) => ({
        ...node,
        id: node.id || `node-${index}`,
        position: node.position || { x: index * 400, y: 100 },
        data: {
          ...node.data,
          config: node.data?.config || {}
        }
      }));
      
      setNodes(validatedNodes);
      setEdges(data.edges || []);
      
      toast.success('AI 策略生成成功！', { 
        description: `已生成 ${validatedNodes.length} 个节点`,
        id: loadingToast 
      });
      
      // Voice feedback
      speak(`自动化策略已生成，包含 ${validatedNodes.length} 个节点。请检查流程是否符合您的预期。`);

      setIsAiInputVisible(false);
      setAiPrompt('');
      fetchQuota(); // 刷新配额
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('AI 生成失败', { 
        description: error instanceof Error ? error.message : '网络错误，请稍后重试', 
        id: loadingToast,
        duration: 5000
      });
      speak("抱歉，生成策略时遇到了问题，请稍后重试。");
    } finally {
      setIsAiGenerating(false);
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
    <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      {/* Global Background */}
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-[#0B1220]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />

      {/* Editor Layout Grid */}
      <div className="relative z-10 w-full h-full flex flex-col">
        
        {/* Minimalist Floating Header */}
        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none p-6 flex items-start justify-between">
           {/* Left: Context & Back */}
           <div className="flex items-center gap-4 pointer-events-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 pr-6 rounded-full border border-white/20 dark:border-white/10 shadow-sm transition-all hover:shadow-md hover:bg-white/90 dark:hover:bg-slate-900/90">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push('/automation')} 
                className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              >
                 <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Input 
                      value={ruleName} 
                      onChange={(e) => setRuleName(e.target.value)}
                      className="h-6 w-48 text-sm font-bold border-none shadow-none focus-visible:ring-0 px-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      placeholder="策略名称"
                    />
                    <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-green-500/10 text-green-600 dark:text-green-400 font-medium border-0">Draft</Badge>
                  </div>
              </div>
           </div>
           
           {/* Right: Actions */}
           <div className="flex items-center gap-3 pointer-events-auto">
             <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-full border border-white/20 dark:border-white/10 shadow-sm">
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 px-4 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                    onClick={() => setIsAiInputVisible(true)}
                >
                    <Sparkles className="w-4 h-4 mr-2 text-amber-500 group-hover:animate-pulse" />
                    AI 生成
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 px-4 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    onClick={handleSimulation}
                    disabled={isSimulating}
                >
                    {isSimulating ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-500" /> : <Play className="w-4 h-4 mr-2 text-indigo-500" />}
                    {isSimulating ? '模拟运行中...' : '模拟运行'}
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 px-4 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    onClick={handleRun}
                    disabled={isRunning}
                >
                    {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-rose-500" /> : <Zap className="w-4 h-4 mr-2 text-rose-500" />}
                    {isRunning ? '正在运行...' : '立即运行'}
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 px-4 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    onClick={() => setIsDeviceSheetOpen(true)}
                >
                    <LayoutGrid className="w-4 h-4 mr-2 opacity-70" />
                    设备
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                <Button 
                    size="sm" 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="h-9 px-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/20 border-0 transition-all hover:scale-105 active:scale-95"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center font-medium"><Save className="w-4 h-4 mr-2" /> 保存</span>}
                </Button>
             </div>
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
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            className="bg-transparent"
            proOptions={{ hideAttribution: true }}
          >
            <Background 
                color="#94a3b8" 
                gap={24} 
                size={1.5} 
                variant={BackgroundVariant.Dots} 
                className="opacity-[0.15] dark:opacity-[0.1]" 
            />
            
            <Controls 
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-sm rounded-xl overflow-hidden m-6" 
                showInteractive={false}
            />
            
            {/* Floating Component Library (Left Side) */}
            <aside 
              className={`absolute top-24 left-6 bottom-6 z-40 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                isNodeLibraryCollapsed ? 'w-16' : 'w-80'
              }`}
            >
              <div className="flex-1 flex flex-col bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-[24px] overflow-hidden transition-all duration-300">
                {/* Header */}
                <div className="p-4 border-b border-slate-200/30 dark:border-slate-800/30 flex items-center justify-between shrink-0 h-16">
                  {!isNodeLibraryCollapsed && (
                    <div className="flex items-center gap-2.5 px-1 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">组件库</span>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-9 w-9 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all ${isNodeLibraryCollapsed ? 'mx-auto' : ''}`}
                    onClick={() => setIsNodeLibraryCollapsed(!isNodeLibraryCollapsed)}
                  >
                    {isNodeLibraryCollapsed ? <Plus className="w-5 h-5 rotate-0 transition-transform duration-300 group-hover:rotate-90" /> : <ArrowLeft className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Search - Only shown when expanded */}
                {!isNodeLibraryCollapsed && (
                  <div className="px-4 py-3 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative group">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <Input 
                        placeholder="搜索组件..." 
                        className="pl-9 h-10 bg-slate-500/5 dark:bg-slate-400/5 border-transparent focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 rounded-xl transition-all" 
                      />
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-none hover:scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 transition-all">
                  <div className="space-y-6 pt-2">
                    {/* Triggers Group */}
                    <div className="space-y-3">
                      {!isNodeLibraryCollapsed && (
                        <div className="px-2 flex items-center gap-3 opacity-40">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">触发器</span>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700"></div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { type: 'triggerNode', subType: 'vlm', label: 'VLM 视觉识别', icon: <Wand2 className="w-5 h-5" />, color: 'green', desc: 'AI 视觉识别物体与异常' },
                          { type: 'triggerNode', subType: 'sensor', label: '传感器数值', icon: <Bolt className="w-5 h-5" />, color: 'green', desc: '实时监听温湿度等数据' },
                          { type: 'logicNode', subType: 'compare', label: '数值比较', icon: <Search className="w-5 h-5" />, color: 'purple', desc: '比较两个数值的大小关系' },
                          { type: 'logicNode', subType: 'range', label: '范围判断', icon: <LayoutGrid className="w-5 h-5" />, color: 'purple', desc: '判断数值是否在指定范围内' },
                          { type: 'aiNode', subType: 'llm', label: 'AI 智能处理', icon: <Sparkles className="w-5 h-5" />, color: 'blue', desc: '使用 LLM 分析数据并决策' },
                          { type: 'aiNode', subType: 'trend', label: '趋势分析', icon: <BrainCircuit className="w-5 h-5" />, color: 'blue', desc: '分析历史数据预测趋势' },
                          { type: 'actionNode', subType: 'device', label: '设备控制', icon: <Settings className="w-5 h-5" />, color: 'orange', desc: '控制开关、模式或参数' },
                          { type: 'actionNode', subType: 'notification', label: '发送通知', icon: <LogOut className="w-4 h-4 rotate-180" />, color: 'orange', desc: '发送站内信或邮件通知' },
                        ].map((item, idx) => (
                          <div 
                            key={idx}
                            className={`group relative flex items-center ${isNodeLibraryCollapsed ? 'justify-center p-2' : 'gap-3 p-3'} rounded-2xl border border-transparent hover:border-white dark:hover:border-white/10 hover:bg-white/50 dark:hover:bg-white/5 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden`}
                            draggable
                            onDragStart={(e) => onDragStart(e, item.type, item.subType, item.label)}
                          >
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                               item.color === 'green' ? 'bg-primary/10 text-primary' :
                               item.color === 'purple' ? 'bg-violet-500/10 text-violet-600' :
                               item.color === 'blue' ? 'bg-blue-500/10 text-blue-600' :
                               'bg-amber-500/10 text-amber-600'
                             } group-hover:scale-110`}>
                                {item.icon}
                             </div>
                             {!isNodeLibraryCollapsed && (
                               <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-1">
                                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 opacity-70 group-hover:opacity-100 transition-opacity">{item.desc}</p>
                               </div>
                             )}
                             {isNodeLibraryCollapsed && (
                               <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                                 {item.label}
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </ReactFlow>
        </div>

        {/* Device Sidebar Sheet */}
        <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] border-l border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl p-0 shadow-2xl">
             <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
               <SheetTitle className="flex items-center gap-2 text-lg">
                 <LayoutGrid className="w-5 h-5 text-slate-500" />
                 设备状态监控
               </SheetTitle>
             </SheetHeader>
             <div className="h-[calc(100vh-80px)] overflow-y-auto p-6">
                <DeviceSidebarList />
             </div>
          </SheetContent>
        </Sheet>

        {/* Floating AI Input Bar */}
        {isAiInputVisible && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-[24px] p-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center pl-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/20 dark:border-white/5">
                    <Wand2 className="w-5 h-5 text-indigo-500 mr-2 shrink-0" />
                    <Input 
                      value={isListening ? (aiPrompt + (transcript ? ` ${transcript}` : '')) : aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                      placeholder={isListening ? "正在聆听..." : "描述你想要的自动化场景..."}
                      className={cn(
                        "border-none shadow-none focus-visible:ring-0 bg-transparent text-sm h-12 transition-all p-0 flex-1",
                        isListening && "placeholder:text-indigo-500 placeholder:animate-pulse"
                      )}
                      autoFocus
                    />
                    
                    {/* Voice Input Button */}
                    <div className="pr-2 pl-2 border-l border-slate-200 dark:border-slate-700/50 h-6 flex items-center my-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleListening}
                          className={cn(
                            "h-8 w-8 rounded-full transition-all",
                            isListening 
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600 animate-pulse" 
                              : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10"
                          )}
                          title="语音输入"
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsAiInputVisible(false);
                        stopListening();
                      }}
                      className="h-10 rounded-xl px-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      取消
                    </Button>
                    <Button 
                      onClick={handleAiGenerate}
                      disabled={isAiGenerating || (!aiPrompt.trim() && !transcript)}
                      className="h-10 rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 whitespace-nowrap"
                    >
                      {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      立即生成
                    </Button>
                  </div>
                </div>
                {/* Quota Indicator */}
                <div className="px-4 pb-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    {isListening ? (
                       <div className="flex items-center gap-1 text-indigo-500 font-bold animate-in fade-in">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-0"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-150"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-300"></div>
                          <span className="ml-1">正在录音...</span>
                       </div>
                    ) : (
                       <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse"></div>
                          <span>此操作将消耗 1 次 AI 生成配额</span>
                       </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="opacity-60">
                      剩余配额: {quotaInfo ? (
                        <span className="text-slate-600 dark:text-slate-300 font-bold">
                          {quotaInfo.balance > 0 ? quotaInfo.balance : (quotaInfo.daily_limit - quotaInfo.daily_usage)} 次
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </span>
                    <span className="opacity-60 underline cursor-help">配额说明</span>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutomationEditorPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-[#F1EFEA] dark:bg-[#0B1220]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <AutomationEditor />
      </Suspense>
    </ReactFlowProvider>
  );
}
