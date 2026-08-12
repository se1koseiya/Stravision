"use client"

import React, { useEffect, useState } from "react"
import { Card, Button, Typography, Flex, Form, InputNumber, Input, Select, Switch } from "antd"
import { CheckCircle2 } from "lucide-react"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const { Text, Paragraph } = Typography

// ====== 类型定义 ======

export interface CheckpointParamField {
  key: string
  label: string
  type: "number" | "text" | "select" | "switch"
  unit?: string
  default?: string | number | boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string | number }[]
  required?: boolean
  help?: string
}

export interface CheckpointOption {
  id: string
  label: string
  description?: string
  recommended?: boolean
  submit_form?: boolean
}

export interface CheckpointConsequences {
  positive?: string[]
  negative?: string[]
  reversibility?: "reversible" | "partial" | "irreversible"
  recovery_cost?: "low" | "medium" | "high"
}

export interface CheckpointData {
  id: string
  type: "decision" | "irreversible" | "missing_info" | "complexity"
  title: string
  description?: string
  current_operation?: string
  consequences?: CheckpointConsequences
  options?: CheckpointOption[]
  missing_params?: string[]
  param_fields?: CheckpointParamField[]
  task_list_ref?: string
}

interface CheckpointConfirmProps {
  data: CheckpointData
  onChoose: (optionId: string, optionLabel: string, data: CheckpointData, formData?: Record<string, string | number | boolean>) => void
  isResolved?: boolean
  resolvedOptionId?: string
}

// ====== 类型/可逆性 标签映射（极简：仅文字，无彩色 Tag）======

const TYPE_LABEL: Record<CheckpointData["type"], string> = {
  decision: "决策",
  irreversible: "不可逆",
  missing_info: "信息确认",
  complexity: "复杂操作",
}

const REVERSIBILITY_LABEL: Record<NonNullable<CheckpointConsequences["reversibility"]>, string> = {
  reversible: "可逆",
  partial: "部分可逆",
  irreversible: "不可逆",
}

const RECOVERY_COST_LABEL: Record<NonNullable<CheckpointConsequences["recovery_cost"]>, string> = {
  low: "低恢复成本",
  medium: "中恢复成本",
  high: "高恢复成本",
}

const ICON_STROKE = 1.75

// ====== 主组件（简约风格：白底 / 单色 / Ant Design 默认样式）======

