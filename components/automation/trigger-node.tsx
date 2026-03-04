
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Clock, Activity, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const TriggerIcons = {
  vlm: Camera,
  sensor: Activity,
  schedule: Clock,
  default: Settings2,
};

const TriggerNode = ({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  const Icon = TriggerIcons[data.type as keyof typeof TriggerIcons] || TriggerIcons.default;
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
      <Card className={cn(
        "w-64 border-2 shadow-sm transition-all duration-300",
        selected ? "border-green-500 shadow-lg shadow-green-500/20" : "border-green-100 dark:border-green-900",
        status === 'running' ? "ring-2 ring-green-400 ring-offset-2 border-green-500" : "",
        status === 'completed' ? "border-green-500 bg-green-50/30 dark:bg-green-900/10" : "",
        "bg-white dark:bg-zinc-900"
      )}>
        <CardHeader className="p-3 pb-2 bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md text-green-600 dark:text-green-400 transition-colors",
                status === 'running' ? "bg-green-200 dark:bg-green-800 animate-spin" : "bg-green-100 dark:bg-green-900/50"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-green-900 dark:text-green-100">
                {data.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status === 'running' && <Badge className="bg-green-500 text-[10px] h-5 px-1">Active</Badge>}
              <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-zinc-800 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
                触发器
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {data.type === 'vlm' && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">当视觉模型识别到...</div>
              <Select defaultValue="disease">
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择识别目标" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disease">病害特征</SelectItem>
                  <SelectItem value="growth">生长阶段</SelectItem>
                  <SelectItem value="pest">虫害迹象</SelectItem>
                  <SelectItem value="maturity">果实成熟</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {data.type === 'sensor' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">传感器</Label>
                  <Select 
                    defaultValue={(data.config as any)?.sensor || "temp"}
                    onValueChange={(val) => updateConfig('sensor', val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temp">空气温度</SelectItem>
                      <SelectItem value="hum">空气湿度</SelectItem>
                      <SelectItem value="soil">土壤湿度</SelectItem>
                      <SelectItem value="co2">CO2浓度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">检查频率</Label>
                  <Select 
                    defaultValue={(data.config as any)?.frequency || "5m"}
                    onValueChange={(val) => updateConfig('frequency', val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1分钟</SelectItem>
                      <SelectItem value="5m">5分钟</SelectItem>
                      <SelectItem value="30m">30分钟</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {data.type === 'schedule' && (
             <div className="space-y-2">
               <div className="text-xs text-muted-foreground">执行时间</div>
               <Input type="time" className="h-8 text-xs" defaultValue="08:00" />
               <div className="flex gap-1 flex-wrap">
                 {['一','二','三','四','五','六','日'].map(d => (
                   <div key={d} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] cursor-pointer hover:bg-green-100 hover:text-green-600 transition-colors">
                     {d}
                   </div>
                 ))}
               </div>
             </div>
          )}
        </CardContent>
      </Card>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
    </div>
  );
};

export default memo(TriggerNode);
