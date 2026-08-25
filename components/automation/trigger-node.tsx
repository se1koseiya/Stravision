
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Select, Input, Typography } from 'antd';
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
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-slate-400 !border-2 !border-white hover:!bg-slate-700 transition-colors"
      />
      
      {/* 极简单色节点：白底细线、灰色小字类型、选中变蓝 */}
      <div className={cn(
        "w-64 rounded-[10px] bg-white border overflow-hidden transition-all duration-150",
        selected
          ? "border-[#1677ff] shadow-[0_0_0_2px_rgba(22,119,255,0.10),0_4px_12px_rgba(22,119,255,0.08)]"
          : "border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        status === 'running' ? "border-[#1677ff]" : "",
        status === 'completed' ? "border-slate-300" : ""
      )}>
        <div className="px-5 pt-2.5 pb-3 space-y-2">
          <div className="flex items-center justify-between h-3.5">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-medium">触发器</span>
            {status === 'running' && <span className="text-[10px] text-[#1677ff] font-medium">运行中</span>}
          </div>
          <div className="text-[14px] font-medium text-slate-900 leading-snug">
            {data.label}
          </div>
          <div className="nodrag pt-1 space-y-2">
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
                    <div key={d} className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] cursor-pointer hover:bg-slate-100 transition-colors">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-slate-400 !border-2 !border-white hover:!bg-slate-700 transition-colors"
      />
    </div>
  );
};

export default memo(TriggerNode);
