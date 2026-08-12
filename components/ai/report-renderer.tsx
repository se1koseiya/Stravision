"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Download, Loader2, ExternalLink, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { sanitizeHtml } from "@/lib/security/sanitize-html"
import { toast } from "sonner"

interface ReportRendererProps {
  htmlContent: string
  reportTitle?: string
  reportId?: string
  className?: string
}

export function ReportRenderer({ 
  htmlContent, 
  reportTitle = "AI分析报告",
  reportId,
  className 
}: ReportRendererProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // XSS 防护：净化 AI 生成的 HTML，移除 <script>、事件属性、javascript: 协议等
  const sanitizedHtml = useMemo(() => sanitizeHtml(htmlContent), [htmlContent])

  console.log('[ReportRenderer] Rendering with:', { reportTitle, htmlLength: htmlContent.length, reportId })

  // 下载HTML文件
  const downloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${reportTitle}_${Date.now()}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 生成并下载PDF（前端 jspdf + html-to-image 方案）
  const downloadPdf = async () => {
    setIsGeneratingPdf(true)
    setPdfError(null)

    try {
      const htmlToImage = await import('html-to-image')
      const { default: jsPDF } = await import('jspdf')

      // 创建临时容器渲染报告 HTML，避免受当前组件样式干扰
      const container = document.createElement('div')
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;'
      container.innerHTML = htmlContent
      document.body.appendChild(container)

      try {
        const dataUrl = await htmlToImage.toPng(container, { backgroundColor: '#ffffff' })

        const img = new window.Image()
        img.src = dataUrl
        await new Promise((resolve) => { img.onload = resolve })

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const imgWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm
        const imgHeight = (img.height * imgWidth) / img.width
        let heightLeft = imgHeight
        let position = 0

        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        pdf.save(`${reportTitle}_${Date.now()}.pdf`)
        toast.success("PDF 已下载")
      } finally {
        document.body.removeChild(container)
      }
    } catch (error) {
      console.error('PDF生成错误:', error)
      setPdfError(error instanceof Error ? error.message : 'PDF生成失败')
      toast.error("PDF 下载失败")
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // 在新窗口预览（使用净化后的 HTML，防止 XSS）
  const previewInNewWindow = () => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(sanitizedHtml)
      newWindow.document.close()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm",
        className
      )}
    >
      {/* 简洁的顶部工具栏 */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{reportTitle}</h3>
          
          {/* 图标按钮组 */}
          <div className="flex items-center gap-1">
            <button
              onClick={downloadHtml}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors group"
              title="下载HTML"
            >
              <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
            </button>
            
            <button
              onClick={downloadPdf}
              disabled={isGeneratingPdf}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              title="下载PDF"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
              )}
            </button>
            
            <button
              onClick={previewInNewWindow}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors group"
              title="在新窗口打开"
            >
              <ExternalLink className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
            </button>
            
            <button
              onClick={previewInNewWindow}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors group"
              title="全屏查看"
            >
              <Maximize2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
            </button>
          </div>
        </div>
        
        {pdfError && (
          <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-xs">
            {pdfError}
          </div>
        )}
      </div>

      {/* 报告内容预览 */}
      <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    </motion.div>
  )
}

export default ReportRenderer
