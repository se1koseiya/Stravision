'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion, Reorder } from 'framer-motion';
import { IconBrain, IconCheckOne, IconDelete, IconDrag, IconLightning, IconPlay, IconPlus, IconRobot, IconSave } from "@/components/icon";

interface AgentNode {
  id: string;
  name: string;
  type: 'planner' | 'executor' | 'validator' | 'coordinator' | 'custom';
  description: string;
  config: Record<string, any>;
}

const AGENT_TEMPLATES = [
  {
    type: 'planner',
    name: '任务规划器',
    icon: IconBrain,
    color: 'blue',
    description: '分析用户需求，制定执行计划',
  },
  {
    type: 'executor',
    name: '执行器',
    icon: IconLightning,
    color: 'green',
    description: '执行具体的操作和任务',
  },
  {
    type: 'validator',
    name: '验证器',
    icon: IconCheckOne,
    color: 'purple',
    description: '验证执行结果的正确性',
  },
  {
    type: 'coordinator',
    name: '协调器',
    icon: IconRobot,
    color: 'orange',
    description: '协调多个 Agent 的工作',
  },
];

export function AgentWorkflowBuilder() {
  const [workflow, setWorkflow] = useState<AgentNode[]>([]);
  const [workflowName, setWorkflowName] = useState('新工作流');

  const addAgent = (template: typeof AGENT_TEMPLATES[0]) => {
    const newAgent: AgentNode = {
      id: `agent-${Date.now()}`,
      name: template.name,
      type: template.type as AgentNode['type'],
      description: template.description,
      config: {},
    };
    setWorkflow([...workflow, newAgent]);
  };

  const removeAgent = (id: string) => {
    setWorkflow(workflow.filter(agent => agent.id !== id));
  };

  const updateAgent = (id: string, updates: Partial<AgentNode>) => {
    setWorkflow(workflow.map(agent => 
      agent.id === id ? { ...agent, ...updates } : agent
    ));
  };

  const saveWorkflow = () => {
    console.log('保存工作流:', { name: workflowName, agents: workflow });
    // TODO: 保存到数据库
  };

  const executeWorkflow = () => {
    console.log('执行工作流:', workflow);
    // TODO: 执行工作流
  };

  return (
    <div className="space-y-6">
      {/* 工作流信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>工作流构建器</CardTitle>
              <CardDescription>拖拽排序，自定义多 Agent 协作流程</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={saveWorkflow}>
                <IconSave className="h-4 w-4 mr-2" />
                保存
              </Button>
              <Button size="sm" onClick={executeWorkflow} disabled={workflow.length === 0}>
                <IconPlay className="h-4 w-4 mr-2" />
                执行
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workflow-name">工作流名称</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="输入工作流名称"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent 模板库 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Agent 模板</CardTitle>
            <CardDescription className="text-xs">点击添加到工作流</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {AGENT_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <motion.div
                  key={template.type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => addAgent(template)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className={`p-2 rounded-lg bg-${template.color}-500 bg-opacity-10`}>
                        <Icon className={`h-4 w-4 text-${template.color}-500`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                      <IconPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Button>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        {/* 工作流画布 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">工作流画布</CardTitle>
                <CardDescription className="text-xs">
                  {workflow.length} 个 Agent
                </CardDescription>
              </div>
              {workflow.length > 0 && (
                <Badge variant="secondary">
                  拖拽排序
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {workflow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <IconRobot className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  从左侧选择 Agent 模板开始构建工作流
                </p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={workflow}
                onReorder={setWorkflow}
                className="space-y-3"
              >
                {workflow.map((agent, index) => {
                  const template = AGENT_TEMPLATES.find(t => t.type === agent.type);
                  const Icon = template?.icon || IconRobot;
                  
                  return (
                    <Reorder.Item
                      key={agent.id}
                      value={agent}
                      className="cursor-move"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="group"
                      >
                        <Card className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* 拖拽手柄 */}
                              <div className="flex items-center gap-2">
                                <IconDrag className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                                  {index + 1}
                                </div>
                              </div>

                              {/* Agent 图标 */}
                              <div className={`p-2 rounded-lg bg-${template?.color}-500 bg-opacity-10`}>
                                <Icon className={`h-5 w-5 text-${template?.color}-500`} />
                              </div>

                              {/* Agent 信息 */}
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={agent.name}
                                  onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                                  className="font-medium"
                                  placeholder="Agent 名称"
                                />
                                <Input
                                  value={agent.description}
                                  onChange={(e) => updateAgent(agent.id, { description: e.target.value })}
                                  className="text-sm"
                                  placeholder="描述"
                                />
                                
                                {/* 配置选项 */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">超时时间</Label>
                                    <Select
                                      value={agent.config.timeout || '30'}
                                      onValueChange={(value) => 
                                        updateAgent(agent.id, { 
                                          config: { ...agent.config, timeout: value } 
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="10">10秒</SelectItem>
                                        <SelectItem value="30">30秒</SelectItem>
                                        <SelectItem value="60">60秒</SelectItem>
                                        <SelectItem value="120">120秒</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">重试次数</Label>
                                    <Select
                                      value={agent.config.retries || '2'}
                                      onValueChange={(value) => 
                                        updateAgent(agent.id, { 
                                          config: { ...agent.config, retries: value } 
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0次</SelectItem>
                                        <SelectItem value="1">1次</SelectItem>
                                        <SelectItem value="2">2次</SelectItem>
                                        <SelectItem value="3">3次</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              {/* 删除按钮 */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAgent(agent.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IconDelete className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
