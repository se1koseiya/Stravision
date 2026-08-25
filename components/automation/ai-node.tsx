import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Bot, BrainCircuit, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReactFlow } from '@xyflow/react';

const AiIcons = {
  process: BrainCircuit,
  analyze: Sparkles,
  generate: Bot,
  chat: MessageSquareText,
  default: Sparkles,
};

const AiNode = ({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  const Icon = AiIcons[data.type as keyof typeof AiIcons] || AiIcons.default;
  const status = data.status as string || 'idle';

  const updateConfig = (key: string, value: any) => {
    updateNodeData(id, { 
      config: { 
        ...(data.config as object || {}), 
        [key]: value 
      } 
    });
  };

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      selected ? "scale-105" : "",
      status === 'running' && "animate-pulse"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      <Card className={cn(
        "w-72 border shadow-sm transition-all duration-300",
        selected ? "border-[#0052D9] ring-1 ring-[#0052D9]/20 shadow-[0_4px_16px_rgba(0,82,217,0.15)]" : "border-indigo-100 dark:border-indigo-900",
        status === 'running' ? "ring-2 ring-indigo-400 ring-offset-2 border-indigo-500" : "",
        status === 'completed' ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10" : "",
        "bg-white dark:bg-zinc-900"
      )}>
        <CardHeader className="p-3 pb-2 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md text-indigo-600 dark:text-indigo-400 transition-colors",
                status === 'running' ? "bg-indigo-200 dark:bg-indigo-800 animate-spin" : "bg-indigo-100 dark:bg-indigo-900/50"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {data.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status === 'running' && <Badge className="bg-indigo-500 text-[10px] h-5 px-1">Processing</Badge>}
              <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-zinc-800 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                AI Agent
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="space-y-2">
            <Select 
              defaultValue={(data.config as any)?.model || "qwen-plus"}
              onValueChange={(val) => updateConfig('model', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">智能模式 (Auto)</SelectItem>
                <SelectItem value="qwen-vl-plus">Qwen VL Plus</SelectItem>
                <SelectItem value="qwen-vl-max">Qwen VL Max</SelectItem>
                <SelectItem value="qwen-plus">Qwen Plus</SelectItem>
                <SelectItem value="qwen-max">Qwen Max</SelectItem>
                <SelectItem value="deepseek-r1">DeepSeek R1</SelectItem>
              </SelectContent>
            </Select>
            
            <Textarea 
              className="min-h-[60px] text-xs resize-none bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50 focus-visible:ring-indigo-400" 
              placeholder="输入 Prompt 提示词..."
              defaultValue={(data.config as any)?.prompt || ""}
              onChange={(e) => updateConfig('prompt', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-indigo-500 !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
    </div>
  );
};

export default memo(AiNode);