export function CheckpointConfirm({
  data,
  onChoose,
  isResolved = false,
  resolvedOptionId,
}: CheckpointConfirmProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(resolvedOptionId)
  const [form] = Form.useForm()
  const consequences = data.consequences || {}
  const options = data.options || []
  const paramFields = data.param_fields || []
  const hasForm = paramFields.length > 0

  // 初始化表单默认值
  useEffect(() => {
    if (hasForm) {
      const defaults: Record<string, string | number | boolean> = {}
      paramFields.forEach((f) => {
        if (f.default !== undefined) defaults[f.key] = f.default
      })
      form.setFieldsValue(defaults)
    }
  }, [data.id, hasForm, form, paramFields])

  const handleChoose = async (optionId: string) => {
    if (isResolved) return
    const opt = options.find((o) => o.id === optionId)
    setSelectedId(optionId)

    // 如果此选项需要提交表单，先验证并收集表单数据
    if (opt?.submit_form && hasForm) {
      try {
        const values = await form.validateFields()
        onChoose(optionId, opt?.label || optionId, data, values as Record<string, string | number | boolean>)
      } catch {
        return
      }
    } else {
      onChoose(optionId, opt?.label || optionId, data)
    }
  }

  // 渲染单个表单字段
  const renderField = (field: CheckpointParamField) => {
    switch (field.type) {
      case "number":
        return (
          <InputNumber
            style={{ width: "100%" }}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            addonAfter={field.unit}
            disabled={isResolved}
          />
        )
      case "select":
        return (
          <Select
            options={field.options}
            placeholder={field.placeholder || "请选择"}
            disabled={isResolved}
            allowClear={!field.required}
          />
        )
      case "switch":
        return <Switch disabled={isResolved} />
      case "text":
      default:
        return <Input placeholder={field.placeholder} disabled={isResolved} />
    }
  }

  return (
    <Card
      size="small"
      style={{
        background: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: 10,
        boxShadow: "none",
        opacity: isResolved ? 0.7 : 1,
      }}
      styles={{ body: { padding: 16 } }}
    >
      {/* 头部：标题 + 类型小字 */}
      <Flex align="center" justify="space-between" gap={8} style={{ marginBottom: 6 }}>
        <Text strong style={{ fontSize: 14, color: "#262626" }}>
          {data.title || "确认信息"}
        </Text>
        <Text style={{ fontSize: 11, color: "#bfbfbf" }}>
          {TYPE_LABEL[data.type] || "确认"}
        </Text>
      </Flex>

      {/* 描述 */}
      {data.description && (
        <Paragraph
          style={{
            fontSize: 13,
            color: "#8c8c8c",
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          {data.description}
        </Paragraph>
      )}

      {/* 当前操作 */}
      {data.current_operation && (
        <div
          style={{
            padding: "8px 10px",
            background: "#fafafa",
            borderRadius: 6,
            border: "1px solid #f0f0f0",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 11, color: "#8c8c8c" }}>即将执行</Text>
          <div style={{ fontSize: 13, color: "#262626", marginTop: 2 }}>
            {data.current_operation}
          </div>
        </div>
      )}

      {/* 缺失参数（仅 missing_info 类型且未提供 param_fields 时展示纯文本列表） */}
      {data.type === "missing_info" && data.missing_params && data.missing_params.length > 0 && !hasForm && (
        <div style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: "#595959" }}>缺失参数：</Text>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {data.missing_params.map((p, i) => (
              <li key={i} style={{ fontSize: 12, color: "#8c8c8c", lineHeight: 1.8 }}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 参数表单 */}
      {hasForm && (
        <Form
          form={form}
          layout="vertical"
          size="small"
          disabled={isResolved}
          style={{ marginBottom: 12 }}
        >
          {paramFields.map((field) => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={
                <span style={{ fontSize: 12, color: "#262626" }}>
                  {field.label}
                  {field.unit && (
                    <Text style={{ fontSize: 11, color: "#bfbfbf", marginLeft: 4, fontWeight: 400 }}>
                      （{field.unit}）
                    </Text>
                  )}
                </span>
              }
              rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : []}
              help={field.help ? <span style={{ fontSize: 11, color: "#bfbfbf" }}>{field.help}</span> : undefined}
              style={{ marginBottom: 12 }}
            >
              {renderField(field)}
            </Form.Item>
          ))}
        </Form>
      )}

      {/* 后果评估（极简：仅可逆性 + 恢复成本，单行文字）*/}
      {(consequences.reversibility || consequences.recovery_cost) && (
        <div style={{ marginBottom: 12, fontSize: 11, color: "#bfbfbf" }}>
          {consequences.reversibility && (
            <span style={{ marginRight: 12 }}>
              {REVERSIBILITY_LABEL[consequences.reversibility]}
            </span>
          )}
          {consequences.recovery_cost && (
            <span>{RECOVERY_COST_LABEL[consequences.recovery_cost]}</span>
          )}
        </div>
      )}

      {/* 选项按钮 */}
      <Flex vertical gap={8}>
        {options.map((opt) => {
          const isSelected = selectedId === opt.id
          const isCancel = opt.id === "CANCEL"
          const isDisabled = isResolved && !isSelected

          return (
            <Button
              key={opt.id}
              block
              disabled={isDisabled}
              onClick={() => handleChoose(opt.id)}
              style={{
                height: "auto",
                padding: "9px 12px",
                textAlign: "left",
                borderRadius: 8,
                border: `1px solid ${isSelected ? BERRY_THEME.primary : "#f0f0f0"}`,
                background: isSelected ? BERRY_THEME.primaryLight : "#fff",
                opacity: isDisabled ? 0.5 : 1,
              }}
              type="text"
            >
              <Flex align="center" justify="space-between" gap={8}>
                <Flex vertical gap={0} style={{ minWidth: 0, flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: isCancel ? BERRY_THEME.status.error : "#262626",
                    }}
                  >
                    {opt.label}
                  </Text>
                  {opt.description && (
                    <Text style={{ fontSize: 11, color: "#bfbfbf", lineHeight: 1.4 }}>
                      {opt.description}
                    </Text>
                  )}
                </Flex>
                {opt.recommended && !isSelected && (
                  <Text style={{ fontSize: 11, color: BERRY_THEME.primary, flexShrink: 0 }}>
                    推荐
                  </Text>
                )}
                {isSelected && (
                  <CheckCircle2
                    size={14}
                    strokeWidth={ICON_STROKE}
                    color={BERRY_THEME.primary}
                    style={{ flexShrink: 0 }}
                  />
                )}
              </Flex>
            </Button>
          )
        })}
      </Flex>

      {/* 已决状态提示 */}
      {isResolved && selectedId && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "#bfbfbf",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CheckCircle2 size={12} strokeWidth={ICON_STROKE} color={BERRY_THEME.status.success} />
          <span>已确认：{options.find((o) => o.id === selectedId)?.label || selectedId}</span>
        </div>
      )}

      {/* 关联任务 */}
      {data.task_list_ref && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#d9d9d9" }}>
          关联任务：{data.task_list_ref}
        </div>
      )}
    </Card>
  )
}

