
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Tag, Select, Switch, Typography } from 'antd';
import { Zap, Bell, Wind, Droplets, Sun, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const { Text } = Typography;

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
      "relative group transition-all duration-200",
      status === 'running' && "animate-pulse"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-[#FA8C16] !border-2 !border-white dark:!border-zinc-900 transition-transform hover:scale-125"
      />
      
      {/* 飞书式节点卡片 */}
      <div className={cn(
        "relative w-60 rounded-[10px] bg-white dark:bg-zinc-900 border shadow-sm transition-all duration-200 overflow-hidden",
        selected
          ? "border-[#1677ff] shadow-[0_4px_16px_rgba(22,119,255,0.18)]"
          : "border-slate-200 dark:border-slate-700",
        status === 'running' ? "ring-2 ring-[#1677ff]/25 border-[#1677ff]" : "",
        status === 'completed' ? "border-[#00B96B] bg-[#F6FFED]/70 dark:bg-zinc-900" : ""
      )}>
        {/* 左侧类型色条 */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px]",
          status === 'running' ? "bg-[#1677ff]" : "bg-[#FA8C16]"
        )} />

        {/* 头部 */}
        <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md text-[#FA8C16] shrink-0",
              status === 'running' ? "bg-[#FA8C16]/15" : "bg-[#FA8C16]/10"
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {data.label}
            </span>
          </div>
          <Tag
            bordered={false}
            className="!m-0 !text-[11px] !leading-[18px] !px-1.5 !rounded !bg-[#FFF7E6] !text-[#FA8C16] shrink-0"
          >
            执行
          </Tag>
        </div>

        {/* 配置体 */}
        <div className="px-3 pb-3 space-y-2.5">
          {data.type === 'device' && (
            <>
              <Select
                size="small"
                className="!w-full"
                value={deviceValue}
                onChange={(val) => updateNodeData({ device: val, config: { ...data.config, device: val } })}
                options={[
                  { value: 'fan', label: '排风扇' },
                  { value: 'pump', label: '水泵' },
                  { value: 'light', label: '补光灯' },
                ]}
              />
              
              <div className="flex items-center justify-between">
                <Text type="secondary" className="!text-[11px]">操作状态</Text>
                <div className="flex items-center gap-1.5">
                  <Text type="secondary" className="!text-[11px]">关闭</Text>
                  <Switch
                    size="small"
                    checked={actionValue}
                    onChange={(val) => updateNodeData({ action: val, config: { ...data.config, action: val } })}
                  />
                  <Text type="secondary" className="!text-[11px]">开启</Text>
                </div>
              </div>
            </>
          )}
          
          {data.type === 'notification' && (
            <>
              <Text type="secondary" className="!text-[11px] block">发送通知给</Text>
              <Select
                size="small"
                className="!w-full"
                defaultValue="admin"
                options={[
                  { value: 'admin', label: '管理员' },
                  { value: 'all', label: '所有用户' },
                  { value: 'engineer', label: '技术员' },
                ]}
              />
              <div className="flex items-center gap-1.5">
                <Switch size="small" />
                <Text type="secondary" className="!text-[11px]">高优先级警告</Text>
              </div>
            </>
          )}

          {data.type === 'ai_adjust' && (
            <div className="px-2.5 py-2 bg-[#FFF7E6]/70 dark:bg-[#FA8C16]/10 rounded-md text-[11px] text-[#AD6800] dark:text-amber-300">
              AI 将根据当前环境自动调整下周的种植计划。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ActionNode);
