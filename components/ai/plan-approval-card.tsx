"use client"

import React, { useState } from "react"
import { Card, Button, Typography, Flex, Tag, Input, InputNumber } from "antd"
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Loader2,
  Wrench,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const { Text, Paragraph } = Typography
const { TextArea } = Input

// ====== 类型定义 ======

export interface PlanStep {
  /** 步骤 ID */
  id: string
  /** 步骤内容描述 */
  content: string
  /** 将使用的工具名（可选，用于显示标签） */
  tool?: string
}

export interface PlanData {
  /** 计划标题 */
  title: string
  /** 计划摘要 */
  summary: string
  /** 执行步骤列表 */
  steps: PlanStep[]
}

interface PlanApprovalCardProps {
  data: PlanData
  /**
   * 用户点击批准时的回调
   * @param modifiedPlan 用户编辑后的计划（若未编辑则传原始 data）
   */
  onApprove?: (modifiedPlan: PlanData) => void
  /** 用户点击拒绝时的回调 */
  onReject?: () => void
}

const ICON_STROKE = 1.75

/**
 * 计划审批卡片
 *
 * AI 在计划模式下完成调研后，通过 exit_plan_mode 工具提交计划。
 * Agent Loop 注入 <PLAN> 标签触发此卡片渲染。
 *
 * 用户可：
 * - 预览计划（默认只读模式）
 * - 编辑计划：修改标题、摘要、步骤内容；增删步骤；调整顺序
 * - 批准计划：AI 按步骤逐步执行（若修改过则按修改后的计划执行）
 * - 拒绝计划：终止当前任务
 *
 * 风格与 ClarifyCard / CheckpointConfirm 一致：白底、单色、Ant Design 简约。
 */
