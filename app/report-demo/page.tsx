"use client"

import React, { useState } from "react"
import { ReportRenderer } from "@/components/ai/report-renderer"
import { ReportGenerator, ReportData } from "@/lib/ai/report-generator"
import { motion } from "framer-motion"
import { FileText, BarChart3, AlertTriangle, TrendingUp } from "lucide-react"

export default function ReportDemoPage() {
  const [reportHtml, setReportHtml] = useState<string>("")
  const [reportTitle, setReportTitle] = useState<string>("")

  // 示例1: 环境监测报告
  const generateEnvironmentReport = () => {
    const reportData: ReportData = {
      title: "温室环境监测报告",
      summary: "今日温室环境整体良好，温度、湿度均在适宜范围内。发现1处需要关注的问题。",
      sections: [
        {
          title: "🌡️ 温度分析",
          content: `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h4 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">平均温度</h4>
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #f59e0b;">24.5°C</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">适宜范围: 18-28°C</p>
              </div>
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <h4 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">最低温度</h4>
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #3b82f6;">22°C</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">夜间温度</p>
              </div>
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <h4 style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">最高温度</h4>
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #ef4444;">27°C</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">午后温度</p>
              </div>
            </div>
            <p>温度控制良好，全天保持在草莓生长的适宜范围内。</p>
          `,
          type: "text"
        },
        {
          title: "💧 湿度分析",
          content: `
            | 时段 | 平均湿度 | 状态 |
            |------|----------|------|
            | 00:00-06:00 | 70% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
            | 06:00-12:00 | 68% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
            | 12:00-18:00 | 62% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #fef3c7; color: #92400e;">偏低</span> |
            | 18:00-24:00 | 72% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
          `,
          type: "table"
        },
        {
          title: "💡 优化建议",
          content: `
            - 建议在12:00-18:00时段增加喷雾频率，提高湿度
            - 夜间可适当降低温度2-3度，有利于养分积累
            - 保持良好的通风，避免病害发生
          `,
          type: "list"
        },
        {
          title: "⚠️ 重要提示",
          content: "明天预计有强降温，请提前检查保温设备，确保温度不低于15°C。",
          type: "highlight"
        }
      ],
      metadata: {
        "分析时段": `${new Date().toLocaleDateString("zh-CN")} 00:00 - 24:00`,
        "数据点数": "1440",
        "采样间隔": "1分钟",
        "置信度": "95%"
      }
    }

    const html = ReportGenerator.generateHtmlReport(reportData)
    setReportHtml(html)
    setReportTitle(reportData.title)
  }

  // 示例2: 趋势分析报告
  const generateTrendReport = () => {
    const reportData: ReportData = {
      title: "一周数据趋势分析报告",
      summary: "过去一周环境数据整体稳定，温度波动在±2°C范围内，湿度控制良好，发现3个优化机会。",
      sections: [
        {
          title: "📈 关键指标统计",
          content: `
            | 指标 | 平均值 | 最小值 | 最大值 | 标准差 | 评价 |
            |------|--------|--------|--------|--------|------|
            | 温度 | 24.5°C | 22°C | 27°C | 1.2 | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">优秀</span> |
            | 湿度 | 70% | 65% | 75% | 2.8 | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">良好</span> |
            | 光照 | 8500 lux | 6000 lux | 12000 lux | 1500 | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
          `,
          type: "table"
        },
        {
          title: "🔍 深度洞察",
          content: `
            - <strong>温度控制</strong>: 温度波动小（标准差1.2），说明温控系统运行稳定
            - <strong>湿度管理</strong>: 湿度保持在理想范围，有利于草莓生长和病害预防
            - <strong>光照充足</strong>: 光照时长和强度均符合要求，光合作用效率高
            - <strong>能耗分析</strong>: 当前能耗水平合理，但仍有15%的优化空间
          `,
          type: "list"
        },
        {
          title: "💡 优化建议",
          content: `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #86efac;">
                <h4 style="margin: 0 0 8px 0; color: #166534;">💡 节能优化</h4>
                <p style="margin: 0; font-size: 14px; color: #166534;">夜间适当降温可节省15%能耗</p>
              </div>
              <div style="background: #eff6ff; padding: 16px; border-radius: 8px; border: 1px solid #93c5fd;">
                <h4 style="margin: 0 0 8px 0; color: #1e40af;">📊 数据采集</h4>
                <p style="margin: 0; font-size: 14px; color: #1e40af;">增加CO2浓度监测</p>
              </div>
              <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d;">
                <h4 style="margin: 0 0 8px 0; color: #92400e;">⚙️ 设备维护</h4>
                <p style="margin: 0; font-size: 14px; color: #92400e;">建议本周进行设备检查</p>
              </div>
            </div>
          `,
          type: "text"
        }
      ],
      metadata: {
        "分析周期": "2024-01-08 至 2024-01-15",
        "数据点数": "10080",
        "分析模型": "AI趋势分析 v3.0"
      }
    }

    const html = ReportGenerator.generateHtmlReport(reportData)
    setReportHtml(html)
    setReportTitle(reportData.title)
  }

  // 示例3: 异常诊断报告
  const generateDiagnosticReport = () => {
    const reportData: ReportData = {
      title: "设备异常诊断报告",
      summary: "检测到温度传感器异常，系统已自动生成诊断报告并提供解决方案。",
      sections: [
        {
          title: "🔴 异常概述",
          content: `
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px 0; color: white; font-size: 20px;">⚠️ 传感器读数异常</h3>
              <p style="margin: 0; font-size: 16px;">温度传感器#2出现读数波动异常，可能影响温度控制精度。</p>
            </div>
          `,
          type: "text"
        },
        {
          title: "📋 异常详情",
          content: `
            | 项目 | 详情 |
            |------|------|
            | 异常设备 | 温度传感器 #2 |
            | 异常时间 | ${new Date().toLocaleString("zh-CN")} |
            | 异常类型 | 读数波动异常 |
            | 严重程度 | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #fef3c7; color: #92400e;">中等</span> |
            | 影响范围 | 温度控制精度 |
          `,
          type: "table"
        },
        {
          title: "🔧 解决方案",
          content: `
            1. <strong>立即检查</strong>: 检查传感器连接线是否松动或损坏
            2. <strong>清洁维护</strong>: 清洁传感器探头，去除可能的污染物
            3. <strong>备用方案</strong>: 如问题持续，启用备用传感器
            4. <strong>技术支持</strong>: 联系技术支持 400-xxx-xxxx
          `,
          type: "list"
        },
        {
          title: "⏰ 处理时限",
          content: "建议在2小时内处理，避免影响温度控制效果。",
          type: "highlight"
        }
      ],
      metadata: {
        "报告生成时间": new Date().toLocaleString("zh-CN"),
        "诊断模型": "AI智能诊断 v2.0",
        "处理优先级": "高"
      }
    }

    const html = ReportGenerator.generateHtmlReport(reportData)
    setReportHtml(html)
    setReportTitle(reportData.title)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            AI报告生成演示
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            点击下方按钮生成不同类型的报告，体验HTML和PDF下载功能
          </p>
        </motion.div>

        {/* 报告类型选择 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <button
            onClick={generateEnvironmentReport}
            className="group bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-lg"
          >
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              环境监测报告
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              查看温室环境数据分析和优化建议
            </p>
          </button>

          <button
            onClick={generateTrendReport}
            className="group bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              趋势分析报告
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              分析一周数据趋势和深度洞察
            </p>
          </button>

          <button
            onClick={generateDiagnosticReport}
            className="group bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-red-500 dark:hover:border-red-500 transition-all hover:shadow-lg"
          >
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              异常诊断报告
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              设备异常诊断和解决方案
            </p>
          </button>
        </motion.div>

        {/* 报告显示区域 */}
        {reportHtml && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ReportRenderer
              htmlContent={reportHtml}
              reportTitle={reportTitle}
              reportId={`demo_${Date.now()}`}
            />
          </motion.div>
        )}

        {/* 提示信息 */}
        {!reportHtml && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <BarChart3 className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">
              选择一个报告类型开始体验
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
