"use client"

import React from "react"
import { ReportRenderer } from "./report-renderer"
import ReactMarkdown from "react-markdown"
import { Loader2, Sprout, Cpu, Brain, FileText, CheckCircle2 } from "lucide-react"

interface MessageWithReportProps {
  content: string
  role: 'user' | 'assistant'
}

/**
 * Premium glassmorphic loading stepper for report generation
 */
function PremiumReportLoader({ reportTitle = "分析报告", htmlContent = "", isComplete = false }: {
  reportTitle?: string
  htmlContent?: string
  isComplete?: boolean
}) {
  const cleanHtml = htmlContent.trim()
  let currentStep = 0
  let progress = 10
  let activeStatusText = "正在初始化环境监测报告容器..."

  if (isComplete) {
    currentStep = 4
    progress = 100
    activeStatusText = "✓ 编译成功，已生成精美可视化画布"
  } else if (cleanHtml.length === 0) {
    currentStep = 0
    progress = 15
    activeStatusText = "正在唤醒 AI 引擎并捕获物联网实时数据..."
  } else {
    // 真实 Token 扫描分析
    const hasSuggestions = /(建议|措施|调控|策略|农事|决策|Control|Suggestion|Action)/i.test(cleanHtml)
    const hasAnalysis = /(分析|诊断|评估|数据研判|质量评估|Quality|Analysis|Diagnosis)/i.test(cleanHtml)
    const hasMetrics = /(温度|湿度|光照|土壤|CO2|二氧化碳|指标|卡片|传感器|Sensor|Metric|Value)/i.test(cleanHtml)

    if (hasSuggestions) {
      currentStep = 3
      progress = 85
      activeStatusText = "正在基于农业知识库生成智能调控与农事建议..."
    } else if (hasAnalysis) {
      currentStep = 2
      progress = 60
      activeStatusText = "正在开展温室数据多维智能研判与环境诊断..."
    } else if (hasMetrics) {
      currentStep = 1
      progress = 35
      activeStatusText = "正在编排今日核心物联网传感器指标卡片..."
    } else {
      currentStep = 0
      progress = 20
      activeStatusText = "正在构建报告头部与全局品牌样式系统..."
    }
  }

  const steps = [
    { label: "数据捕获", desc: "验证并拉取温室 IoT 终端环境数据", icon: Sprout },
    { label: "指标分析", desc: "提取空气与土壤传感器核心指标", icon: Cpu },
    { label: "大模诊断", desc: "基于草莓专家知识库开展智能诊断", icon: Brain },
    { label: "视觉编排", desc: "渲染响应式大厂UI卡片与交互图表", icon: FileText }
  ]

  return (
    <div className="w-full my-4 rounded-2xl bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
      {/* Dynamic Progress Bar */}
      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-850/40 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5 space-y-4">
        {/* Header Block */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-black font-alimama tracking-wide text-zinc-800 dark:text-zinc-200">
                正在生成：{reportTitle}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400/80 mt-0.5 flex items-center gap-1.5">
                {!isComplete ? (
                  <>
                    <Loader2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 animate-spin" />
                    <span>{activeStatusText}</span>
                  </>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{activeStatusText}</span>
                )}
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            {progress}%
          </div>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isDone = currentStep > idx
            const isActive = currentStep === idx
            
            return (
              <div 
                key={idx}
                className={`relative flex flex-row md:flex-col gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40 shadow-[0_4px_12px_rgba(16,185,129,0.03)]" 
                    : isDone
                      ? "bg-zinc-50/30 dark:bg-zinc-900/10 border-zinc-100 dark:border-zinc-900/30 opacity-70"
                      : "bg-transparent border-transparent opacity-40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : isDone
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-805/50 dark:text-zinc-600"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
                    )}
                  </div>
                  
                  {isActive && (
                    <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 animate-pulse">
                      进行中
                    </span>
                  )}
                </div>

                <div className="flex-1 md:mt-1 space-y-0.5 text-left">
                  <p className={`text-xs font-black font-alimama tracking-wider ${
                    isActive 
                      ? "text-emerald-700 dark:text-emerald-300" 
                      : isDone
                        ? "text-zinc-600 dark:text-zinc-400"
                        : "text-zinc-400 dark:text-zinc-600"
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-normal hidden md:block">
                    {step.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * 检测消息中是否包含HTML报告
 * 报告格式: [REPORT:title]html内容[/REPORT]
 */
function extractReport(content: string): { 
  hasReport: boolean
  isComplete: boolean
  reportTitle?: string
  reportHtml?: string
  remainingContent: string
} {
  // Try matching complete report first
  const completeReportRegex = /\[REPORT:([^\]]+)\]([\s\S]*?)\[\/REPORT\]/
  const completeMatch = content.match(completeReportRegex)

  if (completeMatch) {
    return {
      hasReport: true,
      isComplete: true,
      reportTitle: completeMatch[1],
      reportHtml: completeMatch[2].trim(),
      remainingContent: content.replace(completeReportRegex, '').trim()
    }
  }

  // If not complete, try matching incomplete report (streaming)
  const incompleteReportRegex = /\[REPORT:([^\]]+)\]([\s\S]*?)$/
  const incompleteMatch = content.match(incompleteReportRegex)

  if (incompleteMatch) {
    return {
      hasReport: true,
      isComplete: false,
      reportTitle: incompleteMatch[1],
      reportHtml: incompleteMatch[2].trim(),
      remainingContent: content.replace(incompleteReportRegex, '').trim()
    }
  }

  return {
    hasReport: false,
    isComplete: false,
    remainingContent: content
  }
}

export function MessageWithReport({ content, role }: MessageWithReportProps) {
  const { hasReport, isComplete, reportTitle, reportHtml, remainingContent } = extractReport(content)

  if (role === 'user') {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 常规消息内容 */}
      {remainingContent && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-left">
          <ReactMarkdown>{remainingContent}</ReactMarkdown>
        </div>
      )}

      {/* 报告渲染 */}
      {hasReport && (
        isComplete ? (
          reportHtml && (
            <ReportRenderer
              htmlContent={reportHtml}
              reportTitle={reportTitle}
              reportId={`report_${Date.now()}`}
            />
          )
        ) : (
          <PremiumReportLoader
            reportTitle={reportTitle}
            htmlContent={reportHtml || ""}
            isComplete={false}
          />
        )
      )}
    </div>
  )
}
