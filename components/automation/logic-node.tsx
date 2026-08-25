
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Tag, Select, Input, Typography } from 'antd';
import { GitMerge, Clock, Calculator, ArrowRightLeft, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';

const { Text } = Typography;

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
      "relative group transition-all duration-200",
      status === 'running' && "animate-pulse"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-[#722ED1] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      {/* 飞书式节点卡片：白底 + 1px 边框 + 左侧类型色条 */}
      <div className={cn(
        "relative w-56 rounded-[10px] bg-white dark:bg-zinc-900 border shadow-sm transition-all duration-200 overflow-hidden",
        selected
          ? "border-[#1677ff] shadow-[0_4px_16px_rgba(22,119,255,0.18)]"
          : "border-slate-200 dark:border-slate-700",
        status === 'running' ? "ring-2 ring-[#1677ff]/25 border-[#1677ff]" : "",
        status === 'completed' ? "border-[#00B96B] bg-[#F6FFED]/70 dark:bg-zinc-900" : ""
      )}>
        {/* 左侧类型色条 */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px]",
          status === 'running' ? "bg-[#1677ff]" : "bg-[#722ED1]"
        )} />

        {/* 头部：图标 + 标题 + 类型标签 */}
        <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md text-[#722ED1] shrink-0",
              status === 'running' ? "bg-[#722ED1]/15" : "bg-[#722ED1]/10"
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {data.label}
            </span>
          </div>
          <Tag
            bordered={false}
            className="!m-0 !text-[11px] !leading-[18px] !px-1.5 !rounded !bg-[#F6F0FF] !text-[#722ED1] shrink-0"
          >
            逻辑
          </Tag>
        </div>

        {/* 配置体 */}
        <div className="px-3 pb-3 space-y-2">
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
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-[#722ED1] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
    </div>
  );
};

export default memo(LogicNode);
