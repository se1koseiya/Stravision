/**
 * AI报告生成功能使用示例
 * 展示如何在不同场景下生成和使用报告
 */

import { ReportGenerator, ReportData } from '@/lib/ai/report-generator'
import { ReportRenderer } from '@/components/ai/report-renderer'

// ============================================
// 示例 1: 生成环境监测报告
// ============================================
export function generateEnvironmentReport(deviceData: any) {
  const reportData: ReportData = {
    title: '温室环境监测报告',
    summary: `本报告分析了${new Date().toLocaleDateString('zh-CN')}的温室环境数据，整体环境良好，发现2处需要优化的地方。`,
    sections: [
      {
        title: '温度分析',
        content: `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #D97706;">
              <h4 style="margin: 0 0 8px 0; color: #71717A; font-size: 14px;">平均温度</h4>
              <p style="margin: 0; font-size: 28px; font-weight: bold; color: #D97706;">${deviceData.temperature.avg}°C</p>
            </div>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #009456;">
              <h4 style="margin: 0 0 8px 0; color: #71717A; font-size: 14px;">最低温度</h4>
              <p style="margin: 0; font-size: 28px; font-weight: bold; color: #009456;">${deviceData.temperature.min}°C</p>
            </div>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #DC2626;">
              <h4 style="margin: 0 0 8px 0; color: #71717A; font-size: 14px;">最高温度</h4>
              <p style="margin: 0; font-size: 28px; font-weight: bold; color: #DC2626;">${deviceData.temperature.max}°C</p>
            </div>
          </div>
          <p>温度控制良好，全天保持在草莓生长的适宜范围（18-28°C）内。</p>
        `,
        type: 'text'
      },
      {
        title: '湿度分析',
        content: `
          | 时段 | 平均湿度 | 状态 |
          |------|----------|------|
          | 00:00-06:00 | ${deviceData.humidity.night}% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
          | 06:00-12:00 | ${deviceData.humidity.morning}% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
          | 12:00-18:00 | ${deviceData.humidity.afternoon}% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #fef3c7; color: #92400e;">偏低</span> |
          | 18:00-24:00 | ${deviceData.humidity.evening}% | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
        `,
        type: 'table'
      },
      {
        title: '优化建议',
        content: `
          - 建议在12:00-18:00时段增加喷雾频率，提高湿度
          - 夜间可适当降低温度2-3度，有利于养分积累
          - 保持良好的通风，避免病害发生
        `,
        type: 'list'
      },
      {
        title: '重要提示',
        content: '明天预计有强降温，请提前检查保温设备，确保温度不低于15°C。',
        type: 'highlight'
      }
    ],
    metadata: {
      '分析时段': `${new Date().toLocaleDateString('zh-CN')} 00:00 - 24:00`,
      '数据点数': '1440',
      '采样间隔': '1分钟',
      '置信度': '95%'
    }
  }

  return ReportGenerator.generateHtmlReport(reportData)
}

// ============================================
// 示例 2: 生成异常诊断报告
// ============================================
export function generateDiagnosticReport(anomaly: any) {
  const reportData: ReportData = {
    title: '设备异常诊断报告',
    summary: `检测到${anomaly.deviceName}出现异常，系统已自动生成诊断报告并提供解决方案。`,
    sections: [
      {
        title: '异常概述',
        content: `
          <div style="background: linear-gradient(135deg, #DC2626 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: white; font-size: 20px;">⚠️ ${anomaly.type}</h3>
            <p style="margin: 0; font-size: 16px;">${anomaly.description}</p>
          </div>
        `,
        type: 'text'
      },
      {
        title: '异常详情',
        content: `
          | 项目 | 详情 |
          |------|------|
          | 异常设备 | ${anomaly.deviceName} |
          | 异常时间 | ${anomaly.timestamp} |
          | 异常类型 | ${anomaly.type} |
          | 严重程度 | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #fef3c7; color: #92400e;">${anomaly.severity}</span> |
          | 影响范围 | ${anomaly.impact} |
        `,
        type: 'table'
      },
      {
        title: '解决方案',
        content: `
          1. **立即检查**: 检查设备连接线是否松动或损坏
          2. **清洁维护**: 清洁传感器探头，去除可能的污染物
          3. **备用方案**: 如问题持续，启用备用设备
          4. **技术支持**: 联系技术支持 400-xxx-xxxx
        `,
        type: 'list'
      },
      {
        title: '预防措施',
        content: '建议每周进行一次设备检查，每月进行一次深度维护，可有效降低故障率。',
        type: 'highlight'
      }
    ],
    metadata: {
      '报告生成时间': new Date().toLocaleString('zh-CN'),
      '诊断模型': 'AI智能诊断 v2.0',
      '处理优先级': '高'
    }
  }

  return ReportGenerator.generateHtmlReport(reportData)
}

