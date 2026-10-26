"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, ConfigProvider, Form, Input, InputNumber, Select, Switch } from "antd"
import { useTheme } from "next-themes"
import { antdScopeTheme } from "@/lib/theme/antd-scope-theme"
import type { CheckpointParamField } from "@/components/ai/checkpoint-confirm"
import { IconArrowRight, IconCheckOne, IconDown, IconLeft, IconPencil, IconRight } from "@/components/icon"

// ====== 类型定义 ======

export interface ClarifyOption {
  id: string
  label: string
}

/**
 * 单个问题（分步提问卡的一"步"）
 */
export interface ClarifyQuestion {
  /** 问题正文 */
  title: string
  /** 为什么问这个（小字说明，可选） */
  context?: string
  /** 选项：点击即选，无需打字 */
  options?: ClarifyOption[]
  /** 表单字段（需要输入具体数值时用） */
  fields?: CheckpointParamField[]
  /** 是否多选（默认单选） */
  multiple?: boolean
}

export interface ClarifyData {
  /** 单问题标题（兼容旧协议：无 questions 时即问题正文） */
  title?: string
  /** 为什么需要这些信息 */
  context?: string
  /** 表单字段：用户通过 UI 填写而非打字 */
  fields?: CheckpointParamField[]
  /** 快速选项：用户可直接选择 */
  options?: ClarifyOption[]
  /** 🔥 多问题（分步提问：一次调用问 1-4 个问题，前端渲染为 1/N 分步卡） */
  questions?: ClarifyQuestion[]
}

interface ClarifyCardProps {
  data: ClarifyData
  /** 用户提交答案时的回调 */
  onReply?: (reply: string) => void
}

const ICON_STROKE = 1.75
/* 品牌强调色 = BERRY_THEME.primary（#059669 / 暗态 #34D399）。
   Tailwind 类只能写静态字面量 → 这里用类字符串承载，不再散落 inline isDark 三元。 */

/** 把两种协议（单问题 / questions[]）归一成 questions[] */
function normalizeQuestions(data: ClarifyData): ClarifyQuestion[] {
  const raw = Array.isArray(data.questions) ? data.questions : []
  const list = raw.length
    ? raw
    : [
        {
          title: data.title || "需要更多信息",
          context: data.context,
          options: data.options,
          fields: data.fields,
        },
      ]
  return list
    .map((q) => ({
      title: String(q?.title || "").trim() || "需要更多信息",
      context: q?.context,
      options: Array.isArray(q?.options) ? q!.options!.filter((o) => o && o.label) : [],
      fields: Array.isArray(q?.fields) ? q!.fields! : [],
      multiple: !!q?.multiple,
    }))
    .filter((q) => q.title || q.options!.length || q.fields!.length)
}

/**
 * 主动澄清卡片（分步提问卡 · 2026-10-01 改版）
 *
 * 形态：
 *   ┌ 问题正文                        ‹ 1/3 ›  [跳过所有] ┐
 *   │ (1) 选项一（灰底斑马纹）                            │
 *   │  2  选项二（白底）                                  │
 *   │ (3) 选项三（灰底）                                  │
 *   │ ✎ 补充其他内容                              (→)    │
 *   └────────────────────────────────────────────────────┘
 * 选完/答完 → 整卡折叠成「已确认需求」摘要（问题加粗 + 答案灰字，可折叠）。
 *
 * ── 与旧版的差别 ──
 *   · 旧版：标题 + 一堆按钮 + 提交按钮 + 已提交 Tag。新版：编号条纹选项行（48px）、
 *     底部「补充其他内容」输入 + 圆形发送键、多问题分步（1/N + 跳过所有）、
 *     确认后渲染「已确认需求」摘要块（不再是 Tag 列表）。
 *   · 选项点击后**不立即提交**（可改选），由底部发送键统一提交 —— 与参考稿一致。
 *   · 卡片本体仍交 HDS 材质（`dc-mat dc-mat--regular dc-mat--neutral`），
 *     故**不能**写 inline background / border / boxShadow，只保留 borderRadius。
 */
