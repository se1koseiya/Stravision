"use client"

import { useState, useEffect, useCallback } from "react"
import { Button, Input, InputNumber, Switch, Card, Select, Tag, Tabs, Modal, Typography, Space, Checkbox, Badge as AntdBadge } from 'antd'
import type { SizeType } from 'antd/es/config-provider/SizeContext'
import { toast } from "@/lib/ui/feedback"
import { IconBookOpen, IconBox, IconBrain, IconCamera, IconCheck, IconClose, IconCpu, IconCurrency, IconDelete, IconDot, IconGlobe, IconKey, IconLightning, IconLink, IconLoading, IconMagic, IconPencil, IconPlus, IconPreviewClose, IconPreviewOpen, IconRight, IconServer, IconSort, IconStar } from "@/components/icon";
// 模型品牌图标（@lobehub/icons：Qwen/DeepSeek/Kimi/智谱/MiniMax/OpenAI/Claude/Gemini/Grok 等）
import {
  Qwen, DeepSeek, Moonshot, Zhipu, Minimax, OpenAI,
  Claude, Gemini, Grok, Mistral, Glama, Gemma, Hunyuan, Doubao, Spark,
  Kimi, XiaomiMiMo, SiliconCloud, OpenRouter, Ollama, Groq,
  Wenxin, Stepfun, ZeroOne, SenseNova, LongCat, Nvidia, Perplexity,
  ModelScope, Huawei, Baichuan, InternLM, Tiangong, GiteeAI, PPIO,
  Together, Fireworks, DeepInfra, Novita, Azure, Bedrock, VertexAI,
} from "@lobehub/icons"

// ====== 类型 ======

export interface ProviderModel {
  id: string
  name: string
  description?: string
  icon?: string
  enabled: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  supportsEmbedding?: boolean
  maxTokens?: number
  contextWindow?: number
  /** 积分倍率（相对基准的计费倍数；未设置按模型名启发式） */
  rateMultiplier?: number
}

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom' | 'glm' | 'moonshot'
  baseUrl: string
  apiKey: string
  models: ProviderModel[]
  enabled: boolean
  isDefault?: boolean
  priority: number
  createdAt?: string
  updatedAt?: string
}

// ====== 图标映射 ======

/** lobehub 复合图标：本体（单色）+ 可选 `.Color` 彩色变体 */
type BrandIcon = React.ComponentType<{ size?: number }> & {
  Color?: React.ComponentType<{ size?: number }>
}

// 品牌图标渲染（自动回退 .Color 变体；lobehub 组件可能只有彩色或只有单色）
const brandIcon = (C: BrandIcon, size: number) => {
  const Comp = C.Color || C
  return <Comp size={size} />
}

/** key → lobehub 品牌组件（尺寸由调用处决定：14 = 模型标签 / 18 = 供应商卡片） */
const MODEL_ICON_COMPONENTS: Record<string, BrandIcon> = {
  qwen: Qwen,
  deepseek: DeepSeek,
  moonshot: Moonshot,
  kimi: Kimi,
  zhipu: Zhipu,
  minimax: Minimax,
  openai: OpenAI,
  claude: Claude,
  gemini: Gemini,
  grok: Grok,
  mistral: Mistral,
  llama: Glama,
  gemma: Gemma,
  hunyuan: Hunyuan,
  doubao: Doubao,
  spark: Spark,
  xiaomi: XiaomiMiMo,
  siliconflow: SiliconCloud,
}

/** 可选模型图标 key（admin 模型编辑器的图标选择器） */
export const MODEL_ICON_KEYS = [
  'qwen', 'deepseek', 'moonshot', 'kimi', 'zhipu', 'minimax', 'openai',
  'claude', 'gemini', 'grok', 'mistral', 'llama', 'gemma',
  'hunyuan', 'doubao', 'spark', 'xiaomi', 'siliconflow', 'sparkles',
] as const

const MODEL_ICON_MAP: Record<string, React.ReactNode> = {
  ...Object.fromEntries(
    Object.entries(MODEL_ICON_COMPONENTS).map(([k, C]) => [k, brandIcon(C, 14)])
  ),
  sparkles: <IconMagic size={14} />,
}

const MODEL_ICON_NAMES: Record<string, string> = {
  qwen: '通义千问', deepseek: 'DeepSeek', moonshot: 'Kimi', kimi: 'Kimi',
  zhipu: '智谱', minimax: 'MiniMax', openai: 'OpenAI', claude: 'Claude',
  gemini: 'Gemini', grok: 'Grok', mistral: 'Mistral', llama: 'Glama',
  gemma: 'Gemma', hunyuan: '混元', doubao: '豆包', spark: '讯飞星火',
  xiaomi: '小米 MIMO', siliconflow: '硅基流动', sparkles: '通用',
}

function getModelIcon(icon?: string) {
  return MODEL_ICON_MAP[icon || ''] || <IconDot size={14} />
}

/**
 * 供应商 logo + 厂商名的识别表（2026-10-12 用户反馈）
 *
 * ── 为什么有它 ──
 * 供应商行原本挂「协议类型图标」（brain / robot / globe）：一屏不是脑就是机器人，
 * 用户根本分不清哪家是哪家。改成**真实供应商 logo**，识别不到的用**立方体**兜底
 * （不猜、不硬塞别家 logo，也不退回通用图标）。`label` 同时用作战「厂商」副标题
 * （对照参考版式：`DeepSeek-V4 Flash  深度求索` / `xxx  自定义`）。
 *
 * ── 识别只认「用户自己写的名字 + 服务地址」 ──
 * `type` 是**协议**（openai / glm / moonshot），不是厂商，拿来认品牌会把
 * 「OpenAI 兼容中转站」全判成 OpenAI，所以刻意不参与匹配。
 * 命中不了名字/域名时再退到模型清单的品牌 icon 键（自建中转站常见：名字随便起、
 * 模型全是 deepseek），且**必须所有模型指向同一品牌**才敢认。
 */
const PROVIDER_BRAND_RULES: Array<{ re: RegExp; C: BrandIcon; label: string }> = [
  { re: /siliconflow|siliconcloud|硅基流动|轨迹流动/, C: SiliconCloud, label: '硅基流动' },
  { re: /deepseek/, C: DeepSeek, label: 'DeepSeek' },
  { re: /moonshot|kimi|月之暗面/, C: Moonshot, label: '月之暗面' },
  { re: /bigmodel|zhipu|chatglm|智谱/, C: Zhipu, label: '智谱' },
  { re: /dashscope|bailian|aliyun|aliyuncs|qwen|通义|千问/, C: Qwen, label: '通义千问' },
  { re: /minimax|abab/, C: Minimax, label: 'MiniMax' },
  { re: /anthropic|claude/, C: Claude, label: 'Anthropic' },
  { re: /googleapis|generativelanguage|gemini/, C: Gemini, label: 'Google' },
  { re: /openai|chatgpt|gpt-/, C: OpenAI, label: 'OpenAI' },
  { re: /mistral/, C: Mistral, label: 'Mistral' },
  { re: /hunyuan|混元|tencent|腾讯/, C: Hunyuan, label: '腾讯混元' },
  { re: /volces|volcengine|doubao|豆包|火山/, C: Doubao, label: '火山引擎' },
  { re: /spark|xfyun|iflytek|讯飞/, C: Spark, label: '讯飞星火' },
  { re: /xiaomi|mimo|小米/, C: XiaomiMiMo, label: '小米' },
  { re: /openrouter/, C: OpenRouter, label: 'OpenRouter' },
  { re: /groq/, C: Groq, label: 'Groq' },
  { re: /ollama|11434/, C: Ollama, label: 'Ollama' },
  { re: /bedrock/, C: Bedrock, label: 'Bedrock' },
  { re: /azure/, C: Azure, label: 'Azure' },
  { re: /vertex/, C: VertexAI, label: 'Vertex AI' },
  { re: /baidu|wenxin|文心|qianfan|千帆/, C: Wenxin, label: '百度文心' },
  { re: /stepfun|阶跃/, C: Stepfun, label: '阶跃星辰' },
  { re: /zeroone|01\.ai|零一万物/, C: ZeroOne, label: '零一万物' },
  { re: /sensetime|sensenova|商汤|日日新/, C: SenseNova, label: '商汤' },
  { re: /longcat|美团/, C: LongCat, label: '美团' },
  { re: /nvidia|nemotron/, C: Nvidia, label: 'NVIDIA' },
  { re: /perplexity|sonar/, C: Perplexity, label: 'Perplexity' },
  { re: /modelscope|魔搭/, C: ModelScope, label: '魔搭' },
  { re: /huawei|盘古|pangu/, C: Huawei, label: '华为' },
  { re: /baichuan|百川/, C: Baichuan, label: '百川智能' },
  { re: /internlm|书生/, C: InternLM, label: '书生' },
  { re: /tiangong|天工/, C: Tiangong, label: '天工' },
  { re: /gitee/, C: GiteeAI, label: 'Gitee AI' },
  { re: /ppio|派欧/, C: PPIO, label: 'PPIO' },
  { re: /together/, C: Together, label: 'Together' },
  { re: /fireworks/, C: Fireworks, label: 'Fireworks' },
  { re: /deepinfra/, C: DeepInfra, label: 'DeepInfra' },
  { re: /novita/, C: Novita, label: 'Novita' },
  { re: /x\.ai|\bxai\b|grok/, C: Grok, label: 'xAI' },
]

/** 供应商 logo：命中品牌 → 品牌图标 + 厂商名；否则 → 立方体 + 「自定义」 */
export function resolveProviderBrand(
  provider: Pick<AIProvider, 'name' | 'baseUrl' | 'models'>
): { node: React.ReactNode; isBrand: boolean; label: string } {
  const hay = `${provider.name || ''} ${provider.baseUrl || ''}`.toLowerCase()
  for (const r of PROVIDER_BRAND_RULES) {
    if (r.re.test(hay)) return { node: brandIcon(r.C, 18), isBrand: true, label: r.label }
  }
  // 名字/域名都没线索时，看模型清单：**每个模型都带 icon、且指向同一个品牌**才算数
  // （过滤掉没 icon 的模型只会把「一半 deepseek 一半通用」误判成「全是 deepseek」，所以按全量比）
  const models = provider.models || []
  const icons = models.map(m => m.icon).filter((k): k is string => !!k)
  if (
    icons.length > 0 &&
    icons.length === models.length &&
    icons.every(k => k === icons[0]) &&
    !!MODEL_ICON_COMPONENTS[icons[0]]
  ) {
    return {
      node: brandIcon(MODEL_ICON_COMPONENTS[icons[0]], 18),
      isBrand: true,
      label: MODEL_ICON_NAMES[icons[0]] || '自定义',
    }
  }
  return { node: <IconBox size={18} />, isBrand: false, label: '自定义' }
}

// ====== 预设模板 ======

const PRESET_TEMPLATES = [
  {
    id: 'xiaomi-mimo',
    name: '小米 MIMO',
    type: 'openai' as const,
    baseUrl: 'https://api.xiaomi.com/v1',
    models: [
      { id: 'mimo-v1', name: 'MIMO-V1', description: '小米大语言模型', icon: 'xiaomi', enabled: true, supportsVision: true, supportsReasoning: false },
    ],
  },
  {
    id: 'openai-official',
    name: 'OpenAI 官方',
    type: 'openai' as const,
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '多模态旗舰', icon: 'openai', enabled: true, supportsVision: true, supportsReasoning: false },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量高效', icon: 'openai', enabled: true, supportsVision: true, supportsReasoning: false },
      { id: 'o1', name: 'o1', description: '推理模型', icon: 'openai', enabled: true, supportsVision: false, supportsReasoning: true },
      { id: 'o3-mini', name: 'o3-mini', description: '轻量推理', icon: 'openai', enabled: true, supportsVision: false, supportsReasoning: true },
    ],
  },
  {
    id: 'deepseek-custom',
    name: 'DeepSeek 官方',
    type: 'openai' as const,
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '通用对话', icon: 'deepseek', enabled: true, supportsVision: false, supportsReasoning: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '推理增强', icon: 'deepseek', enabled: true, supportsVision: false, supportsReasoning: true },
    ],
  },
  {
    // 智谱 AI BigModel 平台 (https://docs.bigmodel.cn/cn/api/introduction)
    id: 'zhipu-glm-preset',
    name: '智谱 GLM (BigModel)',
    type: 'glm' as const,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4.6',           name: 'GLM-4.6',           description: '最新旗舰，200K 上下文，支持思考',  icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 200000 },
      { id: 'glm-4.5',           name: 'GLM-4.5',           description: '智能体基础模型',                  icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 128000 },
      { id: 'glm-4.5-air',       name: 'GLM-4.5-Air',       description: '轻量智能体模型',                  icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 128000 },
      { id: 'glm-4.5-flash',     name: 'GLM-4.5-Flash',     description: '免费超快模型',                    icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
      { id: 'glm-4-plus',        name: 'GLM-4-Plus',        description: '上一代旗舰',                      icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
      { id: 'glm-4-long',        name: 'GLM-4-Long',        description: '超长上下文 1M',                    icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: false, contextWindow: 1000000 },
      { id: 'glm-4v-plus',       name: 'GLM-4V-Plus',       description: '视觉语言模型',                    icon: 'zhipu', enabled: true, supportsVision: true,  supportsReasoning: false, contextWindow: 8000 },
      { id: 'glm-4v-flash',      name: 'GLM-4V-Flash',      description: '免费视觉模型',                    icon: 'zhipu', enabled: true, supportsVision: true,  supportsReasoning: false, contextWindow: 8000 },
      { id: 'glm-zero-preview',  name: 'GLM-Zero-Preview',  description: '强化推理模型',                    icon: 'zhipu', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 16000 },
    ],
  },
  {
    // Kimi 月之暗面开放平台（OpenAI 完全兼容，但采样参数被钉死：temperature 等固定不可改，
    // 请求体需经 lib/ai/provider-body-adapter.ts 清洗，否则上游 400 invalid_request_error）
    // 文档：https://platform.kimi.com/docs/api/models-overview
    id: 'kimi-moonshot',
    name: 'Kimi（月之暗面）',
    type: 'moonshot' as const,
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'kimi-k3',                    name: 'Kimi K3',               description: '最新旗舰，1M 上下文，支持视觉与深度推理', icon: 'moonshot', enabled: true, supportsVision: true,  supportsReasoning: true,  contextWindow: 1000000 },
      { id: 'kimi-k2.7-code-highspeed',   name: 'Kimi K2.7 Code 高速版', description: '编程 Agent 高速模型，256K 上下文',        icon: 'moonshot', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 256000 },
      { id: 'kimi-k2.6',                  name: 'Kimi K2.6',             description: '通用模型，256K 上下文，可开关思考',       icon: 'moonshot', enabled: true, supportsVision: false, supportsReasoning: true,  contextWindow: 256000 },
    ],
  },
]

