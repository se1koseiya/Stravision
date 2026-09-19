"use client"

import React, { useEffect, useState } from "react"
import { Card, Button, Typography, Flex, Form, InputNumber, Input, Select, Switch, Tag } from "antd"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import type { CheckpointParamField } from "@/components/ai/checkpoint-confirm"
import { IconCheckOne, IconHelp } from "@/components/icon";

const { Text, Paragraph } = Typography

// ====== 类型定义 ======

export interface ClarifyData {
  /** 澄清标题 */
  title?: string
  /** 为什么需要这些信息（简短说明） */
  context?: string
  /** 表单字段：用户通过 UI 填写而非打字 */
  fields?: CheckpointParamField[]
  /** 快速选项：用户可直接选择，无需填表 */
  options?: { id: string; label: string }[]
}

interface ClarifyCardProps {
  data: ClarifyData
  /** 用户提交表单或选择选项时的回调 */
  onReply?: (reply: string) => void
}

const ICON_STROKE = 1.75

/**
 * 主动澄清卡片
 *
 * 当用户提问模糊时，AI 输出 <CLARIFY> 标签触发此卡片。
 * 提供结构化表单让用户填写，或快速选项让用户选择。
 * 风格与 CheckpointConfirm 保持一致：白底、单色、Ant Design 简约。
 */
export function ClarifyCard({ data, onReply }: ClarifyCardProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)
  // 🔥 已提交状态：折叠表单 + 显示用户回答摘要
  // resolvedEntries: 结构化的标签值列表（用于 Tag 渲染）
  // resolvedText: 纯文本（用于 onReply 回复给 AI）
  const [resolvedEntries, setResolvedEntries] = useState<{ label: string; value: string }[]>([])
  const [resolvedText, setResolvedText] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()
  const fields = data.fields || []
  const hasForm = fields.length > 0
  const isResolved = !!resolvedText

  // 初始化表单默认值
  // 🔥 依赖用稳定签名而非 fields 数组本身：父级每次渲染都会重新 JSON.parse 出新的
  // data/fields 对象，若直接依赖会导致 effect 每轮渲染都触发 setFieldsValue，
  // 在 Bubble.List 全量重渲染场景下可能级联出 Maximum update depth exceeded。
  const fieldsSignature = fields.map((f) => `${f.key}:${String(f.default)}`).join("|")
  useEffect(() => {
    if (hasForm) {
      const defaults: Record<string, string | number | boolean> = {}
      fields.forEach((f) => {
        if (f.default !== undefined) defaults[f.key] = f.default
      })
      form.setFieldsValue(defaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsSignature, hasForm, form])

  const handleSubmit = async () => {
    if (hasForm) {
      try {
        const values = await form.validateFields()
        const entries: { label: string; value: string }[] = []
        const lines = Object.entries(values)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => {
            const field = fields.find((f) => f.key === k)
            const label = field?.label || k
            const unit = field?.unit || ""
            let valStr = String(v)
            if (field?.type === "switch") valStr = v ? "是" : "否"
            entries.push({ label, value: `${valStr}${unit ? ` ${unit}` : ""}` })
            return `- ${label}: ${valStr}${unit ? " " + unit : ""}`
          })
        const summary = lines.join("\n")
        setResolvedEntries(entries)
        setResolvedText(summary)
        setSubmitting(true)
        onReply?.(summary)
      } catch {
        // 表单验证失败
        return
      }
    } else {
      setResolvedEntries([])
      setResolvedText("已确认")
      setSubmitting(true)
      onReply?.("已确认")
    }
  }

  const handleOptionClick = (opt: { id: string; label: string }) => {
    setSelectedId(opt.id)
    setResolvedEntries([])
    setResolvedText(opt.label)
    setSubmitting(true)
    onReply?.(opt.label)
  }

  // 渲染单个表单字段（与 CheckpointConfirm 一致）
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
        border: `1px solid ${isResolved ? "#e8e8e8" : "#f0f0f0"}`,
        borderRadius: 10,
        boxShadow: "none",
      }}
      styles={{ body: { padding: 16 } }}
    >
      {/* 头部：图标 + 标题 */}
      <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
        {isResolved ? (
          <IconCheckOne size={14} strokeWidth={ICON_STROKE} color={BERRY_THEME.status.success} />
        ) : (
          <IconHelp size={14} strokeWidth={ICON_STROKE} color={BERRY_THEME.primary} />
        )}
        <Text strong style={{ fontSize: 14, color: "#262626" }}>
          {data.title || "需要更多信息"}
        </Text>
      </Flex>

      {/* 上下文说明 */}
      {data.context && !isResolved && (
        <Paragraph
          style={{
            fontSize: 12,
            color: "#8c8c8c",
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          {data.context}
        </Paragraph>
      )}

      {/* 快速选项（用户可直接点击，无需填表） */}
      {data.options && data.options.length > 0 && !isResolved && (
        <Flex vertical gap={8} style={{ marginBottom: 12 }}>
          {data.options.map((opt) => {
            const isSelected = selectedId === opt.id
            return (
              <Button
                key={opt.id}
                block
                disabled={selectedId !== undefined && !isSelected || submitting}
                onClick={() => handleOptionClick(opt)}
                style={{
                  height: "auto",
                  padding: "8px 12px",
                  textAlign: "left",
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? BERRY_THEME.primary : "#f0f0f0"}`,
                  background: isSelected ? BERRY_THEME.primaryLight : "#fff",
                }}
                type="text"
              >
                <Flex align="center" justify="space-between">
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: isSelected ? BERRY_THEME.primary : "#262626",
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <IconCheckOne size={14} strokeWidth={ICON_STROKE} color={BERRY_THEME.primary} />
                  )}
                </Flex>
              </Button>
            )
          })}
        </Flex>
      )}

      {/* 表单字段 */}
      {hasForm && !isResolved && (
        <Form
          form={form}
          layout="vertical"
          size="small"
          style={{ marginBottom: 12 }}
        >
          {fields.map((field) => (
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

      {/* 提交按钮（仅表单模式 + 未提交时显示） */}
      {hasForm && !isResolved && (
        <Button
          block
          type="primary"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
          style={{
            borderRadius: 8,
            height: 36,
            fontWeight: 400,
          }}
        >
          {submitting ? "已提交，正在继续..." : "提交并继续"}
        </Button>
      )}

      {/* 已提交状态：折叠表单 + 显示回答摘要 */}
      {isResolved && resolvedText && (
        <div style={{ marginTop: 4 }}>
          <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
            <IconCheckOne size={12} strokeWidth={ICON_STROKE} color={BERRY_THEME.status.success} />
            <Text style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 400 }}>
              已提交，AI 正在继续处理
            </Text>
          </Flex>
          {resolvedEntries.length > 0 ? (
            <Flex wrap="wrap" gap={6}>
              {resolvedEntries.map((entry, i) => (
                <Tag
                  key={i}
                  style={{
                    margin: 0,
                    padding: "2px 8px",
                    fontSize: 12,
                    borderRadius: 4,
                    background: "#fafafa",
                    borderColor: "#f0f0f0",
                    color: "#595959",
                    fontWeight: 400,
                  }}
                >
                  <span style={{ color: "#bfbfbf", marginRight: 4 }}>{entry.label}</span>
                  <span style={{ color: "#262626" }}>{entry.value}</span>
                </Tag>
              ))}
            </Flex>
          ) : (
            <Text style={{ fontSize: 12, color: "#595959" }}>{resolvedText}</Text>
          )}
        </div>
      )}
    </Card>
  )
}
