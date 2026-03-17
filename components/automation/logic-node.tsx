
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitMerge, Clock, Calculator, ArrowRightLeft, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useReactFlow } from '@xyflow/react';

const LogicIcons = {
  condition: GitMerge,
  delay: Clock,
  compare: Calculator,
  range: Maximize,
  default: ArrowRightLeft,
};

const LogicNode = ({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  const Icon = LogicIcons[data.type as keyof typeof LogicIcons] || LogicIcons.default;
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
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      <Card className={cn(
        "w-56 border-2 shadow-sm transition-all duration-300",
        selected ? "border-purple-500 shadow-lg shadow-purple-500/20" : "border-purple-100 dark:border-purple-900",
        status === 'running' ? "ring-2 ring-purple-400 ring-offset-2 border-purple-500" : "",
        status === 'completed' ? "border-purple-500 bg-purple-50/30 dark:bg-purple-900/10" : "",
        "bg-white dark:bg-zinc-900"
      )}>
        <CardHeader className="p-3 pb-2 bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md text-purple-600 dark:text-purple-400 transition-colors",
                status === 'running' ? "bg-purple-200 dark:bg-purple-800 animate-spin" : "bg-purple-100 dark:bg-purple-900/50"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                {data.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status === 'running' && <Badge className="bg-purple-500 text-[10px] h-5 px-1">Processing</Badge>}
              <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-zinc-800 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
                逻辑
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {data.type === 'condition' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Select 
                  defaultValue={(data.config as any)?.operator || "and"} 
                  onValueChange={(val) => updateConfig('operator', val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">且 (AND)</SelectItem>
                    <SelectItem value="or">或 (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {data.type === 'compare' && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                <div className="text-xs text-center text-muted-foreground">输入值</div>
                <Select 
                  defaultValue={(data.config as any)?.operator || "gt"}
                  onValueChange={(val) => updateConfig('operator', val)}
                >
                  <SelectTrigger className="h-8 w-14 text-xs px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">&gt;</SelectItem>
                    <SelectItem value="lt">&lt;</SelectItem>
                    <SelectItem value="eq">=</SelectItem>
                    <SelectItem value="gte">≥</SelectItem>
                    <SelectItem value="lte">≤</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  className="h-8 text-xs" 
                  placeholder="数值" 
                  defaultValue={(data.config as any)?.value || "30"} 
                  onChange={(e) => updateConfig('value', e.target.value)}
                />
              </div>
            </div>
          )}

          {data.type === 'range' && (
            <div className="space-y-2">
               <div className="flex items-center gap-2">
                 <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center w-full">
                    <Input 
                      className="h-8 text-xs text-center" 
                      placeholder="Min" 
                      defaultValue={(data.config as any)?.min || ""} 
                      onChange={(e) => updateConfig('min', e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">&lt; 值 &lt;</span>
                    <Input 
                      className="h-8 text-xs text-center" 
                      placeholder="Max" 
                      defaultValue={(data.config as any)?.max || ""} 
                      onChange={(e) => updateConfig('max', e.target.value)}
                    />
                 </div>
               </div>
            </div>
          )}
          
          {data.type === 'delay' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">等待</span>
              <Input 
                className="h-8 text-xs" 
                defaultValue={(data.config as any)?.duration || "5"} 
                onChange={(e) => updateConfig('duration', e.target.value)}
              />
              <Select 
                defaultValue={(data.config as any)?.unit || "m"}
                onValueChange={(val) => updateConfig('unit', val)}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s">秒</SelectItem>
                  <SelectItem value="m">分钟</SelectItem>
                  <SelectItem value="h">小时</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
    </div>
  );
};

export default memo(LogicNode);
