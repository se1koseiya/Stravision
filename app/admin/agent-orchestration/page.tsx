'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiAgentOrchestrator } from '@/components/agent/multi-agent-orchestrator';
import { AgentWorkflowBuilder } from '@/components/agent/agent-workflow-builder';
import { AgentFlowDiagram } from '@/components/agent/agent-flow-diagram';
import { AgentCollaborationChat } from '@/components/agent/agent-collaboration-chat';
import { Workflow, Layers, GitBranch, MessageSquare } from 'lucide-react';

export default function AgentOrchestrationPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent 编排中心</h1>
        <p className="text-muted-foreground mt-2">
          可视化构建和管理多 Agent 协作工作流
        </p>
      </div>

      <Tabs defaultValue="orchestrator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orchestrator" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            实时编排
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            工作流构建
          </TabsTrigger>
          <TabsTrigger value="flowchart" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            流程图
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            协作对话
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orchestrator">
          <MultiAgentOrchestrator />
        </TabsContent>

        <TabsContent value="builder">
          <AgentWorkflowBuilder />
        </TabsContent>

        <TabsContent value="flowchart">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentFlowDiagram />
            <AgentCollaborationChat />
          </div>
        </TabsContent>

        <TabsContent value="collaboration">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AgentCollaborationChat />
            </div>
            <div>
              <MultiAgentOrchestrator />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