export function PlanApprovalCard({ data, onApprove, onReject }: PlanApprovalCardProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending")
  // 编辑模式：默认 false（预览模式）
  const [editing, setEditing] = useState(false)
  // 编辑中的计划数据（深拷贝，避免直接修改 props）
  const [draft, setDraft] = useState<PlanData>(() => ({
    title: data.title || "",
    summary: data.summary || "",
    steps: Array.isArray(data.steps)
      ? data.steps.map((s, i) => ({ id: s.id || `s${i + 1}`, content: s.content || "", tool: s.tool || "" }))
      : [],
  }))

  const handleApprove = () => {
    setStatus("approved")
    // 若处于编辑模式，使用 draft；否则使用原始 data
    onApprove?.(editing ? draft : data)
  }

  const handleReject = () => {
    setStatus("rejected")
    onReject?.()
  }

  // ====== 编辑模式操作 ======

  const updateField = <K extends keyof PlanData>(key: K, value: PlanData[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const updateStep = (idx: number, patch: Partial<PlanStep>) => {
    setDraft((d) => {
      const steps = [...d.steps]
      steps[idx] = { ...steps[idx], ...patch }
      return { ...d, steps }
    })
  }

  const addStep = () => {
    setDraft((d) => ({
      ...d,
      steps: [...d.steps, { id: `s${d.steps.length + 1}-${Date.now()}`, content: "", tool: "" }],
    }))
  }

  const removeStep = (idx: number) => {
    setDraft((d) => ({
      ...d,
      steps: d.steps.filter((_, i) => i !== idx),
    }))
  }

  const moveStep = (idx: number, direction: "up" | "down") => {
    setDraft((d) => {
      const steps = [...d.steps]
      const target = direction === "up" ? idx - 1 : idx + 1
      if (target < 0 || target >= steps.length) return d
      ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
      return { ...d, steps }
    })
  }

  const stepsToShow = editing ? draft.steps : Array.isArray(data.steps) ? data.steps : []

  return (
    <Card
      size="small"
      style={{
        background: "#fff",
        border: `1px solid ${status === "approved" ? `${BERRY_THEME.primary}40` : status === "rejected" ? "#ffe0e0" : "#f0f0f0"}`,
        borderRadius: 10,
        boxShadow: "none",
      }}
      styles={{ body: { padding: 16 } }}
    >
      {/* 头部：图标 + 标题 + 状态徽章 + 编辑切换 */}
      <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
        <Flex align="center" gap={6} style={{ minWidth: 0, flex: 1 }}>
          <ClipboardList size={14} strokeWidth={ICON_STROKE} color={BERRY_THEME.primary} style={{ flexShrink: 0 }} />
          {editing ? (
            <Input
              value={draft.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="计划标题"
              size="small"
              style={{ fontSize: 14, fontWeight: 500, flex: 1 }}
            />
          ) : (
            <Text strong style={{ fontSize: 14, color: "#262626" }} ellipsis>
              {data.title || "执行计划"}
            </Text>
          )}
        </Flex>
        <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
          {/* 编辑/预览切换按钮（仅 pending 状态显示） */}
          {status === "pending" && (
            <Button
              size="small"
              type="text"
              onClick={() => setEditing(!editing)}
              icon={editing ? <Eye size={13} strokeWidth={ICON_STROKE} /> : <Pencil size={13} strokeWidth={ICON_STROKE} />}
              style={{ fontSize: 12, color: editing ? BERRY_THEME.primary : "#8c8c8c", height: 24, padding: "0 6px" }}
            >
              {editing ? "预览" : "编辑"}
            </Button>
          )}
          {status === "approved" && (
            <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
              <CheckCircle2 size={11} strokeWidth={ICON_STROKE} style={{ marginRight: 2, verticalAlign: "-1px" }} />
              已批准
            </Tag>
          )}
          {status === "rejected" && (
            <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
              <XCircle size={11} strokeWidth={ICON_STROKE} style={{ marginRight: 2, verticalAlign: "-1px" }} />
              已拒绝
            </Tag>
          )}
          {status === "pending" && (
            <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
              <Loader2 size={11} strokeWidth={ICON_STROKE} style={{ marginRight: 2, verticalAlign: "-1px" }} className="animate-spin" />
              待审批
            </Tag>
          )}
        </Flex>
      </Flex>

      {/* 计划摘要 */}
      {editing ? (
        <TextArea
          value={draft.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="计划摘要：简述目标和依据（≤150 字）"
          autoSize={{ minRows: 2, maxRows: 5 }}
          maxLength={300}
          showCount
          style={{ fontSize: 12, marginBottom: 12, color: "#595959" }}
        />
      ) : (
        data.summary && (
          <Paragraph
            style={{
              fontSize: 12,
              color: "#8c8c8c",
              marginBottom: 12,
              lineHeight: 1.6,
            }}
          >
            {data.summary}
          </Paragraph>
        )
      )}

      {/* 执行步骤列表 */}
      <Flex vertical gap={6} style={{ marginBottom: 12 }}>
        {stepsToShow.map((step, idx) => (
          <div
            key={step.id || idx}
            style={{
              padding: editing ? "10px 10px 8px" : "8px 10px",
              background: "#fafafa",
              borderRadius: 6,
              border: "1px solid #f5f5f5",
            }}
          >
            <Flex align="flex-start" gap={8}>
              {/* 步骤序号 */}
              <Flex
                align="center"
                justify="center"
                style={{
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: BERRY_THEME.primary,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 500,
                  marginTop: editing ? 4 : 1,
                }}
              >
                {idx + 1}
              </Flex>

              {editing ? (
                // 编辑模式：可输入的步骤
                <Flex vertical gap={6} style={{ flex: 1, minWidth: 0 }}>
                  <TextArea
                    value={step.content}
                    onChange={(e) => updateStep(idx, { content: e.target.value })}
                    placeholder="步骤内容描述"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    maxLength={500}
                    style={{ fontSize: 12.5, color: "#262626" }}
                  />
                  <Flex align="center" gap={6}>
                    <Input
                      value={step.tool || ""}
                      onChange={(e) => updateStep(idx, { tool: e.target.value })}
                      placeholder="工具名（可选，如 toggle_relay）"
                      size="small"
                      prefix={<Wrench size={11} strokeWidth={ICON_STROKE} color="#bfbfbf" />}
                      style={{ fontSize: 11, color: "#8c8c8c", flex: 1 }}
                    />
                    {/* 上移/下移/删除 */}
                    <Button
                      size="small"
                      type="text"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, "up")}
                      icon={<ArrowUp size={12} strokeWidth={ICON_STROKE} />}
                      style={{ width: 24, height: 24, padding: 0, color: "#8c8c8c" }}
                    />
                    <Button
                      size="small"
                      type="text"
                      disabled={idx === stepsToShow.length - 1}
                      onClick={() => moveStep(idx, "down")}
                      icon={<ArrowDown size={12} strokeWidth={ICON_STROKE} />}
                      style={{ width: 24, height: 24, padding: 0, color: "#8c8c8c" }}
                    />
                    <Button
                      size="small"
                      type="text"
                      onClick={() => removeStep(idx)}
                      icon={<Trash2 size={12} strokeWidth={ICON_STROKE} />}
                      style={{ width: 24, height: 24, padding: 0, color: "#ff4d4f" }}
                    />
                  </Flex>
                </Flex>
              ) : (
                // 预览模式：只读显示
                <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: "#262626",
                      lineHeight: 1.6,
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {step.content}
                  </Text>
                  {step.tool && (
                    <Flex align="center" gap={3}>
                      <Wrench size={10} strokeWidth={ICON_STROKE} color="#bfbfbf" />
                      <Text style={{ fontSize: 11, color: "#bfbfbf" }}>{step.tool}</Text>
                    </Flex>
                  )}
                </Flex>
              )}
            </Flex>
          </div>
        ))}

        {/* 编辑模式：添加步骤按钮 */}
        {editing && (
          <Button
            type="dashed"
            block
            onClick={addStep}
            icon={<Plus size={13} strokeWidth={ICON_STROKE} />}
            style={{
              height: 32,
              fontSize: 12.5,
              color: BERRY_THEME.primary,
              borderColor: `${BERRY_THEME.primary}40`,
              borderRadius: 6,
              fontWeight: 400,
            }}
          >
            添加步骤
          </Button>
        )}
      </Flex>

      {/* 操作按钮（仅 pending 状态显示） */}
      {status === "pending" && (
        <Flex gap={8} justify="flex-end">
          <Button
            onClick={handleReject}
            style={{
              borderRadius: 8,
              height: 32,
              fontWeight: 400,
            }}
          >
            拒绝
          </Button>
          {editing && (
            <Button
              onClick={() => setEditing(false)}
              style={{
                borderRadius: 8,
                height: 32,
                fontWeight: 400,
              }}
            >
              完成编辑
            </Button>
          )}
          <Button
            type="primary"
            onClick={handleApprove}
            style={{
              borderRadius: 8,
              height: 32,
              fontWeight: 400,
            }}
          >
            {editing ? "批准并执行（含修改）" : "批准并执行"}
          </Button>
        </Flex>
      )}

      {/* 状态后提示 */}
      {status === "approved" && (
        <div style={{ marginTop: 4, fontSize: 11.5, color: "#8c8c8c" }}>
          已批准，AI 将按计划逐步执行。
        </div>
      )}
      {status === "rejected" && (
        <div style={{ marginTop: 4, fontSize: 11.5, color: "#8c8c8c" }}>
          已拒绝，AI 将停止当前任务。
        </div>
      )}
    </Card>
  )
}
