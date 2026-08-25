
import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Select, Switch, Typography } from 'antd';
import { cn } from '@/lib/utils';

const { Text } = Typography;

const ActionNode = ({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();
  const status = data.status as string || 'idle';

  const updateNodeData = (newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const deviceValue = data.config?.device || data.device || 'fan';
  const actionValue = data.config?.action !== undefined ? data.config.action : (data.action !== undefined ? data.action : true);

  return (
    <div className="relative group">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-slate-400 !border-2 !border-white hover:!bg-slate-700 transition-colors"
      />
      
      {/* 极简单色节点 */}
      <div className={cn(
        "w-60 rounded-[10px] bg-white border overflow-hidden transition-all duration-150",
        selected
          ? "border-[#1677ff] shadow-[0_0_0_2px_rgba(22,119,255,0.10),0_4px_12px_rgba(22,119,255,0.08)]"
          : "border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        status === 'running' ? "border-[#1677ff]" : "",
        status === 'completed' ? "border-slate-300" : ""
      )}>
        <div className="px-5 pt-2.5 pb-3 space-y-2">
          <div className="flex items-center justify-between h-3.5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-400 font-medium">
              <svg viewBox="0 0 10 10" className="w-2 h-2 fill-slate-400"><path d="M2 1 L9 5 L2 9 Z" /></svg>
              执行
            </span>
            {status === 'running' && <span className="text-[10px] text-[#1677ff] font-medium">运行中</span>}
          </div>
          <div className="text-[14px] font-medium text-slate-900 leading-snug">
            {data.label}
          </div>
          <div className="nodrag pt-1 space-y-2.5">
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
              <div className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500">
                AI 将根据当前环境自动调整下周的种植计划。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ActionNode);
