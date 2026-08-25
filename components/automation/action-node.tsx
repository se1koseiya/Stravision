
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Bell, Wind, Droplets, Sun, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ActionIcons = {
  device: Zap,
  notification: Bell,
  ai_adjust: MessageSquare,
  default: Zap,
};

const ActionNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const Icon = ActionIcons[data.type as keyof typeof ActionIcons] || ActionIcons.default;
  const status = data.status as string || 'idle';

  const updateNodeData = (newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  };

  const deviceValue = data.config?.device || data.device || 'fan';
  const actionValue = data.config?.action !== undefined ? data.config.action : (data.action !== undefined ? data.action : true);

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      selected ? "scale-105" : "",
      status === 'running' && "animate-pulse"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      <Card className={cn(
        "w-60 border shadow-sm transition-all duration-300",
        selected ? "border-[#0052D9] ring-1 ring-[#0052D9]/20 shadow-[0_4px_16px_rgba(0,82,217,0.15)]" : "border-green-100 dark:border-green-900",
        status === 'running' ? "ring-2 ring-green-400 ring-offset-2 border-green-500" : "",
        status === 'completed' ? "border-green-500 bg-green-50/30 dark:bg-green-900/10" : "",
        "bg-white dark:bg-zinc-900"
      )}>
        <CardHeader className="p-3 pb-2 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/60 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md text-green-600 dark:text-green-400 transition-colors",
                status === 'running' ? "bg-green-200 dark:bg-green-800 animate-spin" : "bg-green-100 dark:bg-green-900/50"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {data.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status === 'running' && <Badge className="bg-green-500 text-[10px] h-5 px-1">Active</Badge>}
              <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-zinc-800 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
                执行
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {data.type === 'device' && (
            <div className="space-y-3">
              <Select 
                value={deviceValue} 
                onValueChange={(val) => updateNodeData({ device: val, config: { ...data.config, device: val } })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择设备" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fan">
                    <div className="flex items-center gap-2"><Wind className="w-3 h-3"/> 排风扇</div>
                  </SelectItem>
                  <SelectItem value="pump">
                    <div className="flex items-center gap-2"><Droplets className="w-3 h-3"/> 水泵</div>
                  </SelectItem>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2"><Sun className="w-3 h-3"/> 补光灯</div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">操作状态</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs">关闭</span>
                  <Switch 
                    checked={actionValue} 
                    onCheckedChange={(val) => updateNodeData({ action: val, config: { ...data.config, action: val } })}
                    className="scale-75" 
                  />
                  <span className="text-xs">开启</span>
                </div>
              </div>
            </div>
          )}
          
          {data.type === 'notification' && (
            <div className="space-y-2">
               <div className="text-xs text-muted-foreground">发送通知给</div>
               <Select defaultValue="admin">
                 <SelectTrigger className="h-8 text-xs">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="admin">管理员</SelectItem>
                   <SelectItem value="all">所有用户</SelectItem>
                   <SelectItem value="engineer">技术员</SelectItem>
                 </SelectContent>
               </Select>
               <div className="flex items-center gap-2 mt-1">
                 <Switch className="scale-75" />
                 <Label className="text-xs text-muted-foreground">高优先级警告</Label>
               </div>
            </div>
          )}

          {data.type === 'ai_adjust' && (
             <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-xs text-green-800 dark:text-green-300">
               AI 将根据当前环境自动调整下周的种植计划。
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(ActionNode);
