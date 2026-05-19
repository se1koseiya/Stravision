"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Download, Loader2, ExternalLink, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

  // 生成并下载PDF
  const downloadPdf = async () => {
    setIsGeneratingPdf(true)
    setPdfError(null)

    try {
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          reportTitle,
          reportId,
        }),
      })

      if (!response.ok) {
        throw new Error('PDF生成失败')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportTitle}_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF生成错误:', error)
      setPdfError(error instanceof Error ? error.message : 'PDF生成失败')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // 在新窗口预览
  const previewInNewWindow = () => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(htmlContent)
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
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </motion.div>
  )
}

export default ReportRenderer