// ====== 解析 <CHECKPOINT> 标签内容 ======

export function parseCheckpointContent(content: string): CheckpointData | null {
  if (!content) return null

  // 1) 优先匹配 <CHECKPOINT>...</CHECKPOINT> 包裹的标准格式（流式结束后命中）
  const taggedMatch = content.match(/<\s*CHECKPOINT\s*>([\s\S]*?)<\s*\/\s*CHECKPOINT\s*>/i)
  if (taggedMatch) {
    const parsed = tryParseCheckpointJson(taggedMatch[1].trim())
    if (parsed) return parsed
  }

  // 1.5) 流式中 <CHECKPOINT> 开标签已出现但闭合标签未到：提取开标签后到末尾的 JSON
  //      避免流式过程中走裸 JSON 路径因 id 前缀不匹配而漏掉
  const openOnlyMatch = content.match(/<\s*CHECKPOINT\s*>([\s\S]*?)$/i)
  if (openOnlyMatch) {
    const parsed = tryParseCheckpointJson(openOnlyMatch[1].trim())
    if (parsed) return parsed
  }

  // 2) 兜底：识别裸 JSON（AI 偶发不包标签），形如
  //    {"id":"cp-xxx","type":"missing_info","title":"...","param_fields":[...], ...}
  //    放宽 id 前缀：除 cp_ / cp- 外，兼容 checkpoint_ / cp. 等变体，以及无 id 但有 type 的形态
  //    先用正则定位起点，再用字符串感知的括号深度扫描找到匹配的闭合 }
  const startMatch = content.match(/\{\s*"\s*id\s*"\s*:\s*"(?:cp[_\-.]|checkpoint[_\-.])[\w\-.]+"/i)
    || content.match(/\{\s*"\s*type\s*"\s*:\s*"(?:decision|irreversible|missing_info|complexity)"/i)
  if (startMatch && startMatch.index !== undefined) {
    const start = startMatch.index
    const end = findBalancedJsonEnd(content, start)
    if (end > start) {
      // 正常情况：找到平衡的闭合 }
      const fullJson = content.slice(start, end + 1)
      const parsed = tryParseCheckpointJson(fullJson)
      if (parsed) return parsed
    } else {
      // 严重截断（无平衡闭合 }）：取到内容末尾，交给容错修复尝试补全
      const fullJson = content.slice(start)
      const parsed = tryParseCheckpointJson(fullJson)
      if (parsed) return parsed
    }
  }
  return null
}

/**
 * 字符串感知的括号平衡扫描：从 start 位置的 { 开始，找到匹配的闭合 } 的索引。
 * 必须正确处理字符串内的 { } 和 \" 转义，否则会被字符串中的括号误导。
 * 返回 -1 表示未找到平衡的闭合（JSON 被严重截断）。
 */
function findBalancedJsonEnd(content: string, start: number): number {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < content.length; i++) {
    const ch = content[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * 通用 JSON 解析 + 修复函数
 * 尝试原始 JSON.parse，失败后生成修复候选（尾部截断/内嵌引号/未闭合括号）再尝试
 * 供 CHECKPOINT / CLARIFY / DECISION 等标签共用
 */
export function tryParseJsonWithRepair<T = any>(raw: string): T | null {
  if (!raw) return null
  const candidates = [raw, ...generateRepairedCandidates(raw)]
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === "object") {
        return parsed as T
      }
    } catch {}
  }
  return null
}

function tryParseCheckpointJson(raw: string): CheckpointData | null {
  const parsed = tryParseJsonWithRepair<any>(raw)
  return parsed ? normalizeCheckpoint(parsed) : null
}

/**
 * 生成修复后的 JSON 候选字符串，处理 AI 输出常见的 JSON 畸形：
 * 1. 尾部截断的键（如 "options"} 缺少值）
 * 2. 未转义的内嵌双引号（如 "若无则填"无"" ）
 * 3. 未闭合的数组/对象
 */
function generateRepairedCandidates(raw: string): string[] {
  const candidates: string[] = []
  const s = raw.trim()

  // 修复 1：尾部截断的键值对，形如 ,"key"} 或 ,"key"
  // 原因：AI 输出被截断，只输出了 key 没输出 value
  const strippedTrailingKey = s.replace(/,\s*"[^"]*"\s*\}\s*$/, "}")
  if (strippedTrailingKey !== s) {
    candidates.push(strippedTrailingKey)
  }

  // 修复 2：未转义的内嵌双引号
  // 启发式：扫描 JSON，识别 "key":"value" 模式，把 value 中非边界位置的 " 转义为 \"
  const escapedQuotes = tryEscapeInnerQuotes(s)
  if (escapedQuotes && escapedQuotes !== s) {
    candidates.push(escapedQuotes)
    // 组合修复 1+2
    const combined = escapedQuotes.replace(/,\s*"[^"]*"\s*\}\s*$/, "}")
    if (combined !== escapedQuotes) candidates.push(combined)
    // 组合修复 2+3
    const closedEscaped = tryCloseUnclosedBrackets(escapedQuotes)
    if (closedEscaped && closedEscaped !== escapedQuotes) candidates.push(closedEscaped)
  }

  // 修复 3：补全未闭合的 } 和 ]
  const closed = tryCloseUnclosedBrackets(s)
  if (closed && closed !== s) {
    candidates.push(closed)
    const closed2 = tryCloseUnclosedBrackets(strippedTrailingKey)
    if (closed2 && closed2 !== strippedTrailingKey) candidates.push(closed2)
  }

  return candidates
}