// ====== 空状态 ======

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        backgroundColor: 'var(--set-chip-bg, #F4F4F5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}>
        <IconServer size={28} style={{ color: 'var(--set-text-secondary, #8F959E)' }} />
      </div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: 'var(--set-text, #18181B)',
        marginBottom: '8px',
      }}>
        尚未配置 AI 提供商
      </h3>
      <p style={{
        fontSize: '14px',
        color: 'var(--set-text-secondary, #8F959E)',
        marginBottom: '24px',
        maxWidth: '400px',
      }}>
        添加 OpenAI、DashScope、小米 MIMO 等 AI 服务商，为模型池提供多样化的 API 接入能力。
      </p>
      <Button type="primary" icon={<IconPlus size={16} />} onClick={onAdd}>
        添加提供商
      </Button>
    </div>
  )
}

// ====== 提供商列表（一张卡 + 行列表，点行展开明细）======

/**
 * 2026-10-12 用户给了参考版式（一张白卡 + 行列表：品牌图标 + 名称 + 灰色厂商名 + 右侧 编辑/链接/删除），
 * 明确不要「一屏大块卡片网格」。行内保留全部既有能力，只是收进「点行展开」的明细区：
 * 列表一眼扫完 → 服务商有哪几家、各多少个模型、哪家是默认；需要细节再展开看 Key / 模型 / 开关。
 *
 * 行的 hover / 图标配色走局部 CSS（行是 `div`，内联样式写不了 `:hover`）。
 * 🚨 模板串里禁止出现反引号（见 copilot-berry.tsx 的踩坑注释）。
 */
const PROVIDER_ROW_CSS = `
.ai-provider-row { transition: background .15s ease; }
.ai-provider-row + .ai-provider-row { border-top: 1px solid var(--set-card-border, #EDEEEF); }
.ai-provider-row:hover { background: var(--set-subcard-bg, #FAFAFA); }
.ai-provider-row .ant-btn { color: var(--set-text-secondary, #8F959E); }
.ai-provider-row .ant-btn:hover { color: var(--set-text, #18181B) !important; background: var(--set-chip-bg, #F4F4F5); }
.ai-provider-row .ant-btn-dangerous:hover { color: var(--ant-color-error, #ff4d4f) !important; }
`

const ROW_ACTION_BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center' }

function ProviderRow({
  provider,
  expanded,
  testing,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleDefault,
  onToggleEnabled,
  onTest,
}: {
  provider: AIProvider
  expanded: boolean
  testing: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleDefault: () => void
  onToggleEnabled: () => void
  onTest: () => void
}) {
  // 供应商 logo + 厂商名（认不出品牌 → 立方体 + 「自定义」）
  const brand = resolveProviderBrand(provider)

  return (
    <div
      className="ai-provider-row"
      data-provider-row={provider.id}
      data-brand={brand.isBrand ? '1' : '0'}
      style={{ opacity: provider.enabled ? 1 : 0.62 }}
    >
      {/* 行头：点击展开 / 收起 */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleExpand()
          }
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
      >
        <span
          data-provider-logo={provider.id}
          style={{
            display: 'inline-flex',
            width: '22px',
            justifyContent: 'center',
            flexShrink: 0,
            color: brand.isBrand ? 'var(--set-text, #18181B)' : 'var(--set-text-secondary, #8F959E)',
          }}
        >
          {brand.node}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--set-text, #18181B)' }}>
            {provider.name}
          </span>
          <span data-provider-vendor={brand.label} style={{ fontSize: '12.5px', color: 'var(--set-text-secondary, #8F959E)' }}>
            {brand.label} · {provider.models.length} 个模型
          </span>
          {provider.isDefault && (
            <Tag color="gold" icon={<IconStar size={12} />} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0 }}>
              默认
            </Tag>
          )}
          {!provider.enabled && (
            <Tag style={{ fontSize: '11px', margin: 0 }}>已禁用</Tag>
          )}
        </div>
        <Space size={2} style={ROW_ACTION_BTN} onClick={(e) => e.stopPropagation()}>
          <Button type="text" size="small" title="编辑" aria-label="编辑" icon={<IconPencil size={15} />} onClick={onEdit} />
          <Button
            type="text"
            size="small"
            title="测试连接"
            aria-label="测试连接"
            loading={testing}
            icon={testing ? undefined : <IconLink size={15} />}
            onClick={onTest}
          />
          <Button type="text" size="small" danger title="删除" aria-label="删除" icon={<IconDelete size={15} />} onClick={onDelete} />
        </Space>
        <IconRight
          size={14}
          style={{
            flexShrink: 0,
            color: 'var(--set-text-secondary, #8F959E)',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform .2s ease',
          }}
        />
      </div>

      {/* 明细区（收起时完全不渲染，列表才够紧凑） */}
      {expanded && (
        <div style={{ padding: '0 16px 16px 50px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)', marginBottom: '8px' }}>
            <IconGlobe size={14} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{provider.baseUrl}</span>
            <Tag style={{ fontSize: '10px', margin: 0, flexShrink: 0 }}>{provider.type}</Tag>
          </div>

          {/* API Key 显示 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            backgroundColor: 'var(--set-subcard-bg, #FAFAFA)',
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
          }}>
            <IconKey size={14} style={{ color: 'var(--set-text-secondary, #8F959E)', flexShrink: 0 }} />
            <span style={{ color: 'var(--set-text-body, #646A73)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {provider.apiKey || '(未设置)'}
            </span>
          </div>

          {/* 模型列表 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {provider.models.map(m => (
              <Tag key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                {getModelIcon(m.icon)}
                {m.name}
                {m.supportsVision && <IconCamera size={12} style={{ color: 'var(--set-text-body, #646A73)' }} />}
                {m.supportsReasoning && <IconBrain size={12} style={{ color: 'var(--set-text-body, #646A73)' }} />}
                {m.supportsEmbedding && <IconBookOpen size={12} style={{ color: 'var(--set-text-body, #646A73)' }} />}
              </Tag>
            ))}
            <Tag style={{ fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)' }}>
              {provider.models.length} 个模型
            </Tag>
          </div>

          {/* 操作栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid var(--set-card-border, #EDEEEF)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                checked={provider.enabled}
                onChange={onToggleEnabled}
                size="small"
              />
              <span style={{ fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)' }}>
                {provider.enabled ? '已启用' : '已禁用'}
              </span>
            </div>
            {!provider.isDefault ? (
              <Button type="text" size="small" icon={<IconStar size={12} />} onClick={onToggleDefault} style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                设为默认
              </Button>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--set-text-body, #52525B)', fontWeight: 500 }}>当前默认</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ====== 编辑对话框 ======

interface ProviderFormData {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom' | 'glm' | 'moonshot'
  baseUrl: string
  apiKey: string
  isDefault: boolean
  enabled: boolean
  priority: number
  models: ProviderModel[]
}

const EMPTY_MODEL: ProviderModel = {
  id: '', name: '', description: '', icon: 'sparkles',
  enabled: true, supportsVision: false, supportsReasoning: false,
}

// ====== 添加 / 编辑服务商 ======
/**
 * 🚨 2026-10-01 按「用户视角」重做（用户反馈：这个太丑了，而且不便用户设置）。
 *
 * 旧版是「技术字段全集表单」：第一项就是 ID，模型 ID（如 kimi-k2.6）也要手敲，
 * 填完根本不知道对不对，必须保存后跑去聊天页试一次才知道通不通。
 *
 * 新版按用户手上真正拥有的东西来组织，只有三步：
 *   ① 我用的是哪家   → 点一张卡片（自动带好协议 / 服务地址 / 预设模型）
 *   ② 我的 Key       → 粘进去，点「测试连接」立刻知道通不通，并顺手拉回上游模型清单
 *   ③ 要启用哪些模型 → 勾选即可，能力标签（视觉 / 推理 / 知识库）自动推断、可点改
 * ID / 优先级 / 协议类型 / 是否默认 / 是否启用 → 全部收进底部「高级设置」，默认收起。
 */

/** 预设服务商的用户向信息：一句话说明 + 去哪拿 Key + 品牌 logo */
const PRESET_META: Record<string, { blurb: string; consoleUrl?: string; logo: React.ReactNode }> = {
  'deepseek-custom': {
    blurb: '性价比高，中文与代码能力强',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    logo: brandIcon(DeepSeek, 20),
  },
  'kimi-moonshot': {
    blurb: '超长上下文，擅长编程与长文',
    consoleUrl: 'https://platform.kimi.com/console/api-keys',
    logo: brandIcon(Moonshot, 20),
  },
  'zhipu-glm-preset': {
    blurb: '国内直连，模型线最全',
    consoleUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    logo: brandIcon(Zhipu, 20),
  },
  'openai-official': {
    blurb: '国际旗舰，综合能力最强',
    consoleUrl: 'https://platform.openai.com/api-keys',
    logo: brandIcon(OpenAI, 20),
  },
  'xiaomi-mimo': {
    blurb: '小米自研大模型',
    logo: brandIcon(XiaomiMiMo, 20),
  },
}

/** 向量 / 语音 / 画图 / 审核类模型默认不勾选，免得把模型选择器塞满 */
const NON_CHAT_MODEL_RE = /(embed|rerank|tts|whisper|audio|speech|dall-?e|image|moderation|bge|m3e)/i

/** 从模型 id 推断能力，作为勾选列表的默认值（用户可点标签修正） */
function inferCapabilities(modelId: string) {
  const id = (modelId || '').toLowerCase()
  return {
    supportsVision: /(vl|vision|4o|4v|omni|gemini|claude-3|claude-4|\bk3\b|glm-4v)/.test(id),
    supportsReasoning: /(reason|think|\bo1|\bo3|\bo4|deepseek-r|\bk3\b|zero|qwq|glm-4\.[5-9]|k2\.[6-9])/.test(id),
    supportsEmbedding: /(embed|bge|m3e)/.test(id),
  }
}

const DIALOG_STEP: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--set-text-secondary, #8F959E)',
}
const DIALOG_STEP_NUM: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 600,
  background: 'var(--set-chip-bg, #F4F4F5)',
  color: 'var(--set-text-body, #52525B)',
}
const DIALOG_LINK_BTN: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  color: '#12B76A',
  fontSize: 11.5,
  fontFamily: 'inherit',
}
const DIALOG_FIELD_LABEL: React.CSSProperties = {
  fontSize: 11.5,
  color: 'var(--set-text-secondary, #8F959E)',
  marginBottom: 4,
}

function StepTitle({ n, text, extra }: { n: number; text: string; extra?: React.ReactNode }) {
  return (
    <div style={DIALOG_STEP}>
      <span style={DIALOG_STEP_NUM}>{n}</span>
      <span>{text}</span>
      {extra ? <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{extra}</span> : null}
    </div>
  )
}

/** 能力标签：点一下切换（默认值由模型 id 推断） */
function CapChip({ on, label, title, onClick }: { on: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        border: '1px solid ' + (on ? '#12B76A' : 'var(--set-card-border, #EDEEEF)'),
        background: on ? 'rgba(18, 183, 106, .12)' : 'transparent',
        color: on ? '#12B76A' : 'var(--set-text-secondary, #8F959E)',
        borderRadius: 999,
        padding: '1px 7px',
        fontSize: 10.5,
        lineHeight: '16px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all .12s ease',
      }}
    >
      {label}
    </button>
  )
}

