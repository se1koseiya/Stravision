'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentPerformanceMonitor } from '@/components/admin/agent-performance-monitor';
import { AgentAlertsPanel } from '@/components/admin/agent-alerts-panel';
import { Activity, Bell } from 'lucide-react';

export default function AgentMonitorPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent 监控中心</h1>
        <p className="text-muted-foreground mt-2">
          实时监控 AI Agent 的性能指标和系统告警
        </p>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            性能监控
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            告警管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <AgentPerformanceMonitor />
        </TabsContent>

        <TabsContent value="alerts">
          <AgentAlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