// ============================================
// 示例 3: 生成数据趋势分析报告
// ============================================
export function generateTrendAnalysisReport(historicalData: any) {
  const reportData: ReportData = {
    title: '一周数据趋势分析报告',
    summary: '过去一周环境数据整体稳定，温度波动在±2°C范围内，湿度控制良好，发现3个优化机会。',
    sections: [
      {
        title: '关键指标统计',
        content: `
          | 指标 | 平均值 | 最小值 | 最大值 | 标准差 | 评价 |
          |------|--------|--------|--------|--------|------|
          | 温度 | ${historicalData.temperature.avg}°C | ${historicalData.temperature.min}°C | ${historicalData.temperature.max}°C | ${historicalData.temperature.std} | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">优秀</span> |
          | 湿度 | ${historicalData.humidity.avg}% | ${historicalData.humidity.min}% | ${historicalData.humidity.max}% | ${historicalData.humidity.std} | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">良好</span> |
          | 光照 | ${historicalData.light.avg} lux | ${historicalData.light.min} lux | ${historicalData.light.max} lux | ${historicalData.light.std} | <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: #d1fae5; color: #065f46;">正常</span> |
        `,
        type: 'table'
      },
      {
        title: '趋势洞察',
        content: `
          - **温度控制**: 温度波动小（标准差${historicalData.temperature.std}），说明温控系统运行稳定
          - **湿度管理**: 湿度保持在理想范围，有利于草莓生长和病害预防
          - **光照充足**: 光照时长和强度均符合要求，光合作用效率高
          - **能耗分析**: 当前能耗水平合理，但仍有15%的优化空间
        `,
        type: 'list'
      },
      {
        title: '优化建议',
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
        type: 'text'
      }
    ],
    metadata: {
      '分析周期': '2024-01-08 至 2024-01-15',
      '数据点数': '10080',
      '分析模型': 'AI趋势分析 v3.0',
      '报告版本': 'v1.0'
    }
  }

  return ReportGenerator.generateHtmlReport(reportData)
}

// ============================================
// 示例 4: 在React组件中使用
// ============================================
export function ReportExampleComponent() {
  const [reportHtml, setReportHtml] = React.useState<string>('')

  const handleGenerateReport = () => {
    // 模拟设备数据
    const deviceData = {
      temperature: { avg: 24.5, min: 22, max: 27 },
      humidity: { night: 70, morning: 68, afternoon: 62, evening: 72 }
    }

    const html = generateEnvironmentReport(deviceData)
    setReportHtml(html)
  }

  return (
    <div className="p-6">
      <button
        onClick={handleGenerateReport}
        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
      >
        生成环境报告
      </button>

      {reportHtml && (
        <div className="mt-6">
          <ReportRenderer
            htmlContent={reportHtml}
            reportTitle="温室环境监测报告"
            reportId={`report_${Date.now()}`}
          />
        </div>
      )}
    </div>
  )
}

// ============================================
// 示例 5: 在AI聊天中集成
// ============================================
export function integrateReportInChat(aiResponse: string, reportData: ReportData) {
  const htmlContent = ReportGenerator.generateHtmlReport(reportData)
  
  // 在AI响应中嵌入报告
  return `${aiResponse}

[REPORT:${reportData.title}]
${htmlContent}
[/REPORT]

您可以点击上方按钮下载HTML或PDF格式的报告。`
}

// ============================================
// 示例 6: 定时生成报告
// ============================================
export async function scheduledReportGeneration() {
  // 每天凌晨生成前一天的报告
  const deviceData = await fetchDeviceData()
  const reportHtml = generateEnvironmentReport(deviceData)
  
  // 保存到数据库或发送邮件
  await saveReportToDatabase({
    title: '每日环境监测报告',
    html: reportHtml,
    date: new Date().toISOString()
  })
  
  // 可选：发送邮件通知
  await sendReportEmail({
    to: 'admin@example.com',
    subject: '每日环境监测报告',
    html: reportHtml
  })
}

// ============================================
// 辅助函数
// ============================================
async function fetchDeviceData() {
  // 从数据库获取设备数据
  return {
    temperature: { avg: 24.5, min: 22, max: 27 },
    humidity: { night: 70, morning: 68, afternoon: 62, evening: 72 }
  }
}

async function saveReportToDatabase(report: any) {
  // 保存报告到数据库
  console.log('Saving report:', report)
}

async function sendReportEmail(email: any) {
  // 发送邮件
  console.log('Sending email:', email)
}