interface ProbeState {
  ok: boolean
  error?: string
  detail?: string
  count?: number
  latencyMs?: number
}

function ProviderDialog({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: ProviderFormData) => Promise<void>
  editing: AIProvider | null
}) {
  const isEdit = !!editing
  const [formState, setFormState] = useState<ProviderFormData>({
    id: '', name: '', type: 'openai', baseUrl: '', apiKey: '',
    isDefault: false, enabled: true, priority: 1, models: [],
  })
  /** 仅新增时使用：当前选中的服务商卡片（'custom' = 其他/自定义） */
  const [presetId, setPresetId] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [probe, setProbe] = useState<ProbeState | null>(null)
  /** 模型清单是否来自上游拉取（决定下方提示文案） */
  const [pulled, setPulled] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) return
    setProbe(null)
    setPulled(false)
    setQ('')
    setAdvanced(false)
    if (editing) {
      setPresetId('')
      setFormState({
        id: editing.id,
        name: editing.name,
        type: editing.type,
        baseUrl: editing.baseUrl,
        apiKey: editing.apiKey,
        isDefault: !!editing.isDefault,
        enabled: editing.enabled,
        priority: editing.priority,
        models: editing.models.map(m => ({ ...m })),
      })
    } else {
      setPresetId('')
      setFormState({
        id: '', name: '', type: 'openai', baseUrl: '', apiKey: '',
        isDefault: false, enabled: true, priority: 1, models: [],
      })
    }
  }, [editing, open])

  const meta = PRESET_META[presetId]

  /** 点服务商卡片：一次带好协议 / 名称 / 服务地址 / 预设模型（已填的 Key 保留） */
  const applyPreset = (id: string) => {
    setPresetId(id)
    setProbe(null)
    setPulled(false)
    setQ('')
    const t = PRESET_TEMPLATES.find(x => x.id === id)
    if (!t) {
      // 「其他」：需要用户自己填 ID / 名称 / 地址 → 直接展开高级设置
      setFormState(p => ({ ...p, id: '', name: '', type: 'openai', baseUrl: '', models: [] }))
      setAdvanced(true)
      return
    }
    setFormState(p => ({
      ...p,
      id: t.id,
      name: t.name,
      type: t.type,
      baseUrl: t.baseUrl,
      models: t.models.map(m => ({ ...m })),
    }))
  }

  const setModel = (idx: number, patch: Partial<ProviderModel>) =>
    setFormState(p => ({ ...p, models: p.models.map((m, i) => (i === idx ? { ...m, ...patch } : m)) }))

  const addManualModel = () =>
    setFormState(p => ({ ...p, models: [...p.models, { ...EMPTY_MODEL, id: '', name: '', enabled: true }] }))

  const removeModel = (idx: number) =>
    setFormState(p => ({ ...p, models: p.models.filter((_, i) => i !== idx) }))

  const setAllModels = (enabled: boolean) =>
    setFormState(p => ({ ...p, models: p.models.map(m => ({ ...m, enabled })) }))

  /** 一次请求两用：验证 Key 是否有效 + 把上游真实模型清单带回来 */
  const runProbe = async () => {
    if (!formState.baseUrl.trim()) {
      toast.error('请先填写服务地址')
      return
    }
    if (!formState.apiKey.trim()) {
      toast.error('请先填写 API Key')
      return
    }
    setTesting(true)
    setProbe(null)
    try {
      const res = await fetch('/api/admin/ai-providers/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: formState.baseUrl,
          apiKey: formState.apiKey,
          providerId: editing?.id || '',
        }),
      })
      const d = await res.json()
      if (res.status === 401) {
        setProbe({ ok: false, error: '登录状态已失效，请刷新页面' })
        return
      }
      if (d?.ok) {
        const list: Array<{ id: string }> = Array.isArray(d.models) ? d.models : []
        if (list.length) {
          // 用上游清单重建模型列表：同 id 的沿用原有能力标注 / 图标，其余按 id 推断
          const prev = new Map(formState.models.map(m => [m.id, m]))
          const fallbackIcon = formState.models[0]?.icon || 'sparkles'
          const next: ProviderModel[] = list.map(item => {
            const old = prev.get(item.id)
            const caps = inferCapabilities(item.id)
            return {
              id: item.id,
              name: old?.name || item.id,
              description: old?.description || '',
              icon: old?.icon || fallbackIcon,
              // 上游清单里明显不是对话模型的（向量 / 语音 / 画图）默认不勾选
              enabled: old ? old.enabled : !NON_CHAT_MODEL_RE.test(item.id),
              supportsVision: old?.supportsVision ?? caps.supportsVision,
              supportsReasoning: old?.supportsReasoning ?? caps.supportsReasoning,
              supportsEmbedding: old?.supportsEmbedding ?? caps.supportsEmbedding,
              contextWindow: old?.contextWindow,
              rateMultiplier: old?.rateMultiplier,
            }
          })
          setFormState(p => ({ ...p, models: next }))
          setPulled(true)
        }
        setProbe({ ok: true, count: list.length, latencyMs: d.latencyMs })
      } else {
        setProbe({ ok: false, error: d?.error || '连接失败', detail: d?.detail, latencyMs: d?.latencyMs })
      }
    } catch (e) {
      setProbe({ ok: false, error: e instanceof Error ? e.message : '请求失败' })
    } finally {
      setTesting(false)
    }
  }

  /** 保存前清掉用户「加了行但没填 ID」的空模型 */
  const cleanModels = () => formState.models.filter(m => m.id.trim())

  const handleSave = async () => {
    if (!formState.id.trim() || !formState.name.trim() || !formState.baseUrl.trim()) {
      setAdvanced(true)
      toast.error('请补全服务商 ID、显示名称和服务地址')
      return
    }
    if (cleanModels().length === 0) {
      toast.error('请至少保留一个模型')
      return
    }
    setSaving(true)
    try {
      await onSave({ ...formState, models: cleanModels() })
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const enabledCount = formState.models.filter(m => m.id.trim() && m.enabled).length
  const validCount = formState.models.filter(m => m.id.trim()).length
  const shown = formState.models
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => !q.trim() || m.id.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? '编辑 AI 服务商' : '添加 AI 服务商'}
      footer={null}
      width={640}
      /* 内嵌设置弹窗时 Modal 会 portal 到 body（脱离 .ai-settings-scope）；
         挂固定 rootClassName，由设置侧注入一份主题令牌，避免深色下 fallback 浅色失配 */
      rootClassName="ai-svc-portal"
      /**
       * 🚨 2026-10-11 修「条目一多，底部『取消 / 保存』被顶出弹窗外，还拉不回来」：
       *   ① 滚动职责从 body 内联样式挪到下面**自己的滚动层** —— 原先底部操作区就躺在滚动内容里，
       *      内容一长，它正好卡在 body 的滚动边界上被裁掉半截（实测 bottom 溢出 14px）；
       *   ② 滚动层必须带 `data-lenis-prevent`：本弹窗 portal 到 body、脱离了 SmoothScroll 的组件树，
       *      全站 Lenis 会吞掉这里的滚轮（实测 scrollTop 恒为 0），光有 overflowY:auto 是摆设。
       */
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 140px)' }}>
      <div
        data-lenis-prevent
        style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingTop: 4, paddingBottom: 20 }}
      >
      {/* ── ① 选哪家 ── */}
      {isEdit ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 20,
            borderRadius: 8, background: 'var(--set-subcard-bg, #FAFAFA)',
          }}
        >
          <span style={{ display: 'inline-flex', flexShrink: 0 }}>{getModelIcon(formState.models[0]?.icon)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--set-text, #18181B)' }}>{formState.name}</div>
            <div
              style={{
                fontSize: 11.5, color: 'var(--set-text-secondary, #8F959E)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {formState.baseUrl}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 22 }}>
          <StepTitle n={1} text="选择服务商" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {PRESET_TEMPLATES.map(t => {
              const m = PRESET_META[t.id]
              const active = presetId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyPreset(t.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                    padding: '10px 11px', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                    borderRadius: 9,
                    border: '1px solid ' + (active ? '#12B76A' : 'var(--set-card-border, #EDEEEF)'),
                    background: active ? 'rgba(18, 183, 106, .08)' : 'var(--set-subcard-bg, #FAFAFA)',
                    transition: 'border-color .12s ease, background .12s ease',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--set-chip-bg, #F4F4F5)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--set-subcard-bg, #FAFAFA)' }}
                >
                  <span style={{ display: 'inline-flex', marginBottom: 2 }}>{m?.logo || getModelIcon(t.models[0]?.icon)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--set-text, #18181B)' }}>{t.name}</span>
                  <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--set-text-secondary, #8F959E)' }}>{m?.blurb}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => applyPreset('custom')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                padding: '10px 11px', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                borderRadius: 9,
                border: '1px dashed ' + (presetId === 'custom' ? '#12B76A' : 'var(--set-card-border, #EDEEEF)'),
                background: presetId === 'custom' ? 'rgba(18, 183, 106, .08)' : 'transparent',
                transition: 'border-color .12s ease, background .12s ease',
              }}
            >
              <span style={{ display: 'inline-flex', marginBottom: 2, color: 'var(--set-text-tertiary, #A8ADB4)' }}>
                <IconPlus size={20} />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--set-text, #18181B)' }}>其他服务商</span>
              <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--set-text-secondary, #8F959E)' }}>任意 OpenAI 兼容接口</span>
            </button>
          </div>
        </div>
      )}

      {/* ── ② 填 Key + 测试 ── */}
      <div style={{ marginBottom: 22 }}>
        <StepTitle
          n={2}
          text="填写 API Key"
          extra={
            meta?.consoleUrl ? (
              <a
                href={meta.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#12B76A', fontSize: 11.5, textDecoration: 'none' }}
              >
                去哪申请？↗
              </a>
            ) : null
          }
        />
        <Input.Password
          value={formState.apiKey}
          onChange={e => setFormState(p => ({ ...p, apiKey: e.target.value }))}
          placeholder="粘贴你的 API Key，例如 sk-..."
          style={{ fontSize: 13 }}
          iconRender={visible => (visible ? <IconPreviewClose size={16} /> : <IconPreviewOpen size={16} />)}
        />
        <div style={{ marginTop: 8, marginBottom: 4, fontSize: 11.5, color: 'var(--set-text-secondary, #8F959E)' }}>
          服务地址（选好服务商后已自动填好，一般不用改）
        </div>
        <Input
          value={formState.baseUrl}
          onChange={e => setFormState(p => ({ ...p, baseUrl: e.target.value }))}
          placeholder="https://api.example.com/v1"
          style={{ fontSize: 12.5 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, minWidth: 0 }}>
          <Button size="small" onClick={runProbe} loading={testing} icon={testing ? undefined : <IconLightning size={14} />}>
            {testing ? '测试中…' : '测试连接'}
          </Button>
          {probe?.ok ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#12B76A' }}>
              <IconCheck size={13} />
              连接正常
              {pulled ? '，已拉取 ' + probe.count + ' 个模型' : ''}
              {probe.latencyMs ? ' · ' + probe.latencyMs + 'ms' : ''}
            </span>
          ) : null}
          {probe && !probe.ok ? (
            <span
              style={{
                fontSize: 12, color: '#F04438', minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {probe.error}
              {probe.detail ? '：' + probe.detail : ''}
            </span>
          ) : null}
        </div>
        {probe && !probe.ok ? (
          <div style={{ marginTop: 6, fontSize: 11.5, lineHeight: '17px', color: 'var(--set-text-secondary, #8F959E)' }}>
            个别服务商不开放模型清单接口，测不通也可以直接保存 —— 手动把要用的模型加进下面的列表即可。
          </div>
        ) : null}
      </div>

      {/* ── ③ 选模型 ── */}
      <div style={{ marginBottom: 18 }}>
        <StepTitle
          n={3}
          text={validCount ? '选择要启用的模型 · 已选 ' + enabledCount + ' / ' + validCount : '选择要启用的模型'}
          extra={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {validCount > 6 ? (
                <Input
                  size="small"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="搜索"
                  allowClear
                  style={{ width: 118, fontSize: 12 }}
                />
              ) : null}
              <button type="button" style={DIALOG_LINK_BTN} onClick={() => setAllModels(true)}>全选</button>
              <button type="button" style={DIALOG_LINK_BTN} onClick={() => setAllModels(false)}>全不选</button>
            </span>
          }
        />

        {formState.models.length === 0 ? (
          <div
            style={{
              padding: '18px 12px', textAlign: 'center', fontSize: 12,
              color: 'var(--set-text-secondary, #8F959E)',
              border: '1px dashed var(--set-card-border, #EDEEEF)', borderRadius: 8,
            }}
          >
            先点上面的「测试连接」从上游拉取模型，或者
            <button type="button" style={DIALOG_LINK_BTN} onClick={addManualModel}>手动添加一个</button>
          </div>
        ) : (
          <div
            /* 同上：portal 浮层内的滚动容器必须自带 data-lenis-prevent，否则模型清单一长就滚不动 */
            data-lenis-prevent
            style={{
              maxHeight: 236, overflowY: 'auto',
              border: '1px solid var(--set-card-border, #EDEEEF)', borderRadius: 8,
            }}
          >
            {shown.map(({ m, idx }, i) => (
              <div
                key={m.id + '#' + idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--set-row-border, #F4F4F5)',
                  background: m.enabled ? 'transparent' : 'var(--set-subcard-bg, #FAFAFA)',
                }}
              >
                {/* 用 antd Checkbox 而非原生 input：原生勾选框不受 colorPrimary 影响，
                    在设置里会是一枚浏览器默认蓝勾，跟旁边的绿色能力标签打架 */}
                <Checkbox
                  checked={m.enabled}
                  onChange={e => setModel(idx, { enabled: e.target.checked })}
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {m.id.trim() ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      {getModelIcon(m.icon)}
                      <span
                        style={{
                          fontSize: 12.5, color: 'var(--set-text, #18181B)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {m.id}
                      </span>
                    </div>
                  ) : (
                    <Input
                      size="small"
                      autoFocus
                      value={m.id}
                      onChange={e => setModel(idx, { id: e.target.value })}
                      placeholder="模型 ID，例如 deepseek-chat"
                      style={{ fontSize: 12, width: 230 }}
                    />
                  )}
                </div>
                <CapChip
                  on={!!m.supportsVision}
                  label="视觉"
                  title="该模型支持图片输入"
                  onClick={() => setModel(idx, { supportsVision: !m.supportsVision })}
                />
                <CapChip
                  on={!!m.supportsReasoning}
                  label="推理"
                  title="该模型支持深度思考"
                  onClick={() => setModel(idx, { supportsReasoning: !m.supportsReasoning })}
                />
                <CapChip
                  on={!!m.supportsEmbedding}
                  label="知识库"
                  title="可作为向量模型（知识库检索用）"
                  onClick={() => setModel(idx, { supportsEmbedding: !m.supportsEmbedding })}
                />
                <button
                  type="button"
                  title="移除"
                  onClick={() => removeModel(idx)}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer', padding: 2,
                    color: 'var(--set-text-tertiary, #A8ADB4)', display: 'inline-flex', flexShrink: 0,
                  }}
                >
                  <IconClose size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--set-text-secondary, #8F959E)' }}>
            {pulled ? '模型清单来自上游，能力标签可点改' : '点「测试连接」可从上游拉取真实模型清单'}
          </span>
          <button type="button" style={DIALOG_LINK_BTN} onClick={addManualModel}>+ 手动添加</button>
        </div>
      </div>

      {/* ── 高级设置 ── */}
      <div style={{ borderTop: '1px solid var(--set-row-border, #F4F4F5)', paddingTop: 12 }}>
        <button
          type="button"
          onClick={() => setAdvanced(v => !v)}
          style={{ ...DIALOG_LINK_BTN, fontSize: 12.5, color: 'var(--set-text-secondary, #8F959E)' }}
        >
          高级设置（ID / 优先级 / 默认服务商）{advanced ? '收起' : '展开'}
        </button>
        {advanced ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <div style={DIALOG_FIELD_LABEL}>服务商 ID</div>
              <Input
                size="small"
                value={formState.id}
                disabled={isEdit}
                onChange={e => setFormState(p => ({ ...p, id: e.target.value }))}
                placeholder="如 deepseek-custom"
                style={{ fontSize: 12.5 }}
              />
            </div>
            <div>
              <div style={DIALOG_FIELD_LABEL}>显示名称</div>
              <Input
                size="small"
                value={formState.name}
                onChange={e => setFormState(p => ({ ...p, name: e.target.value }))}
                placeholder="如 DeepSeek 官方"
                style={{ fontSize: 12.5 }}
              />
            </div>
            <div>
              <div style={DIALOG_FIELD_LABEL}>协议类型</div>
              <Select
                size="small"
                value={formState.type}
                onChange={v => setFormState(p => ({ ...p, type: v }))}
                style={{ width: '100%' }}
                options={[
                  { value: 'openai', label: 'OpenAI 兼容' },
                  { value: 'moonshot', label: 'Kimi 月之暗面' },
                  { value: 'dashscope', label: '阿里云百炼' },
                  { value: 'glm', label: '智谱 GLM (BigModel)' },
                  { value: 'custom', label: '自定义' },
                ]}
              />
            </div>
            <div>
              <div style={DIALOG_FIELD_LABEL}>优先级（数字越小越优先）</div>
              <InputNumber
                size="small"
                min={1}
                max={100}
                value={formState.priority}
                onChange={v => setFormState(p => ({ ...p, priority: Number(v) || 1 }))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--set-text-body, #52525B)', cursor: 'pointer' }}>
                <Switch
                  size="small"
                  checked={formState.enabled}
                  onChange={v => setFormState(p => ({ ...p, enabled: v }))}
                  style={{ backgroundColor: formState.enabled ? '#12B76A' : undefined }}
                />
                启用该服务商
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--set-text-body, #52525B)', cursor: 'pointer' }}>
                <Switch
                  size="small"
                  checked={formState.isDefault}
                  onChange={v => setFormState(p => ({ ...p, isDefault: v }))}
                  style={{ backgroundColor: formState.isDefault ? '#12B76A' : undefined }}
                />
                设为默认服务商
              </label>
            </div>
          </div>
        ) : null}
      </div>

      </div>

      {/* ── 底部操作：常驻弹窗底部，不随内容滚动（内容再长也点得到）── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14,
          borderTop: '1px solid var(--set-row-border, #F4F4F5)',
        }}
      >
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={handleSave} loading={saving}>
          {isEdit ? '保存修改' : '保存并启用'}
        </Button>
      </div>
      </div>
    </Modal>
  )
}

export function AIProvidersManager({ variant = 'page' }: { variant?: 'page' | 'embedded' } = {}) {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AIProvider | null>(null)
  const [deleting, setDeleting] = useState<AIProvider | null>(null)
  /** 行展开状态（多行可同时展开）+ 行内「测试连接」中的 provider id */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [testingRowId, setTestingRowId] = useState<string | null>(null)

  // 默认/自动选择模型
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [defaultModelDraft, setDefaultModelDraft] = useState<string>('')
  const [savingDefault, setSavingDefault] = useState(false)

  // 知识库 embedding 配置
  const [embeddingConfig, setEmbeddingConfig] = useState<{
    providerId: string
    model: string
    dimension?: number
    enabled: boolean
  } | null>(null)
  const [embProviderDraft, setEmbProviderDraft] = useState<string>('')
  const [embModelDraft, setEmbModelDraft] = useState<string>('')
  const [embDimDraft, setEmbDimDraft] = useState<number | null>(null)
  const [embEnabledDraft, setEmbEnabledDraft] = useState<boolean>(true)
  const [savingEmbedding, setSavingEmbedding] = useState(false)
  const [testingEmbedding, setTestingEmbedding] = useState(false)
  const [embedTestResult, setEmbedTestResult] = useState<{ ok: boolean; msg: string; provider?: string; model?: string; dim?: number; preview?: number[] } | null>(null)

  // 联网搜索配置（web_search / deep_research 工具用，provider 不限类型，协议可插拔）
  const [webSearchConfig, setWebSearchConfig] = useState<{
    enabled: boolean
    providerId: string
    protocol?: 'zhipu' | 'exa' | 'anysearch' | 'local'
    /** 回显的是脱敏值，仅用于展示「已设置」；真实 Key 不会返回前端 */
    apiKey?: string
    /** @deprecated 旧版 Exa 独立 Key 字段，兼容展示 */
    exaApiKey?: string
    engine?: string
    defaultCount?: number
  } | null>(null)
  const [wsProviderDraft, setWsProviderDraft] = useState<string>('')
  const [wsProtocolDraft, setWsProtocolDraft] = useState<'zhipu' | 'exa' | 'anysearch' | 'local'>('zhipu')
  const [wsExaKeyDraft, setWsExaKeyDraft] = useState<string>('')
  const [wsEngineDraft, setWsEngineDraft] = useState<string>('search_pro_sogou')
  const [wsCountDraft, setWsCountDraft] = useState<number>(8)
  const [wsEnabledDraft, setWsEnabledDraft] = useState<boolean>(true)
  const [savingWebSearch, setSavingWebSearch] = useState(false)

  // AI 助手积分制度配置（每模型倍率在「提供商 → 模型」里配；这里只配通用换算 + 月度额度）
  const [creditConfig, setCreditConfig] = useState<{
    enabled: boolean
    outputWeight: number
    tokensPerCredit: number
    plusMonthlyQuota: number
    proMonthlyQuota: number
  } | null>(null)
  const [creditDraft, setCreditDraft] = useState({
    enabled: true,
    outputWeight: 3,
    tokensPerCredit: 1000,
    plusMonthlyQuota: 2000,
    proMonthlyQuota: 300,
  })
  const [savingCredit, setSavingCredit] = useState(false)
  const setCredit = (k: keyof typeof creditDraft, v: number | boolean) =>
    setCreditDraft(d => ({ ...d, [k]: v }))

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-providers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setProviders(data.providers || [])
      if (typeof data.defaultModelId === 'string') {
        setDefaultModelId(data.defaultModelId)
        setDefaultModelDraft(data.defaultModelId)
      }
      if (data.embeddingConfig && typeof data.embeddingConfig === 'object') {
        setEmbeddingConfig(data.embeddingConfig)
        setEmbProviderDraft(data.embeddingConfig.providerId || '')
        setEmbModelDraft(data.embeddingConfig.model || '')
        setEmbDimDraft(data.embeddingConfig.dimension ?? null)
        setEmbEnabledDraft(!!data.embeddingConfig.enabled)
      } else {
        setEmbeddingConfig(null)
      }
      // 联网搜索配置
      if (data.webSearchConfig && typeof data.webSearchConfig === 'object') {
        setWebSearchConfig(data.webSearchConfig)
        setWsProviderDraft(data.webSearchConfig.providerId || '')
        // 四种协议都要如实回显：旧实现只认 exa，anysearch / local 会被折叠成 zhipu，
        // 导致打开页面就「看起来没配过」，一保存又把协议改坏。
        const rawProto = data.webSearchConfig.protocol
        const proto: 'zhipu' | 'exa' | 'anysearch' | 'local' =
          rawProto === 'exa' || rawProto === 'anysearch' || rawProto === 'local' ? rawProto : 'zhipu'
        setWsProtocolDraft(proto)
        setWsEngineDraft(
          data.webSearchConfig.engine ||
            (proto === 'exa'
              ? 'auto'
              : proto === 'anysearch'
                ? ''
                : proto === 'local'
                  ? 'all'
                  : 'search_pro_sogou')
        )
        setWsCountDraft(Number(data.webSearchConfig.defaultCount) || 8)
        setWsEnabledDraft(!!data.webSearchConfig.enabled)
      } else {
        setWebSearchConfig(null)
      }
      // 积分制度配置
      if (data.creditConfig && typeof data.creditConfig === 'object') {
        setCreditConfig(data.creditConfig)
        setCreditDraft({
          enabled: data.creditConfig.enabled !== false,
          outputWeight: Number(data.creditConfig.outputWeight) || 3,
          tokensPerCredit: Number(data.creditConfig.tokensPerCredit) || 1000,
          plusMonthlyQuota: Number(data.creditConfig.plusMonthlyQuota) || 2000,
          proMonthlyQuota: Number(data.creditConfig.proMonthlyQuota) || 300,
        })
      }
    } catch (e) {
      console.error(e)
      toast.error('加载提供商失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSaveEmbedding = async () => {
    setSavingEmbedding(true)
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeddingConfig: {
            providerId: embProviderDraft,
            model: embModelDraft,
            dimension: embDimDraft ?? undefined,
            enabled: embEnabledDraft
          }
        })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      setEmbeddingConfig(data.config.embeddingConfig || null)
      toast.success('Embedding 配置已保存')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingEmbedding(false)
    }
  }

  const handleSaveWebSearch = async () => {
    setSavingWebSearch(true)
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webSearchConfig: {
            // anysearch / local 都不绑定 provider，置空避免写入脏 id
            providerId: wsProtocolDraft === 'anysearch' || wsProtocolDraft === 'local' ? '' : wsProviderDraft,
            protocol: wsProtocolDraft,
            // 只在输入了新 Key 时才发送该字段（缺省 = 保留服务端已存的原值）
            ...(wsExaKeyDraft.trim() ? { apiKey: wsExaKeyDraft.trim() } : {}),
            // local 的 all 表示「并发全部引擎」，落库为空
            engine: wsEngineDraft && wsEngineDraft !== 'all' ? wsEngineDraft : undefined,
            defaultCount: wsCountDraft || undefined,
            enabled: wsEnabledDraft
          }
        })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      setWebSearchConfig(data.config.webSearchConfig || null)
      setWsExaKeyDraft('') // 保存成功后清空输入框，回显走脱敏占位
      toast.success('联网搜索配置已保存')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingWebSearch(false)
    }
  }

  const handleSaveCredit = async () => {
    setSavingCredit(true)
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditConfig: creditDraft })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      setCreditConfig(data.config.creditConfig)
      toast.success('积分制度配置已保存')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingCredit(false)
    }
  }

  const handleTestEmbedding = async () => {
    setTestingEmbedding(true)
    setEmbedTestResult(null)
    try {
      const res = await fetch('/api/knowledge/embedding-config', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setEmbedTestResult({
          ok: true,
          msg: `成功生成 ${data.vectorLength} 维向量`,
          provider: data.provider,
          model: data.model,
          dim: data.dimension,
          preview: data.vectorPreview
        })
        toast.success('Embedding 测试成功')
      } else {
        setEmbedTestResult({ ok: false, msg: data.error || '测试失败' })
        toast.error('Embedding 测试失败')
      }
    } catch (e: any) {
      setEmbedTestResult({ ok: false, msg: e.message })
    } finally {
      setTestingEmbedding(false)
    }
  }

  useEffect(() => { fetchProviders() }, [fetchProviders])

  // 创建 / 更新
  const handleSave = async (data: ProviderFormData & { apiKey: string; models: ProviderModel[] }) => {
    const url = editing ? '/api/admin/ai-providers' : '/api/admin/ai-providers'
    const method = editing ? 'PUT' : 'POST'

    const body = editing
      ? { ...data }
      : data

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || '操作失败')
    }

    toast.success(editing ? '提供商已更新' : '提供商已添加')
    fetchProviders()
  }

  // 删除
  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/admin/ai-providers?id=${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(`已删除 ${deleting.name}`)
      fetchProviders()
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleting(null)
    }
  }

  // 切换默认
  const handleToggleDefault = async (p: AIProvider) => {
    try {
      await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, isDefault: true }),
      })
      fetchProviders()
    } catch {
      toast.error('设置默认失败')
    }
  }

  /** 行展开 / 收起 */
  const toggleRowExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /**
   * 行内「测试连接」：只验 Key + 服务地址通不通，**不改模型清单**
   * （要按上游刷新模型清单仍走编辑弹窗里的那个按钮）。
   * 列表接口回显的 apiKey 是脱敏值（`84ba****ymqG`）→ 带上 providerId，
   * 由 probe 路由回退到服务端存着的真 Key（见 app/api/admin/ai-providers/probe/route.ts）。
   */
  const handleRowTest = async (p: AIProvider) => {
    if (testingRowId) return
    setTestingRowId(p.id)
    try {
      const res = await fetch('/api/admin/ai-providers/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: p.baseUrl, apiKey: p.apiKey, providerId: p.id }),
      })
      if (res.status === 401) {
        toast.error('登录状态已失效，请刷新页面')
        return
      }
      const d = await res.json().catch(() => null)
      if (d?.ok) {
        const n = Array.isArray(d.models) ? d.models.length : 0
        toast.success(`「${p.name}」连接正常${n ? ` · 上游 ${n} 个模型` : ''}${d.latencyMs ? ` · ${d.latencyMs}ms` : ''}`)
      } else {
        toast.error(`「${p.name}」连接失败：${d?.error || '未知错误'}`)
      }
    } catch (e) {
      toast.error(`「${p.name}」连接失败：${e instanceof Error ? e.message : '请求异常'}`)
    } finally {
      setTestingRowId(null)
    }
  }

  // 切换启用
  const handleToggleEnabled = async (p: AIProvider) => {
    try {
      await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, enabled: !p.enabled }),
      })
      fetchProviders()
    } catch {
      toast.error('切换状态失败')
    }
  }

  // 保存默认/自动选择模型
  const handleSaveDefaultModel = async () => {
    setSavingDefault(true)
    try {
      const res = await fetch('/api/admin/ai-providers/default-model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: defaultModelDraft }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '保存失败')
      }
      const data = await res.json()
      setDefaultModelId(data.configuredDefaultModelId ?? null)
      toast.success('默认模型已更新')
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    } finally {
      setSavingDefault(false)
    }
  }

  // 构造可选的默认模型列表（来自所有 enabled provider 的 enabled model）
  const availableDefaultModels = providers
    .filter(p => p.enabled)
    .flatMap(p => p.models.filter(m => m.enabled).map(m => ({ p, m })))
    .sort((a, b) => a.p.priority - b.p.priority || a.m.id.localeCompare(b.m.id))

  // 查找当前 effective 默认（与后端 resolveDefaultModelId 一致：configured > 第一项）
  const effectiveDefaultId = (() => {
    if (defaultModelId && availableDefaultModels.some(x => x.m.id === defaultModelId)) {
      return defaultModelId
    }
    return availableDefaultModels[0]?.m.id ?? null
  })()
  const effectiveDefaultLabel = availableDefaultModels.find(x => x.m.id === effectiveDefaultId)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <IconLoading size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--set-text-secondary, #8F959E)' }} />
      </div>
    )
  }

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0)
  // embedded = 内嵌到设置弹窗（2026-10-01）：右栏已有「AI 服务」大标题，
  // 这里不再重复渲染 20px 主标题，只保留一句统计 + 主操作按钮，避免两层标题打架。
  const embedded = variant === 'embedded'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: embedded ? '16px' : '24px' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          {!embedded && (
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--set-text, #18181B)', letterSpacing: '-0.025em', marginBottom: '4px' }}>AI 提供商管理</h2>
          )}
          <p style={{ fontSize: embedded ? '13px' : '14px', color: 'var(--set-text-secondary, #8F959E)', marginTop: embedded ? 0 : '4px' }}>
            管理 AI 服务商接入，共 {providers.length} 个提供商 · {totalModels} 个可用模型
          </p>
        </div>
        <Button type="primary" icon={<IconPlus size={16} />} onClick={() => { setEditing(null); setDialogOpen(true) }}>
          添加提供商
        </Button>
      </div>

      {/* 默认/自动选择模型 */}
      <Card
        style={{ border: '1px solid var(--set-card-border, #EDEEEF)' }}
        styles={{ body: { paddingTop: '24px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--set-chip-bg, #F4F4F5)',
            color: '#059669',
            flexShrink: 0,
          }}>
            <IconMagic size={16} />
          </div>
          <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <Typography.Text strong>自动选择模型</Typography.Text>
              <Tag style={{
                fontSize: '10px',
                color: '#059669',
                border: '1px solid var(--set-accent-border, #D6E4FF)',
                backgroundColor: 'var(--set-chip-bg, #F4F4F5)',
              }}>
                刷新后生效
              </Tag>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)', marginTop: '4px', marginBottom: '12px' }}>
              每次刷新 AI 助手页面时，未手动选择模型的用户将自动使用该模型。
              {effectiveDefaultLabel
                ? `当前生效：${effectiveDefaultLabel.p.name} · ${effectiveDefaultLabel.m.name}`
                : '当前没有可用的启用模型。'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={defaultModelDraft || undefined}
                onChange={(v) => setDefaultModelDraft(v)}
                disabled={availableDefaultModels.length === 0}
                style={{ width: '320px' }}
                placeholder="选择自动选择的模型"
                options={availableDefaultModels.length === 0 ? [] : availableDefaultModels.map(({ p, m }) => ({
                  value: m.id,
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getModelIcon(m.icon)}
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <span style={{ color: 'var(--set-text-secondary, #8F959E)', fontSize: '12px' }}>· {p.name}</span>
                    </span>
                  ),
                }))}
              />
              <Button
                size="small"
                type="primary"
                onClick={handleSaveDefaultModel}
                disabled={savingDefault || defaultModelDraft === (defaultModelId ?? '') || availableDefaultModels.length === 0}
                icon={savingDefault ? <IconLoading size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              >
                保存
              </Button>
              {defaultModelId && defaultModelId !== effectiveDefaultId && (
                <span style={{ fontSize: '12px', color: 'var(--set-text-body, #52525B)' }}>
                  配置的默认模型已失效，将自动回退到当前生效项
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ═══ 高级设置（2026-10-11）：知识库 Embedding / 联网搜索源 / 知识库全局参数 / 积分制度 ═══
          用户反馈：这些运维参数与「选默认模型、加服务商」这类日常动作挤在一屏 = 噪音，
          要求「以用户视角来设计」。现在按用户视角分两层：日常动作在上保持常显，运维参数
          收进默认收起的「高级设置」。⚠️ 折叠只在 embedded（内嵌设置弹窗）生效；
          /admin 整页原样全展开 —— 那正是运维要找的东西。 */}
      <AdvancedSettingsSection collapsible={embedded}>

      {/* 知识库 Embedding 配置 */}
      <Card style={{ marginBottom: '20px', border: '1px solid var(--set-card-border, #EDEEEF)' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--set-chip-bg, #F4F4F5)',
            color: '#059669',
            flexShrink: 0,
          }}>
            <IconBookOpen size={16} />
          </div>
          <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <Typography.Text strong>知识库 Embedding 模型</Typography.Text>
              <Tag color="gold" style={{ fontSize: '10px' }}>
                影响 @知识库:xxx 检索
              </Tag>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)', marginTop: '4px', marginBottom: '12px' }}>
              知识库对上传文档进行语义检索时，依赖 embedding 模型生成向量。下方选择任一提供商的 embedding 模型（需勾选"作为 Embedding"），保存后下次上传的文档将使用该模型。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={embProviderDraft || undefined}
                onChange={(v) => { setEmbProviderDraft(v); setEmbModelDraft('') }}
                style={{ width: '200px' }}
                placeholder="提供商"
                options={providers.filter(p => p.enabled && p.apiKey).map(p => ({ value: p.id, label: p.name }))}
              />
              <Select
                value={embModelDraft || undefined}
                onChange={(v) => setEmbModelDraft(v)}
                style={{ width: '240px' }}
                placeholder={embProviderDraft ? '选择 embedding 模型' : '先选提供商'}
                disabled={!embProviderDraft}
                options={
                  embProviderDraft
                    ? (() => {
                        const p = providers.find(x => x.id === embProviderDraft)
                        if (!p) return []
                        return p.models
                          .filter(m => m.enabled && (m.supportsEmbedding || /embed/i.test(m.id)))
                          .map(m => ({
                            value: m.id,
                            label: (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {getModelIcon(m.icon)}
                                <span style={{ fontWeight: 500 }}>{m.name}</span>
                                {m.contextWindow && (
                                  <span style={{ color: 'var(--set-text-secondary, #8F959E)', fontSize: '11px' }}>
                                    · {m.contextWindow >= 1024 ? `${Math.round(m.contextWindow / 1024)}K` : m.contextWindow} ctx
                                  </span>
                                )}
                              </span>
                            )
                          }))
                      })()
                    : []
                }
              />
              <InputNumber
                value={embDimDraft ?? undefined}
                onChange={(v) => setEmbDimDraft(v ?? null)}
                placeholder="维度（可选）"
                min={64}
                max={4096}
                step={64}
                style={{ width: '120px' }}
              />
              <Switch
                checked={embEnabledDraft}
                onChange={setEmbEnabledDraft}
                checkedChildren="启用"
                unCheckedChildren="关闭"
              />
              <Button
                size="small"
                type="primary"
                onClick={handleSaveEmbedding}
                disabled={savingEmbedding || !embProviderDraft || !embModelDraft}
                icon={savingEmbedding ? <IconLoading size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              >
                保存
              </Button>
              <Button
                size="small"
                onClick={handleTestEmbedding}
                loading={testingEmbedding}
                icon={<IconMagic size={14} />}
              >
                测试 Embedding
              </Button>
            </div>
            {embedTestResult && (
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: embedTestResult.ok ? '#F6FFED' : '#FFF2F0',
                border: embedTestResult.ok ? '1px solid #B7EB8F' : '1px solid #FFCCC7',
                color: embedTestResult.ok ? '#389E0D' : '#DC2626',
              }}>
                {embedTestResult.ok ? (
                  <div>
                    <div>✅ {embedTestResult.msg}</div>
                    {embedTestResult.provider && <div style={{ marginTop: 4 }}>provider: <code>{embedTestResult.provider}</code> · model: <code>{embedTestResult.model}</code> · dim: <code>{embedTestResult.dim}</code></div>}
                    {embedTestResult.preview && (
                      <div style={{ marginTop: 4, fontSize: '11px' }}>
                        前 8 维: [{embedTestResult.preview.join(', ')}]
                      </div>
                    )}
                  </div>
                ) : (
                  <div>❌ {embedTestResult.msg}</div>
                )}
              </div>
            )}
            {embeddingConfig && !embedTestResult && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)' }}>
                当前：provider <code>{embeddingConfig.providerId}</code> · model <code>{embeddingConfig.model}</code>
                {embeddingConfig.dimension && <> · {embeddingConfig.dimension} 维</>}
                {embeddingConfig.enabled ? ' · 已启用' : ' · 已关闭'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 联网搜索配置：web_search / deep_research 工具的检索源 */}
      <Card style={{ border: '1px solid var(--set-card-border, #EDEEEF)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: 'var(--set-subcard-bg, #FAFAFA)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <IconGlobe size={18} color="#D46B08" />
          </div>
          <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <Typography.Text strong>联网搜索源</Typography.Text>
              <Tag color="orange" style={{ fontSize: '10px' }}>
                影响 web_search / 深度研究
              </Tag>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)', marginTop: '4px', marginBottom: '12px' }}>
              AI 助手联网搜索与深度研究（自动检索并沉淀知识）所用的提供商与协议。
              <strong style={{ color: 'var(--set-text, #18181B)' }}>智谱协议</strong>国内直连（自研引擎 + 搜狗/夸克，复用 GLM Key）；
              <strong style={{ color: 'var(--set-text, #18181B)' }}>Exa</strong> 语义检索质量高、有免费额度（dashboard.exa.ai 申请）；
              <strong style={{ color: 'var(--set-text, #18181B)' }}>AnySearch</strong> 统一实时搜索（网页 + 金融/学术等垂直领域 + 并行批量），免 Key 匿名可用；
              <strong style={{ color: 'var(--set-text, #18181B)' }}>内置本地引擎</strong> 在服务进程内聚合 Bing / 360 / DuckDuckGo，零 Key 零外部服务（桌面端开箱默认）。
              未配置时自动回退到 GLM 提供商或 SYSTEM_GLM_API_KEY。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Select
                value={wsProtocolDraft}
                onChange={(v) => {
                  const proto = v as 'zhipu' | 'exa' | 'anysearch' | 'local'
                  setWsProtocolDraft(proto)
                  // 切协议时重置引擎为该协议的默认值，避免把智谱引擎值带进其他协议
                  setWsEngineDraft(
                    proto === 'exa' ? 'auto' : proto === 'anysearch' ? '' : proto === 'local' ? 'all' : 'search_pro_sogou'
                  )
                }}
                style={{ width: '190px' }}
                options={[
                  { value: 'zhipu', label: '智谱协议' },
                  { value: 'exa', label: 'Exa（免费额度）' },
                  { value: 'anysearch', label: 'AnySearch（免 Key）' },
                  { value: 'local', label: '内置本地引擎（免 Key）' }
                ]}
              />
              {(wsProtocolDraft === 'exa' || wsProtocolDraft === 'anysearch') && (
                <Input.Password
                  value={wsExaKeyDraft}
                  onChange={(e) => setWsExaKeyDraft(e.target.value)}
                  placeholder={
                    (webSearchConfig?.apiKey || webSearchConfig?.exaApiKey)
                      ? `已设置（${(webSearchConfig.apiKey || webSearchConfig.exaApiKey || '').slice(0, 8)}…），输入新值可覆盖`
                      : wsProtocolDraft === 'anysearch'
                        ? 'AnySearch API Key（可选，匿名也可用）'
                        : '粘贴 Exa API Key'
                  }
                  style={{ width: '260px' }}
                  autoComplete="new-password"
                />
              )}
              {wsProtocolDraft !== 'anysearch' && wsProtocolDraft !== 'local' && (
                <Select
                  value={wsProviderDraft || undefined}
                  onChange={(v) => setWsProviderDraft(v)}
                  allowClear
                  style={{ width: '200px' }}
                  placeholder={wsProtocolDraft === 'exa' ? '提供商（可选，作兜底）' : '选择提供商'}
                  options={providers.filter(p => p.enabled && p.apiKey).map(p => ({ value: p.id, label: p.name }))}
                />
              )}
              {wsProtocolDraft !== 'anysearch' && (
                <Select
                  value={wsEngineDraft || undefined}
                  onChange={(v) => setWsEngineDraft(v)}
                  style={{ width: '180px' }}
                  placeholder={wsProtocolDraft === 'exa' ? '检索类型' : '搜索引擎'}
                  options={
                    wsProtocolDraft === 'exa'
                      ? [
                          { value: 'auto', label: '自动（Auto）' },
                          { value: 'neural', label: '语义（Neural）' },
                          { value: 'keyword', label: '关键词（Keyword）' }
                        ]
                      : wsProtocolDraft === 'local'
                        ? [
                            { value: 'all', label: '全部引擎（推荐）' },
                            { value: 'bing', label: '仅 Bing' },
                            { value: 'so360', label: '仅 360 搜索' },
                            { value: 'ddg', label: '仅 DuckDuckGo' }
                          ]
                        : [
                            { value: 'search_std', label: '标准版' },
                            { value: 'search_pro', label: '高级版（智谱自研）' },
                            { value: 'search_pro_sogou', label: '高级版（搜狗）' },
                            { value: 'search_pro_quark', label: '高级版（夸克）' }
                          ]
                  }
                />
              )}
              <InputNumber
                value={wsCountDraft}
                onChange={(v) => setWsCountDraft(v ?? 8)}
                min={1}
                max={50}
                style={{ width: '120px' }}
                addonAfter="条"
              />
              <Switch
                checked={wsEnabledDraft}
                onChange={setWsEnabledDraft}
                checkedChildren="启用"
                unCheckedChildren="关闭"
              />
              <Button
                size="small"
                type="primary"
                onClick={handleSaveWebSearch}
                disabled={
                  savingWebSearch ||
                  (wsProtocolDraft !== 'anysearch' &&
                    wsProtocolDraft !== 'local' &&
                    !wsProviderDraft &&
                    !((wsProtocolDraft === 'exa') && (wsExaKeyDraft.trim() || webSearchConfig?.apiKey || webSearchConfig?.exaApiKey)))
                }
                icon={savingWebSearch ? <IconLoading size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              >
                保存
              </Button>
            </div>
            {webSearchConfig && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--set-text-secondary, #8F959E)' }}>
                当前：{webSearchConfig.protocol === 'exa'
                  ? 'Exa 协议'
                  : webSearchConfig.protocol === 'anysearch'
                    ? 'AnySearch 协议'
                    : webSearchConfig.protocol === 'local'
                      ? '内置本地引擎'
                      : '智谱协议'}
                {(webSearchConfig.apiKey || webSearchConfig.exaApiKey) && (
                  <> · Key <code>{webSearchConfig.apiKey || webSearchConfig.exaApiKey}</code></>
                )}
                {webSearchConfig.providerId && <> · provider <code>{webSearchConfig.providerId}</code></>}
                {webSearchConfig.engine && <> · {webSearchConfig.protocol === 'exa' ? '类型' : '引擎'} <code>{webSearchConfig.engine}</code></>}
                {webSearchConfig.defaultCount && <> · {webSearchConfig.defaultCount} 条</>}
                {webSearchConfig.enabled ? ' · 已启用' : ' · 已关闭'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 知识库全局行为配置（上传/分块/GLM/检索/UI），所有魔数 admin 可调 */}
      <KnowledgeConfigCard />

      {/* AI 助手积分制度配置（token 计费 × 模型倍率 × 全局倍率） */}
      <Card style={{ border: '1px solid var(--set-card-border, #EDEEEF)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--set-chip-bg, #F4F4F5)', color: '#059669', flexShrink: 0,
          }}>
            <IconCurrency size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <Typography.Text strong>AI 助手积分制度</Typography.Text>
              <div style={{ flex: 1 }} />
              <Button size="small" type="primary" onClick={handleSaveCredit} loading={savingCredit} icon={!savingCredit ? <IconCheck size={14} /> : null}>
                保存
              </Button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--set-text-secondary, #8F959E)', marginTop: 4, marginBottom: 12 }}>
              每次 AI 回复按真实 token 计费：积分 =（输入 tokens + 输出 tokens × 输出权重）÷ 每积分token数 × 该模型倍率。
              <strong style={{ color: 'var(--set-text, #18181B)' }}>每个模型的倍率</strong>在「提供商 → 模型」里独立配（未配时按模型名启发式：flash/air=0.2、标准=1、旗舰=3）。
              ProPlus 不再无限使用，改为每月固定积分额度。
            </p>

            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--set-text-body, #646A73)', marginBottom: 6 }}>启用积分制</div>
                <Switch
                  checked={creditDraft.enabled}
                  onChange={(v) => setCredit('enabled', v)}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
                <div style={{ fontSize: 11, color: 'var(--set-text-secondary, #8F959E)', marginTop: 4 }}>关闭时回退旧的按次配额逻辑</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--set-text-body, #646A73)', marginBottom: 6 }}>输出权重</div>
                <InputNumber
                  min={1} max={20} step={0.5} precision={2}
                  value={creditDraft.outputWeight}
                  onChange={(v) => setCredit('outputWeight', Number(v) || 3)}
                  style={{ width: '100%' }}
                  addonAfter="×"
                />
                <div style={{ fontSize: 11, color: 'var(--set-text-secondary, #8F959E)', marginTop: 4 }}>输出 token 按输入 N 倍计价</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--set-text-body, #646A73)', marginBottom: 6 }}>每积分 token 数</div>
                <InputNumber
                  min={100} max={100000} step={100}
                  value={creditDraft.tokensPerCredit}
                  onChange={(v) => setCredit('tokensPerCredit', Number(v) || 1000)}
                  style={{ width: '100%' }}
                  addonAfter="tok"
                />
                <div style={{ fontSize: 11, color: 'var(--set-text-secondary, #8F959E)', marginTop: 4 }}>1 积分 = N 个基准 token</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--set-text-body, #646A73)', marginBottom: 6 }}>ProPlus 月度额度</div>
                <InputNumber
                  min={10} max={1000000} step={100}
                  value={creditDraft.plusMonthlyQuota}
                  onChange={(v) => setCredit('plusMonthlyQuota', Number(v) || 2000)}
                  style={{ width: '100%' }}
                  addonAfter="积分/月"
                />
                <div style={{ fontSize: 11, color: 'var(--set-text-secondary, #8F959E)', marginTop: 4 }}>ProPlus 每月积分（不再无限）</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--set-text-body, #646A73)', marginBottom: 6 }}>Pro 月度额度</div>
                <InputNumber
                  min={10} max={1000000} step={50}
                  value={creditDraft.proMonthlyQuota}
                  onChange={(v) => setCredit('proMonthlyQuota', Number(v) || 300)}
                  style={{ width: '100%' }}
                  addonAfter="积分/月"
                />
                <div style={{ fontSize: 11, color: 'var(--set-text-secondary, #8F959E)', marginTop: 4 }}>Pro 每月积分</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      </AdvancedSettingsSection>

      {/* 提供商列表：一张卡 + 行列表（点行展开明细） */}
      {providers.length === 0 ? (
        <EmptyState onAdd={() => { setEditing(null); setDialogOpen(true) }} />
      ) : (
        <Card
          data-provider-list
          style={{ border: '1px solid var(--set-card-border, #EDEEEF)' }}
          styles={{ body: { padding: 0 } }}
        >
          <style>{PROVIDER_ROW_CSS}</style>
          {providers.map(p => (
            <ProviderRow
              key={p.id}
              provider={p}
              expanded={expandedIds.has(p.id)}
              testing={testingRowId === p.id}
              onToggleExpand={() => toggleRowExpanded(p.id)}
              onEdit={() => { setEditing(p); setDialogOpen(true) }}
              onDelete={() => setDeleting(p)}
              onToggleDefault={() => handleToggleDefault(p)}
              onToggleEnabled={() => handleToggleEnabled(p)}
              onTest={() => handleRowTest(p)}
            />
          ))}
        </Card>
      )}

      {/* 编辑对话框 */}
      <ProviderDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        onSave={handleSave}
        editing={editing}
      />

      {/* 删除确认 */}
      <Modal
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        title="确认删除"
        rootClassName="ai-svc-portal"
        footer={
          <Space>
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button type="primary" danger onClick={handleDelete}>确认删除</Button>
          </Space>
        }
      >
        <Typography.Paragraph>
          确定要删除提供商「{deleting?.name}」吗？此操作不可撤销。
        </Typography.Paragraph>
      </Modal>
    </div>
  )
}

/**
 * 「高级设置」折叠区（2026-10-11）
 *
 * ── 为什么有它 ──
 * 用户原话：「AI 服务里面有些设置是可以移动进高级设置的，但是请你注意，以用户视角来设计」。
 * 普通用户进「AI 服务」只想干两件事：**选默认模型**、**连一个服务商（填 Key）**。
 * 而原先面板把知识库 Embedding 模型、联网搜索源、知识库全局行为配置（40+ 个魔数：
 * 上传上限 / 分块 / GLM OCR / 混合检索权重 / 分页 / 字段长度 / UI 行为 / 备份…）、
 * 积分制度全部平铺在最外层 —— 对普通用户是纯粹的噪音。
 *
 * 于是按「用户视角」分两层：日常动作常显，运维参数默认收起；需要的人点一下展开。
 *
 * ── 关键约束 ──
 * `collapsible=false`（= 管理后台 `/admin` 整页）时**直接透传 children**（Fragment，
 * 不新增任何 DOM 节点）：那页的视觉与结构保持零变化 —— 运维打开它就是来找这些参数的，
 * 藏起来只会多一次点击。
 *
 * ── 间距 ──
 * 展开体用 `flex column + gap 16` 复刻父级原本的 gap，因此内部各卡片原有的
 * `marginBottom` 叠加后与折叠前的间距**逐像素一致**（原来是 20+16，现在还是 20+16）。
 */
function AdvancedSettingsSection({
  collapsible,
  children,
}: {
  collapsible: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  // 非内嵌（管理后台整页）：原样渲染 —— 不折叠、不加分隔线、不包容器
  if (!collapsible) return <>{children}</>

  return (
    <div data-advanced-settings>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid var(--set-card-border, #EDEEEF)',
          paddingTop: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-advanced-settings-toggle
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--set-text-secondary, #8F959E)',
              transition: 'transform .15s ease',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <IconRight size={13} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--set-text-body, #52525B)' }}>
            高级设置
          </span>
          <span style={{ fontSize: 12, color: 'var(--set-text-secondary, #8F959E)' }}>
            知识库与积分等运维参数，日常使用无需修改
          </span>
        </button>
      </div>

      {open && (
        <div data-advanced-settings-body style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ============== 知识库全局行为配置 ==============
// 把 KnowledgeConfig（lib/ai/provider-resolver.ts）中所有魔数都暴露给 admin 调整
// 保存走 POST /api/knowledge/config（admin 鉴权），随后客户端 / 后端 getKnowledgeConfig() 自动 reload

const MB = 1024 * 1024

type KCDraft = {
  uploadLimits: { text: number; image: number; document: number; audio: number; video: number; other: number }
  maxExtractedChars: number
  chunking: { chunkSize: number; chunkOverlap: number; minChunkSize: number }
  glm: {
    autoOcr: boolean
    enableRerank: boolean
    ocrMaxPages: number
    ocrMaxChars: number
    rerankTopN: number
    rerankBlend: number
    fileSizeLimits: { image: number; document: number }
  }
  auto: { autoEmbed: boolean; embedTimeout: number }
  search: {
    hybridKeywordWeight: number
    defaultLimit: number
    recommendHistoryLimit: number
    recommendMaxResults: number
    tsVectorWeight: number
    highlightPadding: number
    highlightTailLength: number
    snippetPadding: { before: number; after: number }
    snippetMaxLen: number
    snippetWindowMultiplier: number
    maxCandidate: number
    queryMaxLength: number
    maxHighlights: number
    similarDefaultLimit: number
    minTokenLength: number
    recommendCandidateMultiplier: number
    requestOvershootMultiplier: number
  }
  list: {
    defaultLimit: number
    maxLimit: number
    backupDefaultLimit: number
    recommendationDefaultLimit: number
  }
  limits: {
    itemTitleMax: number
    collectionNameMax: number
    tagNameMax: number
    maxTagsPerItem: number
    summaryMax: number
  }
  ui: {
    listPageSize: number
    searchDebounceMs: number
    maxTagBadges: number
    maxRecommendationCards: number
    contextMaxChunks: number
    contextMaxChunkLength: number
    contextMaxChunksCeilingMin: number
    listPreviewChars: number
    recommendationPreviewChars: number
    createItemTextareaMinRows: number
    createItemTextareaMaxRows: number
    detailEditorTextareaMinRows: number
    detailEditorTextareaMaxRows: number
    backupListMaxHeight: number
    backupPollingIntervals: number[]
  }
  upload: {
    xlsxMaxRows: number
  }
  backup: {
    batchSize: number
  }
  embeddingTest: {
    maxTestTextChars: number
    vectorPreviewCount: number
    previewTextChars: number
  }
}

function toDraft(c: any): KCDraft {
  return {
    uploadLimits: { ...c.uploadLimits },
    maxExtractedChars: c.maxExtractedChars,
    chunking: { chunkSize: c.chunking.chunkSize, chunkOverlap: c.chunking.chunkOverlap, minChunkSize: c.chunking.minChunkSize },
    glm: {
      autoOcr: c.glm.autoOcr,
      enableRerank: c.glm.enableRerank,
      ocrMaxPages: c.glm.ocrMaxPages,
      ocrMaxChars: c.glm.ocrMaxChars,
      rerankTopN: c.glm.rerankTopN,
      rerankBlend: c.glm.rerankBlend,
      fileSizeLimits: { image: c.glm.fileSizeLimits?.image ?? 10 * MB, document: c.glm.fileSizeLimits?.document ?? 50 * MB }
    },
    auto: { autoEmbed: c.auto.autoEmbed, embedTimeout: c.auto.embedTimeout },
    search: {
      hybridKeywordWeight: c.search.hybridKeywordWeight,
      defaultLimit: c.search.defaultLimit,
      recommendHistoryLimit: c.search.recommendHistoryLimit,
      recommendMaxResults: c.search.recommendMaxResults,
      tsVectorWeight: c.search.tsVectorWeight,
      highlightPadding: c.search.highlightPadding,
      highlightTailLength: c.search.highlightTailLength ?? 20,
      snippetPadding: { ...c.search.snippetPadding },
      snippetMaxLen: c.search.snippetMaxLen,
      snippetWindowMultiplier: c.search.snippetWindowMultiplier ?? 10,
      maxCandidate: c.search.maxCandidate,
      queryMaxLength: c.search.queryMaxLength ?? 500,
      maxHighlights: c.search.maxHighlights ?? 2,
      similarDefaultLimit: c.search.similarDefaultLimit ?? 5,
      minTokenLength: c.search.minTokenLength ?? 2,
      recommendCandidateMultiplier: c.search.recommendCandidateMultiplier ?? 2,
      requestOvershootMultiplier: c.search.requestOvershootMultiplier ?? 2
    },
    list: {
      defaultLimit: c.list?.defaultLimit ?? 50,
      maxLimit: c.list?.maxLimit ?? 200,
      backupDefaultLimit: c.list?.backupDefaultLimit ?? 50,
      recommendationDefaultLimit: c.list?.recommendationDefaultLimit ?? 10
    },
    limits: {
      itemTitleMax: c.limits?.itemTitleMax ?? 500,
      collectionNameMax: c.limits?.collectionNameMax ?? 100,
      tagNameMax: c.limits?.tagNameMax ?? 50,
      maxTagsPerItem: c.limits?.maxTagsPerItem ?? 20,
      summaryMax: c.limits?.summaryMax ?? 200
    },
    ui: {
      listPageSize: c.ui.listPageSize,
      searchDebounceMs: c.ui.searchDebounceMs,
      maxTagBadges: c.ui.maxTagBadges,
      maxRecommendationCards: c.ui.maxRecommendationCards,
      contextMaxChunks: c.ui.contextMaxChunks,
      contextMaxChunkLength: c.ui.contextMaxChunkLength,
      contextMaxChunksCeilingMin: c.ui.contextMaxChunksCeilingMin ?? 20,
      listPreviewChars: c.ui.listPreviewChars ?? 100,
      recommendationPreviewChars: c.ui.recommendationPreviewChars ?? 60,
      createItemTextareaMinRows: c.ui.createItemTextareaMinRows ?? 6,
      createItemTextareaMaxRows: c.ui.createItemTextareaMaxRows ?? 20,
      detailEditorTextareaMinRows: c.ui.detailEditorTextareaMinRows ?? 12,
      detailEditorTextareaMaxRows: c.ui.detailEditorTextareaMaxRows ?? 30,
      backupListMaxHeight: c.ui.backupListMaxHeight ?? 280,
      backupPollingIntervals: Array.isArray(c.ui.backupPollingIntervals) ? c.ui.backupPollingIntervals : [1000, 4000]
    },
    upload: { xlsxMaxRows: c.upload?.xlsxMaxRows ?? 2000 },
    backup: { batchSize: c.backup?.batchSize ?? 200 },
    embeddingTest: {
      maxTestTextChars: c.embeddingTest?.maxTestTextChars ?? 1000,
      vectorPreviewCount: c.embeddingTest?.vectorPreviewCount ?? 8,
      previewTextChars: c.embeddingTest?.previewTextChars ?? 100
    }
  }
}

function KnowledgeConfigCard() {
  const [draft, setDraft] = useState<KCDraft | null>(null)
  const [defaults, setDefaults] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/config")
      if (!res.ok) return
      const data = await res.json()
      if (data.config) setDraft(toDraft(data.config))
      if (data.defaults) setDefaults(data.defaults)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const update = (mut: (d: KCDraft) => void) => {
    setDraft(prev => {
      if (!prev) return prev
      const next: KCDraft = JSON.parse(JSON.stringify(prev))
      mut(next)
      return next
    })
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch("/api/knowledge/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledgeConfig: draft })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "保存失败")
        return
      }
      toast.success("知识库配置已保存")
      if (data.config) setDraft(toDraft(data.config))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!defaults) return
    setDraft(toDraft(defaults))
  }

  if (!draft) {
    return (
      <Card style={{ marginBottom: 20, border: '1px solid var(--set-card-border, #EDEEEF)' }}>
        <div style={{ fontSize: 12, color: "var(--set-text-secondary, #8F959E)" }}>加载知识库配置中…</div>
      </Card>
    )
  }

  return (
    <Card style={{ marginBottom: 20, border: '1px solid var(--set-card-border, #EDEEEF)' }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "var(--set-chip-bg, #F4F4F5)",
          color: "#059669",
          flexShrink: 0,
        }}>
          <IconBookOpen size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <Typography.Text strong>知识库全局配置</Typography.Text>
            <Tag color="blue" style={{ fontSize: 10 }}>
              所有魔数都可调
            </Tag>
            <div style={{ flex: 1 }} />
            <Button size="small" onClick={() => setExpanded(v => !v)}>
              {expanded ? "收起" : "展开编辑"}
            </Button>
            <Button size="small" onClick={handleReset} disabled={saving || !defaults}>
              恢复默认
            </Button>
            <Button size="small" type="primary" onClick={handleSave} loading={saving} icon={!saving ? <IconCheck size={14} /> : null}>
              保存
            </Button>
          </div>
          <p style={{ fontSize: 12, color: "var(--set-text-secondary, #8F959E)", marginTop: 4, marginBottom: 12 }}>
            上传/分块/GLM-OCR/Rerank/检索/UI 行为全部可在此调整。改动立即对所有用户生效。
          </p>

          {/* 始终可见：核心开关 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 12 }}>
            <FieldSwitch
              label="GLM-OCR"
              hint="PDF/图片自动调用智谱解析"
              checked={draft.glm.autoOcr}
              onChange={(v) => update(d => { d.glm.autoOcr = v })}
            />
            <FieldSwitch
              label="GLM Rerank"
              hint="检索后用智谱重排序提升精度"
              checked={draft.glm.enableRerank}
              onChange={(v) => update(d => { d.glm.enableRerank = v })}
            />
            <FieldSwitch
              label="自动向量化"
              hint="上传后自动调用 embedding"
              checked={draft.auto.autoEmbed}
              onChange={(v) => update(d => { d.auto.autoEmbed = v })}
            />
          </div>

          {expanded && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {/* 上传上限 */}
              <ConfigGroup title="上传大小上限（MB）" icon="📁">
                <FieldNumber label="文本" value={Math.round(draft.uploadLimits.text / MB)} onChange={(v) => update(d => { d.uploadLimits.text = v * MB })} min={1} max={1024} />
                <FieldNumber label="图片" value={Math.round(draft.uploadLimits.image / MB)} onChange={(v) => update(d => { d.uploadLimits.image = v * MB })} min={1} max={1024} />
                <FieldNumber label="文档" value={Math.round(draft.uploadLimits.document / MB)} onChange={(v) => update(d => { d.uploadLimits.document = v * MB })} min={1} max={1024} />
                <FieldNumber label="音频" value={Math.round(draft.uploadLimits.audio / MB)} onChange={(v) => update(d => { d.uploadLimits.audio = v * MB })} min={1} max={1024} />
                <FieldNumber label="视频" value={Math.round(draft.uploadLimits.video / MB)} onChange={(v) => update(d => { d.uploadLimits.video = v * MB })} min={1} max={4096} />
                <FieldNumber label="其他" value={Math.round(draft.uploadLimits.other / MB)} onChange={(v) => update(d => { d.uploadLimits.other = v * MB })} min={1} max={1024} />
                <FieldNumber label="提取最大字符" value={Math.round(draft.maxExtractedChars / 1000)} onChange={(v) => update(d => { d.maxExtractedChars = v * 1000 })} min={10} max={5000} suffix="K" />
              </ConfigGroup>

              {/* 分块 */}
              <ConfigGroup title="Embedding 分块" icon="✂️">
                <FieldNumber label="块大小" value={draft.chunking.chunkSize} onChange={(v) => update(d => { d.chunking.chunkSize = v })} min={50} max={4000} />
                <FieldNumber label="重叠字符" value={draft.chunking.chunkOverlap} onChange={(v) => update(d => { d.chunking.chunkOverlap = v })} min={0} max={500} />
                <FieldNumber label="最小块" value={draft.chunking.minChunkSize} onChange={(v) => update(d => { d.chunking.minChunkSize = v })} min={10} max={500} />
                <FieldNumber label="嵌入超时(秒)" value={draft.auto.embedTimeout} onChange={(v) => update(d => { d.auto.embedTimeout = v })} min={5} max={120} />
              </ConfigGroup>

              {/* GLM 集成 */}
              <ConfigGroup title="GLM 集成" icon="🧠">
                <FieldNumber label="OCR 最大页数" value={draft.glm.ocrMaxPages} onChange={(v) => update(d => { d.glm.ocrMaxPages = v })} min={1} max={500} />
                <FieldNumber label="OCR 截断(K字符)" value={Math.round(draft.glm.ocrMaxChars / 1000)} onChange={(v) => update(d => { d.glm.ocrMaxChars = v * 1000 })} min={50} max={5000} />
                <FieldNumber label="OCR 图片上限(MB)" value={Math.round(draft.glm.fileSizeLimits.image / MB)} onChange={(v) => update(d => { d.glm.fileSizeLimits.image = v * MB })} min={1} max={50} />
                <FieldNumber label="OCR 文档上限(MB)" value={Math.round(draft.glm.fileSizeLimits.document / MB)} onChange={(v) => update(d => { d.glm.fileSizeLimits.document = v * MB })} min={1} max={200} />
                <FieldNumber label="Rerank 候选上限" value={draft.glm.rerankTopN} onChange={(v) => update(d => { d.glm.rerankTopN = v })} min={1} max={128} />
                <FieldNumberFloat label="Rerank 混合权重" value={draft.glm.rerankBlend} onChange={(v) => update(d => { d.glm.rerankBlend = v })} min={0} max={1} step={0.05} />
              </ConfigGroup>

              {/* 检索 */}
              <ConfigGroup title="混合检索" icon="🔍">
                <FieldNumberFloat label="关键词权重" value={draft.search.hybridKeywordWeight} onChange={(v) => update(d => { d.search.hybridKeywordWeight = v })} min={0} max={1} step={0.05} />
                <FieldNumber label="默认 limit" value={draft.search.defaultLimit} onChange={(v) => update(d => { d.search.defaultLimit = v })} min={1} max={200} />
                <FieldNumber label="子检索上限" value={draft.search.maxCandidate} onChange={(v) => update(d => { d.search.maxCandidate = v })} min={5} max={500} />
                <FieldNumber label="tsvector 倍数" value={draft.search.tsVectorWeight} onChange={(v) => update(d => { d.search.tsVectorWeight = v })} min={0} max={10} step={0.1} />
                <FieldNumber label="高亮前缀" value={draft.search.highlightPadding} onChange={(v) => update(d => { d.search.highlightPadding = v })} min={5} max={200} />
                <FieldNumber label="高亮尾部" value={draft.search.highlightTailLength} onChange={(v) => update(d => { d.search.highlightTailLength = v })} min={0} max={200} />
                <FieldNumber label="高亮片段数" value={draft.search.maxHighlights} onChange={(v) => update(d => { d.search.maxHighlights = v })} min={1} max={10} />
                <FieldNumber label="高亮窗口乘数" value={draft.search.snippetWindowMultiplier} onChange={(v) => update(d => { d.search.snippetWindowMultiplier = v })} min={1} max={50} />
                <FieldNumber label="token 最小长度" value={draft.search.minTokenLength} onChange={(v) => update(d => { d.search.minTokenLength = v })} min={1} max={8} />
                <FieldNumber label="相似推荐默认" value={draft.search.similarDefaultLimit} onChange={(v) => update(d => { d.search.similarDefaultLimit = v })} min={1} max={50} />
                <FieldNumber label="摘要最大长度" value={draft.search.snippetMaxLen} onChange={(v) => update(d => { d.search.snippetMaxLen = v })} min={50} max={2000} />
                <FieldNumber label="摘要前缀" value={draft.search.snippetPadding.before} onChange={(v) => update(d => { d.search.snippetPadding.before = v })} min={5} max={500} />
                <FieldNumber label="摘要后缀" value={draft.search.snippetPadding.after} onChange={(v) => update(d => { d.search.snippetPadding.after = v })} min={5} max={500} />
                <FieldNumber label="推荐历史数" value={draft.search.recommendHistoryLimit} onChange={(v) => update(d => { d.search.recommendHistoryLimit = v })} min={1} max={200} />
                <FieldNumber label="推荐最大数" value={draft.search.recommendMaxResults} onChange={(v) => update(d => { d.search.recommendMaxResults = v })} min={1} max={50} />
                <FieldNumber label="推荐候选倍数" value={draft.search.recommendCandidateMultiplier} onChange={(v) => update(d => { d.search.recommendCandidateMultiplier = v })} min={1} max={10} step={1} />
                <FieldNumber label="请求 limit 放大倍数" value={draft.search.requestOvershootMultiplier} onChange={(v) => update(d => { d.search.requestOvershootMultiplier = v })} min={1} max={10} step={1} />
                <FieldNumber label="query 最大长度" value={draft.search.queryMaxLength} onChange={(v) => update(d => { d.search.queryMaxLength = v })} min={10} max={2000} />
              </ConfigGroup>

              {/* 列表分页 */}
              <ConfigGroup title="列表分页" icon="📄">
                <FieldNumber label="items 默认 limit" value={draft.list.defaultLimit} onChange={(v) => update(d => { d.list.defaultLimit = v })} min={5} max={500} />
                <FieldNumber label="items 最大 limit" value={draft.list.maxLimit} onChange={(v) => update(d => { d.list.maxLimit = v })} min={10} max={2000} />
                <FieldNumber label="备份默认 limit" value={draft.list.backupDefaultLimit} onChange={(v) => update(d => { d.list.backupDefaultLimit = v })} min={5} max={500} />
                <FieldNumber label="推荐缓存默认 limit" value={draft.list.recommendationDefaultLimit} onChange={(v) => update(d => { d.list.recommendationDefaultLimit = v })} min={5} max={200} />
              </ConfigGroup>

              {/* 字段长度上限 */}
              <ConfigGroup title="字段长度上限（API 校验）" icon="📏">
                <FieldNumber label="条目 title 最大" value={draft.limits.itemTitleMax} onChange={(v) => update(d => { d.limits.itemTitleMax = v })} min={20} max={2000} />
                <FieldNumber label="集合 name 最大" value={draft.limits.collectionNameMax} onChange={(v) => update(d => { d.limits.collectionNameMax = v })} min={10} max={500} />
                <FieldNumber label="标签 name 最大" value={draft.limits.tagNameMax} onChange={(v) => update(d => { d.limits.tagNameMax = v })} min={5} max={200} />
                <FieldNumber label="单条最大 tag 数" value={draft.limits.maxTagsPerItem} onChange={(v) => update(d => { d.limits.maxTagsPerItem = v })} min={1} max={100} />
                <FieldNumber label="摘要 maxLength" value={draft.limits.summaryMax} onChange={(v) => update(d => { d.limits.summaryMax = v })} min={20} max={2000} />
              </ConfigGroup>

              {/* UI */}
              <ConfigGroup title="UI 行为" icon="🪟">
                <FieldNumber label="列表分页" value={draft.ui.listPageSize} onChange={(v) => update(d => { d.ui.listPageSize = v })} min={10} max={1000} />
                <FieldNumber label="搜索防抖(ms)" value={draft.ui.searchDebounceMs} onChange={(v) => update(d => { d.ui.searchDebounceMs = v })} min={0} max={2000} step={50} />
                <FieldNumber label="标签云上限" value={draft.ui.maxTagBadges} onChange={(v) => update(d => { d.ui.maxTagBadges = v })} min={3} max={100} />
                <FieldNumber label="推荐卡片上限" value={draft.ui.maxRecommendationCards} onChange={(v) => update(d => { d.ui.maxRecommendationCards = v })} min={1} max={20} />
                <FieldNumber label="AI 上下文 chunks" value={draft.ui.contextMaxChunks} onChange={(v) => update(d => { d.ui.contextMaxChunks = v })} min={1} max={50} />
                <FieldNumber label="每 chunk 长度" value={draft.ui.contextMaxChunkLength} onChange={(v) => update(d => { d.ui.contextMaxChunkLength = v })} min={100} max={5000} step={50} />
                <FieldNumber label="context API 硬下限" value={draft.ui.contextMaxChunksCeilingMin} onChange={(v) => update(d => { d.ui.contextMaxChunksCeilingMin = v })} min={1} max={200} />
                <FieldNumber label="列表预览字符" value={draft.ui.listPreviewChars} onChange={(v) => update(d => { d.ui.listPreviewChars = v })} min={20} max={500} step={10} />
                <FieldNumber label="推荐预览字符" value={draft.ui.recommendationPreviewChars} onChange={(v) => update(d => { d.ui.recommendationPreviewChars = v })} min={10} max={300} step={10} />
              </ConfigGroup>

              {/* 详情 / 创建 TextArea 行数 */}
              <ConfigGroup title="编辑 / 创建行数" icon="📝">
                <FieldNumber label="创建-最小行" value={draft.ui.createItemTextareaMinRows} onChange={(v) => update(d => { d.ui.createItemTextareaMinRows = v })} min={2} max={30} />
                <FieldNumber label="创建-最大行" value={draft.ui.createItemTextareaMaxRows} onChange={(v) => update(d => { d.ui.createItemTextareaMaxRows = v })} min={5} max={100} />
                <FieldNumber label="详情-最小行" value={draft.ui.detailEditorTextareaMinRows} onChange={(v) => update(d => { d.ui.detailEditorTextareaMinRows = v })} min={2} max={50} />
                <FieldNumber label="详情-最大行" value={draft.ui.detailEditorTextareaMaxRows} onChange={(v) => update(d => { d.ui.detailEditorTextareaMaxRows = v })} min={5} max={200} />
              </ConfigGroup>

              {/* 备份 */}
              <ConfigGroup title="备份" icon="💾">
                <FieldNumber label="单次拉取 batch" value={draft.backup.batchSize} onChange={(v) => update(d => { d.backup.batchSize = v })} min={10} max={2000} step={50} />
                <FieldNumber label="列表最大高度(px)" value={draft.ui.backupListMaxHeight} onChange={(v) => update(d => { d.ui.backupListMaxHeight = v })} min={120} max={2000} step={20} />
                <FieldIntervals
                  label="轮询刷新间隔(ms)"
                  value={draft.ui.backupPollingIntervals}
                  onChange={(v) => update(d => { d.ui.backupPollingIntervals = v })}
                />
              </ConfigGroup>

              {/* Embedding 测试 */}
              <ConfigGroup title="Embedding 测试" icon="🧪">
                <FieldNumber label="测试文本最大字符" value={draft.embeddingTest.maxTestTextChars} onChange={(v) => update(d => { d.embeddingTest.maxTestTextChars = v })} min={50} max={10000} step={50} />
                <FieldNumber label="向量预览维度数" value={draft.embeddingTest.vectorPreviewCount} onChange={(v) => update(d => { d.embeddingTest.vectorPreviewCount = v })} min={1} max={32} />
                <FieldNumber label="text 预览字符" value={draft.embeddingTest.previewTextChars} onChange={(v) => update(d => { d.embeddingTest.previewTextChars = v })} min={20} max={500} step={10} />
              </ConfigGroup>

              {/* 上传解析 */}
              <ConfigGroup title="上传解析" icon="📥">
                <FieldNumber label="XLSX 每 sheet 行数上限" value={draft.upload.xlsxMaxRows} onChange={(v) => update(d => { d.upload.xlsxMaxRows = v })} min={100} max={50000} step={100} />
              </ConfigGroup>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function ConfigGroup({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid var(--set-card-border, #EDEEEF)",
      borderRadius: 6,
      padding: 12,
      backgroundColor: "var(--set-subcard-bg, #FAFAFA)"
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--set-text-body, #646A73)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
        {icon && <span>{icon}</span>}<span>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{children}</div>
    </div>
  )
}

function FieldNumber({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--set-text-secondary, #8F959E)" }}>{label}{suffix ? `(${suffix})` : ""}</span>
      <InputNumber
        size="small"
        value={value}
        onChange={(v) => v !== null && onChange(Number(v))}
        min={min}
        max={max}
        step={step ?? 1}
        style={{ width: "100%" }}
      />
    </div>
  )
}

function FieldNumberFloat({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--set-text-secondary, #8F959E)" }}>{label}</span>
      <InputNumber
        size="small"
        value={value}
        onChange={(v) => v !== null && onChange(Number(v))}
        min={min}
        max={max}
        step={step ?? 0.1}
        style={{ width: "100%" }}
      />
    </div>
  )
}

function FieldSwitch({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Switch size="small" checked={checked} onChange={onChange} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--set-text-body, #646A73)" }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: "var(--set-text-secondary, #8F959E)" }}>{hint}</div>}
      </div>
    </div>
  )
}

/**
 * 数组配置（用于 backupPollingIntervals 等 number[] 类型的字段）
 * 逗号分隔输入，新增/删除自动同步
 */
function FieldIntervals({ label, value, onChange }: {
  label: string; value: number[]; onChange: (v: number[]) => void
}) {
  const text = (Array.isArray(value) ? value : []).join(", ")
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, gridColumn: "1 / -1" }}>
      <span style={{ fontSize: 11, color: "var(--set-text-secondary, #8F959E)" }}>{label}</span>
      <Input
        size="small"
        value={text}
        placeholder="例如: 1000, 4000"
        onChange={(e) => {
          const arr = e.target.value
            .split(/[，,]/)
            .map(s => Number(s.trim()))
            .filter(n => Number.isFinite(n) && n >= 0)
          onChange(arr)
        }}
        style={{ width: "100%" }}
      />
    </div>
  )
}
