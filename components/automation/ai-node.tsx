import React, { createContext, memo, useContext, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Select, Input } from 'antd';
import { cn } from '@/lib/utils';

const { TextArea } = Input;

/**
 * AI 节点的"默认配置"上下文：编辑页 fetch adminUI 的默认模型后通过 Provider 传入
 * - modelId: adminUI 配置的默认模型（解析后）
 * - models: admin 启用的 provider 下的启用模型列表
 * 新建 AI 节点 / 已存在但未设 model 的节点都优先用这里的 modelId
 */
export interface AdminAIModelOption { id: string; label: string; providerName: string }
export interface EditorAIDefaults {
  modelId: string | null
  models: AdminAIModelOption[]
}
export const EditorAIDefaultsContext = createContext<EditorAIDefaults>({
  modelId: null,
  models: [],
})

// 基础兜底选项（admin 未配置时使用）
const BASE_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: '智能模式 (Auto)' },
  { value: 'qwen-vl-plus', label: 'Qwen VL Plus' },
  { value: 'qwen-vl-max', label: 'Qwen VL Max' },
  { value: 'qwen-plus', label: 'Qwen Plus' },
  { value: 'qwen-max', label: 'Qwen Max' },
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
]

/** 合并基础选项与 admin 配置的模型（按 id 去重，admin 标签优先） */
function mergeModelOptions(adminModels: AdminAIModelOption[]) {
  const seen = new Set<string>()
  const out: { value: string; label: string }[] = []
  for (const m of adminModels) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push({ value: m.id, label: m.providerName ? `${m.label} · ${m.providerName}` : m.label })
  }
  for (const b of BASE_MODEL_OPTIONS) {
    if (seen.has(b.value)) continue
    seen.add(b.value)
    out.push(b)
  }
  return out
}

const AiNode = ({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow()
  const status = data.status as string || 'idle'
  const { modelId: adminModelId, models: adminModels } = useContext(EditorAIDefaultsContext)

  const updateConfig = (key: string, value: any) => {
    updateNodeData(id, {
      config: {
        ...(data.config as object || {}),
        [key]: value
      }
    })
  }

  // 默认值：已配置 > adminUI 默认 > 'qwen-plus' 兜底
  const currentModel = (data.config as any)?.model || adminModelId || 'qwen-plus'
  const modelOptions = useMemo(() => mergeModelOptions(adminModels), [adminModels])

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
              defaultValue={currentModel}
              onChange={(val) => updateConfig('model', val)}
              options={modelOptions}
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
