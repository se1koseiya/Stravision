'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { IconArrowRight, IconBrain, IconCheckOne, IconCloseOne, IconLightning, IconLoading, IconPause, IconPlay, IconRobot, IconTime, IconUndo } from "@/components/icon";

interface Agent {
  id: string;
  name: string;
  type: 'planner' | 'executor' | 'validator' | 'coordinator';
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface AgentFlow {
  id: string;
  name: string;
  agents: Agent[];
  currentStep: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
}

const AGENT_COLORS = {
  planner: 'bg-blue-500',
  executor: 'bg-green-500',
  validator: 'bg-purple-500',
  coordinator: 'bg-orange-500',
};

const AGENT_ICONS = {
  planner: IconBrain,
  executor: IconLightning,
  validator: IconCheckOne,
  coordinator: IconRobot,
};

export function MultiAgentOrchestrator() {
  const [flow, setFlow] = useState<AgentFlow>({
    id: 'flow-1',
    name: '智能任务编排',
    currentStep: 0,
    status: 'pending',
    progress: 0,
    agents: [
      {
        id: 'agent-1',
        name: '任务规划器',
        type: 'planner',
        status: 'idle',
        progress: 0,
      },
      {
        id: 'agent-2',
        name: '执行器',
        type: 'executor',
        status: 'idle',
        progress: 0,
      },
      {
        id: 'agent-3',
        name: '验证器',
        type: 'validator',
        status: 'idle',
        progress: 0,
      },
      {
        id: 'agent-4',
        name: '协调器',
        type: 'coordinator',
        status: 'idle',
        progress: 0,
      },
    ],
  });

  const startFlow = () => {
    setFlow(prev => ({ ...prev, status: 'running' }));
    executeAgents();
  };

  const pauseFlow = () => {
    setFlow(prev => ({ ...prev, status: 'paused' }));
  };

  const resetFlow = () => {
    setFlow(prev => ({
      ...prev,
      status: 'pending',
      currentStep: 0,
      progress: 0,
      agents: prev.agents.map(agent => ({
        ...agent,
        status: 'idle',
        progress: 0,
        currentTask: undefined,
        result: undefined,
        error: undefined,
      })),
    }));
  };

  const executeAgents = async () => {
    const agents = [...flow.agents];
    
    for (let i = 0; i < agents.length; i++) {
      setFlow(prev => ({ ...prev, currentStep: i }));
      
      // 更新当前 agent 状态为 thinking
      updateAgentStatus(i, 'thinking', 0, `分析任务中...`);
      await sleep(1000);
      
      // 模拟执行过程
      updateAgentStatus(i, 'executing', 30, `执行 ${agents[i].name}...`);
      await sleep(1500);
      
      updateAgentStatus(i, 'executing', 60, `处理数据中...`);
      await sleep(1000);
      
      updateAgentStatus(i, 'executing', 90, `完成处理...`);
      await sleep(800);
      
      // 完成
      updateAgentStatus(i, 'completed', 100, undefined, {
        message: `${agents[i].name} 执行成功`,
        data: { processed: true },
      });
      
      // 更新总体进度
      const overallProgress = ((i + 1) / agents.length) * 100;
      setFlow(prev => ({ ...prev, progress: overallProgress }));
      
      await sleep(500);
    }
    
    setFlow(prev => ({ ...prev, status: 'completed' }));
  };

  const updateAgentStatus = (
    index: number,
    status: Agent['status'],
    progress: number,
    task?: string,
    result?: any
  ) => {
    setFlow(prev => ({
      ...prev,
      agents: prev.agents.map((agent, i) =>
        i === index
          ? {
              ...agent,
              status,
              progress,
              currentTask: task,
              result,
              startTime: status === 'thinking' ? Date.now() : agent.startTime,
              endTime: status === 'completed' ? Date.now() : undefined,
            }
          : agent
      ),
    }));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'idle':
        return <IconTime className="h-4 w-4 text-muted-foreground" />;
      case 'thinking':
      case 'executing':
        return <IconLoading className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <IconCheckOne className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <IconCloseOne className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle':
        return 'bg-muted text-muted-foreground';
      case 'thinking':
        return 'bg-blue-100 text-blue-600';
      case 'executing':
        return 'bg-blue-100 text-blue-600';
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'failed':
        return 'bg-red-100 text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconRobot className="h-5 w-5" />
                {flow.name}
              </CardTitle>
              <CardDescription>多 Agent 协同执行工作流</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {flow.status === 'pending' && (
                <Button onClick={startFlow} size="sm">
                  <IconPlay className="h-4 w-4 mr-2" />
                  开始执行
                </Button>
              )}
              {flow.status === 'running' && (
                <Button onClick={pauseFlow} variant="outline" size="sm">
                  <IconPause className="h-4 w-4 mr-2" />
                  暂停
                </Button>
              )}
              {(flow.status === 'completed' || flow.status === 'failed') && (
                <Button onClick={resetFlow} variant="outline" size="sm">
                  <IconUndo className="h-4 w-4 mr-2" />
                  重置
                </Button>
              )}
              <Badge variant={
                flow.status === 'completed' ? 'default' :
                flow.status === 'failed' ? 'destructive' :
                flow.status === 'running' ? 'secondary' : 'outline'
              }>
                {flow.status === 'pending' && '待执行'}
                {flow.status === 'running' && '执行中'}
                {flow.status === 'paused' && '已暂停'}
                {flow.status === 'completed' && '已完成'}
                {flow.status === 'failed' && '失败'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">总体进度</span>
              <span className="font-medium">{Math.round(flow.progress)}%</span>
            </div>
            <Progress value={flow.progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Agent 流程图 */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {flow.agents.map((agent, index) => {
            const Icon = AGENT_ICONS[agent.type];
            const isActive = flow.currentStep === index && flow.status === 'running';
            
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative overflow-hidden ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
                  {/* 背景动画 */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    />
                  )}
                  
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${AGENT_COLORS[agent.type]} bg-opacity-10`}>
                          <Icon className={`h-5 w-5 ${AGENT_COLORS[agent.type].replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{agent.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {agent.type === 'planner' && '规划任务'}
                            {agent.type === 'executor' && '执行操作'}
                            {agent.type === 'validator' && '验证结果'}
                            {agent.type === 'coordinator' && '协调整合'}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusIcon(agent.status)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative space-y-3">
                    {/* 状态徽章 */}
                    <Badge className={getStatusColor(agent.status)} variant="secondary">
                      {agent.status === 'idle' && '待命'}
                      {agent.status === 'thinking' && '思考中'}
                      {agent.status === 'executing' && '执行中'}
                      {agent.status === 'completed' && '已完成'}
                      {agent.status === 'failed' && '失败'}
                    </Badge>
                    
                    {/* 进度条 */}
                    {agent.status !== 'idle' && (
                      <div className="space-y-1">
                        <Progress value={agent.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground">
                          {agent.progress}%
                        </p>
                      </div>
                    )}
                    
                    {/* 当前任务 */}
                    {agent.currentTask && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-muted-foreground"
                      >
                        {agent.currentTask}
                      </motion.div>
                    )}
                    
                    {/* 结果 */}
                    {agent.result && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-2 bg-green-50 rounded text-xs text-green-700"
                      >
                        ✓ {agent.result.message}
                      </motion.div>
                    )}
                    
                    {/* 执行时间 */}
                    {agent.endTime && agent.startTime && (
                      <p className="text-xs text-muted-foreground">
                        耗时: {((agent.endTime - agent.startTime) / 1000).toFixed(1)}s
                      </p>
                    )}
                  </CardContent>
                  
                  {/* 连接线 */}
                  {index < flow.agents.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <IconArrowRight className={`h-6 w-6 ${
                        agent.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                      }`} />
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 执行日志 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">执行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {flow.agents.map((agent, index) => (
                agent.status !== 'idle' && (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start gap-2 text-sm p-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-muted-foreground min-w-[60px]">
                      {agent.startTime && new Date(agent.startTime).toLocaleTimeString('zh-CN')}
                    </span>
                    <span className="font-medium min-w-[80px]">{agent.name}</span>
                    <span className="text-muted-foreground flex-1">
                      {agent.status === 'thinking' && '开始分析任务'}
                      {agent.status === 'executing' && agent.currentTask}
                      {agent.status === 'completed' && agent.result?.message}
                      {agent.status === 'failed' && agent.error}
                    </span>
                    {getStatusIcon(agent.status)}
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
