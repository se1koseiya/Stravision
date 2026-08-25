import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Tag, Select, Input } from 'antd';
import { Sparkles, Bot, BrainCircuit, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

const { TextArea } = Input;

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
      "relative group transition-all duration-200",
      status === 'running' && "animate-pulse"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-[#1677ff] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      {/* 飞书式节点卡片（AI 节点，蓝色主题） */}
      <div className={cn(
        "relative w-72 rounded-[10px] bg-white dark:bg-zinc-900 border shadow-sm transition-all duration-200 overflow-hidden",
        selected
          ? "border-[#1677ff] shadow-[0_4px_16px_rgba(22,119,255,0.18)]"
          : "border-slate-200 dark:border-slate-700",
        status === 'running' ? "ring-2 ring-[#1677ff]/25 border-[#1677ff]" : "",
        status === 'completed' ? "border-[#00B96B] bg-[#F6FFED]/70 dark:bg-zinc-900" : ""
      )}>
        {/* 左侧类型色条 */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px]",
          status === 'running' ? "bg-[#1677ff]" : "bg-[#1677ff]"
        )} />

        {/* 头部 */}
        <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md text-[#1677ff] shrink-0",
              status === 'running' ? "bg-[#1677ff]/15" : "bg-[#1677ff]/10"
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {data.label}
            </span>
          </div>
          <Tag
            bordered={false}
            className="!m-0 !text-[11px] !leading-[18px] !px-1.5 !rounded !bg-[#E6F4FF] !text-[#1677ff] shrink-0"
          >
            AI Agent
          </Tag>
        </div>

        {/* 配置体 */}
        <div className="px-3 pb-3 space-y-2">
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
            className="!text-xs !rounded-md !bg-slate-50 dark:!bg-zinc-800/60 !border-slate-200 dark:!border-slate-700 focus:!border-[#1677ff]"
            placeholder="输入 Prompt 提示词..."
            defaultValue={(data.config as any)?.prompt || ""}
            onChange={(e) => updateConfig('prompt', e.target.value)}
          />
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-[#1677ff] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
    </div>
  );
};

export default memo(AiNode);
