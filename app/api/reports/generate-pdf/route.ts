import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export const runtime = 'nodejs'
export const maxDuration = 60 // 最长60秒

interface GeneratePdfRequest {
  htmlContent: string
  reportTitle?: string
  reportId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePdfRequest = await request.json()
    const { htmlContent, reportTitle = 'AI报告', reportId } = body

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML内容不能为空' },
        { status: 400 }
      )
    }

    // 使用 puppeteer 生成 PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()

    // 设置完整的HTML文档结构
    const fullHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: #1a1a1a;
    }
    
    h1 {
      font-size: 32px;
      border-bottom: 2px solid #10b981;
      padding-bottom: 12px;
    }
    
    h2 {
      font-size: 24px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
    }
    
    h3 {
      font-size: 20px;
    }
    
    p {
      margin-bottom: 16px;
    }
    
    ul, ol {
      margin-bottom: 16px;
      padding-left: 32px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 14px;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 12px;
      text-align: left;
    }
    
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "Courier New", monospace;
      font-size: 0.9em;
    }
    
    pre {
      background-color: #f3f4f6;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 16px;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    blockquote {
      border-left: 4px solid #10b981;
      padding-left: 16px;
      margin: 16px 0;
      color: #6b7280;
      font-style: italic;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #10b981;
    }
    
    .report-title {
      font-size: 36px;
      color: #10b981;
      margin-bottom: 8px;
    }
    
    .report-meta {
      color: #6b7280;
      font-size: 14px;
    }
    
    .report-footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    
    .highlight {
      background-color: #fef3c7;
      padding: 2px 4px;
      border-radius: 2px;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    
    .badge-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    
    .badge-warning {
      background-color: #fef3c7;
      color: #92400e;
    }
    
    .badge-danger {
      background-color: #fee2e2;
      color: #991b1b;
    }
    
    .badge-info {
      background-color: #dbeafe;
      color: #1e40af;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1 class="report-title">${reportTitle}</h1>
    <div class="report-meta">
      生成时间: ${new Date().toLocaleString('zh-CN')}
      ${reportId ? ` | 报告ID: ${reportId}` : ''}
    </div>
  </div>
  
  <div class="report-content">
    ${htmlContent}
  </div>
  
  <div class="report-footer">
    <p>本报告由莓界AI智能助手自动生成</p>
    <p>© ${new Date().getFullYear()} 莓界智慧农业平台 - 保留所有权利</p>
  </div>
</body>
</html>
    `

    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
    })

    // 生成PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #6b7280; padding: 0 15mm;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
    })

    await browser.close()

    // 返回PDF文件
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(reportTitle)}_${Date.now()}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF生成错误:', error)
    return NextResponse.json(
      { 
        error: 'PDF生成失败', 
        details: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    )
  }
}
