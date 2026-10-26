/**
 * AI报告生成器
 * 用于生成结构化的HTML报告
 */

export interface ReportSection {
  title: string
  content: string
  type?: 'text' | 'table' | 'list' | 'chart' | 'highlight'
}

export interface ReportData {
  title: string
  summary?: string
  sections: ReportSection[]
  metadata?: Record<string, any>
}

export class ReportGenerator {
  /**
   * 生成完整的HTML报告
   */
  static generateHtmlReport(data: ReportData): string {
    const { title, summary, sections, metadata } = data

    let html = ''

    // 添加摘要
    if (summary) {
      html += `
        <div style="background: linear-gradient(135deg, #059669 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 32px;">
          <h2 style="margin: 0 0 12px 0; color: white; border: none;">📊 报告摘要</h2>
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">${summary}</p>
        </div>
      `
    }

    // 添加各个章节
    sections.forEach((section, index) => {
      html += this.generateSection(section, index + 1)
    })

    // 添加元数据
    if (metadata && Object.keys(metadata).length > 0) {
      html += this.generateMetadataSection(metadata)
    }

    return html
  }

  /**
   * 生成单个章节
   */
  private static generateSection(section: ReportSection, index: number): string {
    const { title, content, type = 'text' } = section

    let sectionHtml = `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #059669; display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #059669; color: white; border-radius: 8px; font-size: 16px; font-weight: bold;">${index}</span>
          ${title}
        </h2>
    `

    switch (type) {
      case 'table':
        sectionHtml += this.generateTable(content)
        break
      case 'list':
        sectionHtml += this.generateList(content)
        break
      case 'highlight':
        sectionHtml += this.generateHighlight(content)
        break
      default:
        sectionHtml += `<div style="margin-top: 16px;">${content}</div>`
    }

    sectionHtml += `</div>`
    return sectionHtml
  }

  /**
   * 生成表格
   */
  private static generateTable(content: string): string {
    // 假设content是markdown表格格式或已经是HTML表格
    if (content.includes('<table>')) {
      return content
    }

    // 简单的markdown表格解析
    const lines = content.trim().split('\n')
    if (lines.length < 2) return `<p>${content}</p>`

    let tableHtml = '<table>'
    
    lines.forEach((line, index) => {
      if (line.includes('|')) {
        const cells = line.split('|').filter(cell => cell.trim())
        
        // 跳过分隔行
        if (cells.every(cell => /^[-:\s]+$/.test(cell))) {
          return
        }

        const tag = index === 0 ? 'th' : 'td'
        tableHtml += '<tr>'
        cells.forEach(cell => {
          tableHtml += `<${tag}>${cell.trim()}</${tag}>`
        })
        tableHtml += '</tr>'
      }
    })
    
    tableHtml += '</table>'
    return tableHtml
  }

  /**
   * 生成列表
   */
  private static generateList(content: string): string {
    if (content.includes('<ul>') || content.includes('<ol>')) {
      return content
    }

    const lines = content.trim().split('\n')
    let listHtml = '<ul>'
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed) {
        // 移除markdown列表标记
        const cleaned = trimmed.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '')
        listHtml += `<li>${cleaned}</li>`
      }
    })
    
    listHtml += '</ul>'
    return listHtml
  }

  /**
   * 生成高亮内容
   */
  private static generateHighlight(content: string): string {
    return `
      <div style="background: #f4f4f5; border-left: 4px solid #52525B; padding: 16px; border-radius: 8px; margin-top: 16px;">
        <p style="margin: 0; color: #92400e; font-weight: 500;">⚠️ ${content}</p>
      </div>
    `
  }

  /**
   * 生成元数据章节
   */
  private static generateMetadataSection(metadata: Record<string, any>): string {
    let html = `
      <div style="margin-top: 48px; padding-top: 24px; border-top: 2px solid #e4e4e7;">
        <h3 style="color: #71717A; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">报告元数据</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
    `

    Object.entries(metadata).forEach(([key, value]) => {
      html += `
        <div style="background: #fafafa; padding: 12px; border-radius: 8px;">
          <div style="font-size: 12px; color: #71717A; margin-bottom: 4px;">${key}</div>
          <div style="font-weight: 600; color: #27272a;">${value}</div>
        </div>
      `
    })

    html += `
        </div>
      </div>
    `

    return html
  }

  /**
   * 从AI响应中提取报告数据
   */
  static parseAiResponse(response: string): ReportData | null {
    try {
      // 尝试解析JSON格式的报告
      if (response.trim().startsWith('{')) {
        return JSON.parse(response) as ReportData
      }

      // 如果是markdown格式，进行简单解析
      const lines = response.split('\n')
      const sections: ReportSection[] = []
      let currentSection: ReportSection | null = null
      let title = '分析报告'

      lines.forEach(line => {
        const trimmed = line.trim()
        
        // 提取标题
        if (trimmed.startsWith('# ')) {
          title = trimmed.substring(2)
        }
        // 提取二级标题作为章节
        else if (trimmed.startsWith('## ')) {
          if (currentSection) {
            sections.push(currentSection)
          }
          currentSection = {
            title: trimmed.substring(3),
            content: '',
            type: 'text'
          }
        }
        // 添加内容到当前章节
        else if (currentSection && trimmed) {
          currentSection.content += line + '\n'
        }
      })

      if (currentSection) {
        sections.push(currentSection)
      }

      return {
        title,
        sections: sections.length > 0 ? sections : [{
          title: '分析结果',
          content: response,
          type: 'text'
        }]
      }
    } catch (error) {
      console.error('解析AI响应失败:', error)
      return null
    }
  }

  /**
   * 创建简单的数据分析报告
   */
  static createDataAnalysisReport(
    title: string,
    data: any,
    insights: string[]
  ): ReportData {
    return {
      title,
      summary: `本报告基于最新数据生成，包含 ${insights.length} 项关键洞察。`,
      sections: [
        {
          title: '数据概览',
          content: JSON.stringify(data, null, 2),
          type: 'text'
        },
        {
          title: '关键洞察',
          content: insights.map(insight => `- ${insight}`).join('\n'),
          type: 'list'
        }
      ],
      metadata: {
        '生成时间': new Date().toLocaleString('zh-CN'),
        '数据来源': '实时监测系统',
        '分析模型': 'AI智能分析'
      }
    }
  }
}
