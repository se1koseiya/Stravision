
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Select, Input, Typography } from 'antd';
import { cn } from '@/lib/utils';

const { Text } = Typography;

const LogicNode = ({ id, data, selected }: NodeProps) => {
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
      
      {/* 极简单色节点 */}
      <div className={cn(
        "w-56 rounded-[10px] bg-white border overflow-hidden transition-all duration-150",
        selected
          ? "border-[#1677ff] shadow-[0_0_0_2px_rgba(22,119,255,0.10),0_4px_12px_rgba(22,119,255,0.08)]"
          : "border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        status === 'running' ? "border-[#1677ff]" : "",
        status === 'completed' ? "border-slate-300" : ""
      )}>
        <div className="px-5 pt-2.5 pb-3 space-y-2">
          <div className="flex items-center justify-between h-3.5">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-medium">逻辑</span>
            {status === 'running' && <span className="text-[10px] text-[#1677ff] font-medium">运行中</span>}
          </div>
          <div className="text-[14px] font-medium text-slate-900 leading-snug">
            {data.label}
          </div>
          <div className="nodrag pt-1 space-y-2">
            {data.type === 'condition' && (
              <Select
                size="small"
                className="!w-full"
                defaultValue={(data.config as any)?.operator || "and"}
                onChange={(val) => updateConfig('operator', val)}
                options={[
                  { value: 'and', label: '且 (AND)' },
                  { value: 'or', label: '或 (OR)' },
                ]}
              />
            )}
            
            {data.type === 'compare' && (
              <div className="flex items-center gap-1.5">
                <Text type="secondary" className="!text-[11px] whitespace-nowrap">输入值</Text>
                <Select
                  size="small"
                  className="!w-[64px]"
                  defaultValue={(data.config as any)?.operator || "gt"}
                  onChange={(val) => updateConfig('operator', val)}
                  options={[
                    { value: 'gt', label: '>' },
                    { value: 'lt', label: '<' },
                    { value: 'eq', label: '=' },
                    { value: 'gte', label: '≥' },
                    { value: 'lte', label: '≤' },
                  ]}
                />
                <Input
                  size="small"
                  className="!text-xs"
                  placeholder="数值"
                  defaultValue={(data.config as any)?.value || "30"}
                  onChange={(e) => updateConfig('value', e.target.value)}
                />
              </div>
            )}

            {data.type === 'range' && (
              <div className="flex items-center gap-1.5">
                <Input
                  size="small"
                  className="!text-xs text-center"
                  placeholder="Min"
                  defaultValue={(data.config as any)?.min || ""}
                  onChange={(e) => updateConfig('min', e.target.value)}
                />
                <Text type="secondary" className="!text-[11px] whitespace-nowrap">&lt; 值 &lt;</Text>
                <Input
                  size="small"
                  className="!text-xs text-center"
                  placeholder="Max"
                  defaultValue={(data.config as any)?.max || ""}
                  onChange={(e) => updateConfig('max', e.target.value)}
                />
              </div>
            )}
            
            {data.type === 'delay' && (
              <div className="flex items-center gap-1.5">
                <Text type="secondary" className="!text-[11px] whitespace-nowrap">等待</Text>
                <Input
                  size="small"
                  className="!text-xs"
                  defaultValue={(data.config as any)?.duration || "5"}
                  onChange={(e) => updateConfig('duration', e.target.value)}
                />
                <Select
                  size="small"
                  className="!w-[76px]"
                  defaultValue={(data.config as any)?.unit || "m"}
                  onChange={(val) => updateConfig('unit', val)}
                  options={[
                    { value: 's', label: '秒' },
                    { value: 'm', label: '分钟' },
                    { value: 'h', label: '小时' },
                  ]}
                />
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

export default memo(LogicNode);
