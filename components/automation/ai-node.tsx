import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Select, Input } from 'antd';
import { cn } from '@/lib/utils';

const { TextArea } = Input;

const AiNode = ({ id, data, selected }: NodeProps) => {
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
        "w-72 rounded-[10px] bg-white border overflow-hidden transition-all duration-150",
        selected
          ? "border-[#1677ff] shadow-[0_0_0_2px_rgba(22,119,255,0.10),0_4px_12px_rgba(22,119,255,0.08)]"
          : "border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        status === 'running' ? "border-[#1677ff]" : "",
        status === 'completed' ? "border-slate-300" : ""
      )}>
        <div className="px-5 pt-2.5 pb-3 space-y-2">
          <div className="flex items-center justify-between h-3.5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-400 font-medium">
              <svg viewBox="0 0 10 10" className="w-2 h-2 stroke-slate-400 fill-none" strokeWidth="1.2"><path d="M5 0 L10 5 L5 10 L0 5 Z" /></svg>
              AI Agent
            </span>
            {status === 'running' && <span className="text-[10px] text-[#1677ff] font-medium">运行中</span>}
          </div>
          <div className="text-[14px] font-medium text-slate-900 leading-snug">
            {data.label}
          </div>
          <div className="nodrag pt-1 space-y-2">
            <Select
              size="small"
              className="!w-full"
              defaultValue={(data.config as any)?.model || "qwen-plus"}
              onChange={(val) => updateConfig('model', val)}
              options={[
                { value: 'auto', label: '智能模式 (Auto)' },
                { value: 'qwen-vl-plus', label: 'Qwen VL Plus' },
                { value: 'qwen-vl-max', label: 'Qwen VL Max' },
                { value: 'qwen-plus', label: 'Qwen Plus' },
                { value: 'qwen-max', label: 'Qwen Max' },
                { value: 'deepseek-r1', label: 'DeepSeek R1' },
              ]}
            />
            
            <TextArea
              rows={2}
              className="!text-xs !rounded-md !border-slate-200 focus:!border-[#1677ff]"
              placeholder="输入 Prompt 提示词..."
              defaultValue={(data.config as any)?.prompt || ""}
              onChange={(e) => updateConfig('prompt', e.target.value)}
            />
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

export default memo(AiNode);