/**
 * 尝试转义字符串值内部的裸双引号。
 * 策略：遍历字符串，当在字符串内遇到 " 时，检查其后第一个非空白字符：
 *   若为 , : } ] 之一（或到达末尾），认为是字符串边界；否则认为是内嵌引号，转义为 \"。
 * 仅在 JSON.parse 失败时调用，因此对合法 JSON 不会有副作用。
 */
function tryEscapeInnerQuotes(s: string): string | null {
  let result = ""
  let inString = false
  let escape = false
  let modified = false
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (escape) { result += ch; escape = false; i++; continue }
    if (ch === "\\") { result += ch; escape = true; i++; continue }
    if (ch === '"') {
      if (!inString) {
        inString = true
        result += ch
        i++
        continue
      }
      // 在字符串内，判断是否为字符串结束
      let j = i + 1
      while (j < s.length && /\s/.test(s[j])) j++
      const nextCh = s[j]
      if (nextCh === "," || nextCh === ":" || nextCh === "}" || nextCh === "]" || j >= s.length) {
        inString = false
        result += ch
        i++
      } else {
        // 内嵌引号，转义
        result += '\\"'
        modified = true
        i++
      }
      continue
    }
    result += ch
    i++
  }
  return modified ? result : null
}

/**
 * 尝试补全未闭合的 } 和 ]（处理 AI 输出被截断的情况）。
 */
function tryCloseUnclosedBrackets(s: string): string | null {
  let braceDepth = 0
  let bracketDepth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") braceDepth++
    else if (ch === "}") braceDepth--
    else if (ch === "[") bracketDepth++
    else if (ch === "]") bracketDepth--
  }
  if (braceDepth === 0 && bracketDepth === 0) return null
  // 移除可能的尾部逗号后补全闭合符号
  let result = s.replace(/,\s*$/, "")
  for (let i = 0; i < bracketDepth; i++) result += "]"
  for (let i = 0; i < braceDepth; i++) result += "}"
  return result
}

/**
 * 规范化 checkpoint 数据：
 * - 校验必需特征字段
 * - 为 missing_info + 有 param_fields 但无 options 的卡片补全默认提交/取消选项
 */
function normalizeCheckpoint(parsed: any): CheckpointData | null {
  if (!parsed || typeof parsed !== "object") return null
  if (!(parsed.id || parsed.title)) return null
  if (!(parsed.type || parsed.param_fields || parsed.options)) return null

  // 为 missing_info 卡片补全默认选项（提交 + 取消），确保表单可提交
  if (
    parsed.type === "missing_info" &&
    Array.isArray(parsed.param_fields) &&
    parsed.param_fields.length > 0 &&
    (!Array.isArray(parsed.options) || parsed.options.length === 0)
  ) {
    parsed.options = [
      { id: "SUBMIT", label: "提交信息", description: "提交填写的信息继续", recommended: true, submit_form: true },
      { id: "CANCEL", label: "取消" },
    ]
  }

  return parsed as CheckpointData
}

// ====== 从消息内容中移除 CHECKPOINT 标签 ======

export function stripCheckpointTags(content: string): string {
  if (!content) return content
  return content
    .replace(/<\s*CHECKPOINT\s*>[\s\S]*?<\s*\/\s*CHECKPOINT\s*>/gi, "")
    .replace(/<\s*CHECKPOINT[\s\S]*?$/gi, "")
    .trim()
}
