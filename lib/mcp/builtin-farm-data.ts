/**
 * 内置农业数据工具
 *
 * 直连本地库（sensor_readings / device_logs），不依赖任何外部 IoT 平台。
 * 接替此前那批调用不存在外部 API 的 mcp_soil_sensor_query 等空壳工具。
 */

import { getCurrentConditions, analyzeSoil, getDeviceActivity } from '../db/farm-service'
import { runInspection } from '../ai/inspection-service'
import type { AgentToolContext, ToolCallResult } from './mcp-tool-executor'

const TREND_LABEL: Record<string, string> = {
  rising: '上升',
  falling: '下降',
  stable: '平稳',
  unknown: '未知'
}

export async function executeFarmTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  switch (functionName) {
    case 'get_current_conditions':
      return await execCurrentConditions()
    case 'analyze_soil':
      return await execAnalyzeSoil()
    case 'get_device_activity':
      return await execDeviceActivity(args)
    case 'generate_inspection_report':
      return await execInspection(args)
    default:
      return { success: false, error: `农业工具 ${functionName} 暂不支持执行` }
  }
}

async function execCurrentConditions(): Promise<ToolCallResult> {
  try {
    const report = await getCurrentConditions()

    if (!report.measuredAt) {
      return { success: false, error: '暂无传感器数据，请确认采集端是否正常上报' }
    }

    const available = report.metrics.filter(m => m.value !== null)
    if (available.length === 0) {
      return { success: false, error: '最新一条传感器记录中没有任何有效指标' }
    }

    return {
      success: true,
      data: {
        measured_at: new Date(report.measuredAt).toLocaleString('zh-CN'),
        data_age_minutes: report.dataAgeMinutes,
        // 数据超过 30 分钟未更新时提示，避免 AI 拿陈旧值当现状回答
        stale_warning:
          (report.dataAgeMinutes ?? 0) > 30
            ? `数据已 ${report.dataAgeMinutes} 分钟未更新，可能不是实时值`
            : null,
        metrics: available.map(m => ({
          key: m.key,
          label: m.label,
          value: m.value,
          unit: m.unit,
          avg_24h: m.avg24h,
          change_24h: m.delta24h,
          trend: TREND_LABEL[m.trend] ?? m.trend
        }))
      }
    }
  } catch (e: any) {
    return { success: false, error: `查询当前环境失败: ${e.message}` }
  }
}

async function execAnalyzeSoil(): Promise<ToolCallResult> {
  try {
    const report = await analyzeSoil()

    return {
      success: true,
      data: {
        measured_at: report.measuredAt
          ? new Date(report.measuredAt).toLocaleString('zh-CN')
          : null,
        moisture: report.moisture,
        nutrients: report.nutrients,
        fertility_index: report.fertilityIndex,
        summary: report.summary,
        suggestions: report.suggestions
      }
    }
  } catch (e: any) {
    return { success: false, error: `土壤诊断失败: ${e.message}` }
  }
}

async function execInspection(args: Record<string, any>): Promise<ToolCallResult> {
  try {
    const crop = typeof args.crop === 'string' && args.crop ? args.crop : '草莓'
    const report = await runInspection(crop)

    return {
      success: true,
      data: {
        inspected_at: new Date(report.inspectedAt).toLocaleString('zh-CN'),
        crop: report.crop,
        healthy: report.healthy,
        conclusion: report.conclusion,
        environment: report.environment.filter(e => e.value !== null),
        soil: report.soil,
        // 异常项放在最后，AI 叙述时会自然以结论收尾
        anomalies: report.anomalies.map(a => ({
          item: a.label,
          value: a.value,
          unit: a.unit,
          expected: a.expected,
          severity: a.severity === 'critical' ? '需优先处理' : '需关注',
          finding: a.finding,
          action: a.action
        }))
      }
    }
  } catch (e: any) {
    return { success: false, error: `巡检执行失败: ${e.message}` }
  }
}

async function execDeviceActivity(args: Record<string, any>): Promise<ToolCallResult> {
  try {
    const limit = typeof args.limit === 'number' ? args.limit : 20
    const sinceHours = typeof args.sinceHours === 'number' ? args.sinceHours : 24 * 7
    const deviceName = typeof args.deviceName === 'string' ? args.deviceName : undefined

    const entries = await getDeviceActivity({ limit, sinceHours, deviceName })

    return {
      success: true,
      data: {
        range_hours: sinceHours,
        count: entries.length,
        // 只回传必要字段并按时间正序，便于 AI 直接叙述事件经过
        activities: entries
          .slice()
          .reverse()
          .map(e => ({
            time: new Date(e.createdAt).toLocaleString('zh-CN', {
              dateStyle: 'short',
              timeStyle: 'short'
            }),
            device: e.deviceName,
            action: e.action,
            operator: e.operator
          }))
      }
    }
  } catch (e: any) {
    return { success: false, error: `查询操作记录失败: ${e.message}` }
  }
}
