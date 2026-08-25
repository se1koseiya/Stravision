
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Tag, Select, Input, Typography } from 'antd';
import { Camera, Clock, Activity, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const { Text } = Typography;

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
      "relative group transition-all duration-200",
      status === 'running' && "animate-pulse"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-[#00B96B] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      {/* 飞书式节点卡片（触发器，绿色主题） */}
      <div className={cn(
        "relative w-64 rounded-[10px] bg-white dark:bg-zinc-900 border shadow-sm transition-all duration-200 overflow-hidden",
        selected
          ? "border-[#1677ff] shadow-[0_4px_16px_rgba(22,119,255,0.18)]"
          : "border-slate-200 dark:border-slate-700",
        status === 'running' ? "ring-2 ring-[#1677ff]/25 border-[#1677ff]" : "",
        status === 'completed' ? "border-[#00B96B] bg-[#F6FFED]/70 dark:bg-zinc-900" : ""
      )}>
        {/* 左侧类型色条 */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px]",
          status === 'running' ? "bg-[#1677ff]" : "bg-[#00B96B]"
        )} />

        {/* 头部 */}
        <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md text-[#00B96B] shrink-0",
              status === 'running' ? "bg-[#00B96B]/15" : "bg-[#00B96B]/10"
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {data.label}
            </span>
          </div>
          <Tag
            bordered={false}
            className="!m-0 !text-[11px] !leading-[18px] !px-1.5 !rounded !bg-[#E8FFF5] !text-[#00A870] shrink-0"
          >
            触发器
          </Tag>
        </div>

        {/* 配置体 */}
        <div className="px-3 pb-3 space-y-2">
          {data.type === 'vlm' && (
            <div className="space-y-1.5">
              <Text type="secondary" className="!text-[11px] block">当视觉模型识别到...</Text>
              <Select
                size="small"
                className="!w-full"
                defaultValue="disease"
                options={[
                  { value: 'disease', label: '病害特征' },
                  { value: 'growth', label: '生长阶段' },
                  { value: 'pest', label: '虫害迹象' },
                  { value: 'maturity', label: '果实成熟' },
                ]}
              />
            </div>
          )}
          
          {data.type === 'sensor' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Text type="secondary" className="!text-[10px] block">传感器</Text>
                <Select
                  size="small"
                  className="!w-full"
                  defaultValue={(data.config as any)?.sensor || "temp"}
                  onChange={(val) => updateConfig('sensor', val)}
                  options={[
                    { value: 'temp', label: '空气温度' },
                    { value: 'hum', label: '空气湿度' },
                    { value: 'soil', label: '土壤湿度' },
                    { value: 'co2', label: 'CO2浓度' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="!text-[10px] block">检查频率</Text>
                <Select
                  size="small"
                  className="!w-full"
                  defaultValue={(data.config as any)?.frequency || "5m"}
                  onChange={(val) => updateConfig('frequency', val)}
                  options={[
                    { value: '1m', label: '1分钟' },
                    { value: '5m', label: '5分钟' },
                    { value: '30m', label: '30分钟' },
                  ]}
                />
              </div>
            </div>
          )}

          {data.type === 'schedule' && (
            <div className="space-y-2">
              <Text type="secondary" className="!text-[11px] block">执行时间</Text>
              <Input type="time" size="small" className="!text-xs" defaultValue="08:00" />
              <div className="flex gap-1 flex-wrap">
                {['一','二','三','四','五','六','日'].map(d => (
                  <div key={d} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] cursor-pointer hover:bg-[#00B96B]/15 hover:text-[#00A870] transition-colors">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-[#00B96B] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
    </div>
  );
};

export default memo(TriggerNode);
