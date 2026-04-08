"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bolt, Save, Edit, Play, Check, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AutomationStrategyCardProps {
  strategy: {
    nodes: any[];
    edges: any[];
  };
  description?: string;
  onSave?: (ruleId: string) => void;
}

export function AutomationStrategyCard({ strategy, description, onSave }: AutomationStrategyCardProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ruleId, setRuleId] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: description || '由 AI 助手生成的自动化策略',
          description: description || '',
          graph_data: strategy,
          trigger_type: strategy.nodes.find((n: any) => n.type === 'triggerNode')?.data?.type || 'manual',
          is_active: true
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }

      setSaved(true);
      setRuleId(data.data.id);
      toast.success('自动化策略已保存', {
        description: '策略已激活，系统将自动执行',
        duration: 3000
      });
      
      if (onSave) {
        onSave(data.data.id);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph_data: strategy,
          force: true
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || '执行失败');
      }

      const actionCount = data.actions?.length || 0;
      if (actionCount > 0) {
        toast.success('执行成功', {
          description: `已执行 ${actionCount} 个动作`,
          duration: 3000
        });
      } else {
        toast.info('执行完成', {
          description: data.message || '当前条件未触发任何动作',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Execute error:', error);
      toast.error('执行失败', {
        description: error instanceof Error ? error.message : '未知错误',
        duration: 5000
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEdit = () => {
    if (ruleId) {
      router.push(`/automation/editor?id=${ruleId}`);
    } else {
      // 临时保存到 sessionStorage，然后跳转到编辑器
      sessionStorage.setItem('temp_automation_strategy', JSON.stringify(strategy));
      router.push('/automation/editor?from=ai-assistant');
    }
  };

  const nodeCount = strategy.nodes?.length || 0;
  const triggerNodes = strategy.nodes?.filter((n: any) => n.type === 'triggerNode') || [];
  const actionNodes = strategy.nodes?.filter((n: any) => n.type === 'actionNode') || [];

  return (
    <Card className="my-4 border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400">
              <Bolt className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                自动化策略
                {saved && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                    <Check className="w-3 h-3 mr-1" />
                    已保存
                  </Badge>
                )}
              </CardTitle>
              {description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 策略概览 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/60 dark:bg-zinc-900/40 rounded-lg p-3 border border-green-100 dark:border-green-900/50">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">节点总数</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{nodeCount}</div>
          </div>
          <div className="bg-white/60 dark:bg-zinc-900/40 rounded-lg p-3 border border-green-100 dark:border-green-900/50">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">触发器</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{triggerNodes.length}</div>
          </div>
          <div className="bg-white/60 dark:bg-zinc-900/40 rounded-lg p-3 border border-green-100 dark:border-green-900/50">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">动作</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{actionNodes.length}</div>
          </div>
        </div>

        {/* 节点预览 */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">策略流程</div>
          <div className="flex flex-wrap gap-2">
            {strategy.nodes?.slice(0, 5).map((node: any, i: number) => (
              <Badge 
                key={i} 
                variant="outline" 
                className={cn(
                  "text-xs",
                  node.type === 'triggerNode' && "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
                  node.type === 'logicNode' && "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
                  node.type === 'actionNode' && "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                )}
              >
                {node.data?.label || node.type}
              </Badge>
            ))}
            {nodeCount > 5 && (
              <Badge variant="outline" className="text-xs">
                +{nodeCount - 5} 更多
              </Badge>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          {!saved ? (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存策略
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleEdit}
              variant="outline"
              className="flex-1 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              查看详情
            </Button>
          )}
          
          <Button
            onClick={handleEdit}
            variant="outline"
            className="border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30"
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
          
          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            variant="outline"
            className="border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            测试运行
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