export function ClarifyCard({ data, onReply }: ClarifyCardProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // 父级每次渲染都会重新 parse 出新的 data 对象 → 用稳定签名做依赖，
  // 否则 effect 每轮都重置表单，会打断用户填写（并可能级联重渲染）。
  const sig = useMemo(
    () => JSON.stringify([data.title, data.context, data.options, data.fields, data.questions]),
    [data.title, data.context, data.options, data.fields, data.questions],
  )
  const questions = useMemo(() => normalizeQuestions(data), [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const [form] = Form.useForm()
  const [step, setStep] = useState(0)
  /** 每个问题已选的选项 id */
  const [picks, setPicks] = useState<Record<number, string[]>>({})
  /** 每个问题「补充其他内容」 */
  const [free, setFree] = useState<Record<number, string>>({})
  /** 提交后的摘要（问题 → 答案） */
  const [summary, setSummary] = useState<{ q: string; a: string }[]>([])
  const [done, setDone] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  /** 防重入（fields 校验是异步的）——用 ref，**不能**用 state：
   *  曾经用 state 做闸门，提交完第一题后闸门没复位 → 第二题点什么都没反应（探针抓到的真 bug） */
  const committingRef = useRef(false)

  const total = questions.length
  const current = questions[Math.min(step, Math.max(0, total - 1))]
  const fieldName = (qi: number, key: string) => `q${qi}__${key}`

  // 换题（协议变化）才重置，避免打断填写
  useEffect(() => {
    setStep(0)
    setPicks({})
    setFree({})
    setSummary([])
    setDone(false)
    committingRef.current = false
    form.resetFields()
    const defaults: Record<string, unknown> = {}
    questions.forEach((q, qi) => {
      ;(q.fields || []).forEach((f) => {
        if (f.default !== undefined) defaults[fieldName(qi, f.key)] = f.default
      })
    })
    if (Object.keys(defaults).length) form.setFieldsValue(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const toggleOption = (opt: ClarifyOption) => {
    const q = current
    if (!q) return
    setPicks((prev) => {
      const cur = prev[step] || []
      if (q.multiple) {
        return { ...prev, [step]: cur.includes(opt.id) ? cur.filter((x) => x !== opt.id) : [...cur, opt.id] }
      }
      return { ...prev, [step]: [opt.id] }
    })
  }

  /** 当前问题「选项 + 补充」部分拼成的答案（不含 fields） */
  const composeQuickAnswer = (qi: number): string => {
    const q = questions[qi]
    const labels = (picks[qi] || []).map((id) => q?.options?.find((o) => o.id === id)?.label || id)
    const parts: string[] = []
    if (labels.length) parts.push(labels.join("、"))
    const t = (free[qi] || "").trim()
    if (t) parts.push(t)
    return parts.join(" · ")
  }

  const hasQuick = (qi: number) => composeQuickAnswer(qi).length > 0
  const canCommit = !!current && (hasQuick(step) || (current.fields || []).length > 0)

  /** 记录一题的答案并推进 / 收尾 */
  const advance = (answer: string) => {
    const q = questions[step]
    const nextSummary = [...summary, { q: q?.title || "", a: answer || "（跳过）" }]
    setSummary(nextSummary)
    form.resetFields()
    if (step < total - 1) {
      setStep(step + 1)
      return
    }
    setDone(true)
    onReply?.(nextSummary.map((s) => `- ${s.q}: ${s.a}`).join("\n"))
  }

  /** 提交当前问题 */
  const commit = async () => {
    const q = current
    if (!q || committingRef.current) return
    const parts: string[] = []
    if ((q.fields || []).length) {
      committingRef.current = true
      let values: Record<string, unknown>
      try {
        values = await form.validateFields((q.fields || []).map((f) => fieldName(step, f.key)))
      } catch {
        committingRef.current = false
        return // 校验失败：antd 已在字段下方给出提示
      }
      committingRef.current = false
      const formParts = (q.fields || [])
        .map((f) => {
          const v = values[fieldName(step, f.key)]
          if (v === undefined || v === null || v === "") return ""
          const val = f.type === "switch" ? (v ? "是" : "否") : String(v)
          return `${f.label}: ${val}${f.unit ? ` ${f.unit}` : ""}`
        })
        .filter(Boolean)
      if (formParts.length) parts.push(formParts.join("；"))
    }
    const quick = composeQuickAnswer(step)
    if (quick) parts.push(quick)
    if (!parts.length) return
    advance(parts.join("；"))
  }

  /** 跳过所有：剩余问题全部记「跳过」并收尾 */
  const skipAll = () => {
    const rest = [...summary]
    for (let i = summary.length; i < total; i++) rest.push({ q: questions[i]?.title || "", a: "（跳过）" })
    setSummary(rest)
    setDone(true)
    onReply?.(rest.map((s) => `- ${s.q}: ${s.a}`).join("\n"))
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
          />
        )
      case "select":
        return (
          <Select
            options={field.options}
            placeholder={field.placeholder || "请选择"}
            allowClear={!field.required}
          />
        )
      case "switch":
        return <Switch />
      case "text":
      default:
        return <Input placeholder={field.placeholder} />
    }
  }

  /* 深色下 antd 控件走 darkAlgorithm；浅色保持默认 */
  const scopeTheme = antdScopeTheme(isDark)

  // ===== 已提交：折叠成「已确认需求」摘要（参考稿形态，不再是一张卡）=====
  if (done) {
    return (
      <div className="my-1 w-full" data-clarify="summary">
        <button
          type="button"
          data-clarify-toggle
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 rounded-md py-0.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <span className="h-[7px] w-[7px] shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600" />
          <span>已确认需求</span>
          <IconDown
            size={11}
            className="transition-transform duration-200"
            style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}
          />
        </button>
        {!collapsed && (
          <div
            data-clarify-box
            className="mt-2 rounded-[6px] border border-zinc-200 px-4 py-3 dark:border-white/[0.12]"
          >
            {summary.map((s, i) => (
              <div key={i} data-clarify-item className={i > 0 ? "mt-4" : undefined}>
                <div className="text-[15px] font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {s.q}
                </div>
                <div className="mt-1 text-[14px] leading-relaxed text-zinc-500 dark:text-zinc-400">{s.a}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ===== 提问中 =====
  const picked = picks[step] || []
  const freeText = free[step] || ""
  /* 图标颜色全部走 CSS 类（color=currentColor），**不写 inline isDark 三元**：
     SSR 首帧 resolvedTheme 还是 undefined（isDark=false），客户端是 true →
     inline fill 会不一致，直接把 hydration 打挂。 */
  const sendCls = !canCommit
    ? "bg-zinc-900/[0.07] text-zinc-400 dark:bg-white/[0.10] dark:text-[#6b6b74]"
    : "bg-[#059669] text-white hover:bg-[#047857] dark:bg-[#34D399] dark:text-[#0B0B0F] dark:hover:bg-[#10B981]"

  return (
    <ConfigProvider theme={scopeTheme}>
      <Card
        size="small"
        data-clarify="card"
        /* HDS 沉浸光感 · 卡片档：外观交材质统一给（禁 inline background/border/box-shadow）
           横向内距交给子元素自带的 px-4 —— 参考稿里条纹是**满幅到卡片左右边缘**的，
           只有「问题正文 / 序号 / 位置图标」共享同一条左基线。 */
        className="dc-mat dc-mat--regular dc-mat--neutral w-full transition-colors"
        style={{ borderRadius: 16 }}
        styles={{ body: { padding: "16px 0" } }}
      >
        {/* 头部：问题正文 + 分页 + 跳过 */}
        <div className="flex items-start justify-between gap-3 px-4">
          <div className="min-w-0 flex-1">
            <div
              data-clarify-title
              className="text-[15px] font-medium leading-relaxed text-zinc-800 dark:text-zinc-100"
            >
              {current?.title}
            </div>
            {current?.context && (
              <div className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {current.context}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {total > 1 && (
              <div
                data-clarify-page
                className="flex items-center gap-1 text-[13px] tabular-nums text-zinc-500 dark:text-zinc-400"
              >
                <button
                  type="button"
                  aria-label="上一题"
                  disabled={step === 0}
                  onClick={() => setStep(Math.max(0, step - 1))}
                  className="flex h-5 w-5 items-center justify-center rounded transition-colors disabled:opacity-35 hover:text-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconLeft size={12} strokeWidth={ICON_STROKE} />
                </button>
                <span>
                  {step + 1} / {total}
                </span>
                <button
                  type="button"
                  aria-label="下一题"
                  disabled={step >= total - 1}
                  onClick={() => setStep(Math.min(total - 1, step + 1))}
                  className="flex h-5 w-5 items-center justify-center rounded transition-colors disabled:opacity-35 hover:text-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconRight size={12} strokeWidth={ICON_STROKE} />
                </button>
              </div>
            )}
            <button
              type="button"
              data-clarify-skip
              onClick={skipAll}
              className="rounded-full border border-zinc-200 px-3.5 py-[6px] text-[13px] text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/[0.14] dark:text-zinc-300 dark:hover:bg-white/[0.06]"
            >
              {total > 1 ? "跳过所有" : "跳过"}
            </button>
          </div>
        </div>

        {/* 选项（编号 + 斑马纹；点击选中，底部发送键统一提交） */}
        {current?.options && current.options.length > 0 && (
          <div className="mt-3 flex flex-col">
            {current.options.map((opt, i) => {
              const sel = picked.includes(opt.id)
              /* min-h-12（不是 h-12）：参考稿行高 48，但长选项要能自然撑高而不是被裁掉 */
              let cls = "flex min-h-12 w-full items-center gap-2 rounded-[10px] px-4 py-2 text-left transition-colors "
              if (sel) cls += "bg-emerald-50 dark:bg-emerald-400/[0.15]"
              else if (i % 2 === 0)
                cls += "bg-zinc-100/80 hover:bg-zinc-200/60 dark:bg-white/[0.045] dark:hover:bg-white/[0.08]"
              else cls += "hover:bg-zinc-100/80 dark:hover:bg-white/[0.06]"
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-clarify-row={i}
                  onClick={() => toggleOption(opt)}
                  className={cls}
                >
                  <span
                    data-clarify-badge
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200/70 text-[12.5px] leading-none text-zinc-600 dark:bg-white/[0.10] dark:text-zinc-300"
                  >
                    {i + 1}
                  </span>
                  <span
                    className={
                      "flex-1 text-[15px] leading-snug " +
                      (sel ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-800 dark:text-zinc-100")
                    }
                  >
                    {opt.label}
                  </span>
                  {sel && (
                    <IconCheckOne
                      size={14}
                      strokeWidth={ICON_STROKE}
                      className="text-[#059669] dark:text-[#34D399]"
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 表单字段（需要具体数值时） */}
        <Form form={form} layout="vertical" size="small" className="px-4" style={{ marginTop: 12 }}>
          {(current?.fields || []).map((field) => (
            <Form.Item
              key={field.key}
              name={fieldName(step, field.key)}
              label={
                <span className="text-[12.5px] text-zinc-700 dark:text-zinc-200">
                  {field.label}
                  {field.unit && <span className="ml-1 text-[11px] text-zinc-400 dark:text-zinc-500">（{field.unit}）</span>}
                </span>
              }
              rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : []}
              help={
                field.help ? (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{field.help}</span>
                ) : undefined
              }
              style={{ marginBottom: 12 }}
            >
              {renderField(field)}
            </Form.Item>
          ))}
        </Form>

        {/* 底部：补充其他内容 + 圆形发送键 */}
        <div
          data-clarify-foot
          className="mt-1 flex items-center gap-2 border-t border-zinc-100 px-4 pt-3 dark:border-white/[0.07]"
        >
          <IconPencil size={14} strokeWidth={ICON_STROKE} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
          <input
            data-clarify-input
            value={freeText}
            onChange={(e) => setFree((prev) => ({ ...prev, [step]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCommit) {
                e.preventDefault()
                void commit()
              }
            }}
            placeholder="补充其他内容"
            className="min-w-0 flex-1 bg-transparent text-[14px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            type="button"
            aria-label="提交"
            data-clarify-send
            disabled={!canCommit}
            onClick={() => void commit()}
            className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors " + sendCls}
          >
            <IconArrowRight size={14} strokeWidth={2} />
          </button>
        </div>
      </Card>
    </ConfigProvider>
  )
}
