"use client"

import React, { useState, useEffect } from 'react'
import { Play, Code, RotateCcw, Monitor, Smartphone, Tablet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HTMLPreviewCardProps {
  code: string
  language?: string
}

export function HTMLPreviewCard({ code, language = 'html' }: HTMLPreviewCardProps) {
  const [isPreview, setIsPreview] = useState(false)
  const [key, setKey] = useState(0)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const renderCode = () => {
    const trimmed = code.trim()
    if (trimmed.toLowerCase().startsWith('<!doctype html>') || trimmed.toLowerCase().startsWith('<html')) {
        return code
    }
    
    // Auto-wrap for fragments or JS
    const isJS = language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts'
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              margin: 0;
              padding: 20px;
              background: transparent;
            }
            /* Custom scrollbar for preview */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #bbb; }
          </style>
        </head>
        <body class="animate__animated animate__fadeIn">
          ${isJS ? '<div id="root"></div>' : trimmed}
          ${isJS ? `<script type="module">${trimmed}</script>` : ''}
        </body>
      </html>
    `
  }

  const viewWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  }

  return (
    <div className="my-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-400 shadow-sm shadow-red-400/20"></div>
            <div className="size-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/20"></div>
            <div className="size-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/20"></div>
          </div>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1"></div>
          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            {isPreview ? (
              <>
                <div className="size-1.5 rounded-full bg-primary animate-pulse"></div>
                实时渲染预览
              </>
            ) : (
              <>
                <Code size={12} className="text-zinc-400" />
                源代码内容
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPreview && (
            <div className="flex items-center bg-zinc-200/50 dark:bg-zinc-800 rounded-lg p-0.5 mr-2 animate-in fade-in zoom-in duration-300">
              <button 
                onClick={() => setViewMode('desktop')}
                className={cn("p-1 rounded-md transition-all", viewMode === 'desktop' ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-500")}
                title="桌面视图"
              ><Monitor size={14} /></button>
              <button 
                onClick={() => setViewMode('tablet')}
                className={cn("p-1 rounded-md transition-all", viewMode === 'tablet' ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-500")}
                title="平板视图"
              ><Tablet size={14} /></button>
              <button 
                onClick={() => setViewMode('mobile')}
                className={cn("p-1 rounded-md transition-all", viewMode === 'mobile' ? "bg-white dark:bg-zinc-700 text-primary shadow-sm" : "text-zinc-500")}
                title="手机视图"
              ><Smartphone size={14} /></button>
            </div>
          )}

          <button 
            onClick={() => setIsPreview(!isPreview)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm",
              isPreview 
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" 
                : "bg-primary dark:bg-primary text-white hover:bg-emerald-700 dark:hover:bg-emerald-400"
            )}
          >
            {isPreview ? <Code size={14} /> : <Play size={14} />}
            {isPreview ? '返回代码' : '渲染运行'}
          </button>
          
          {isPreview && (
            <button 
              onClick={() => setKey(k => k + 1)}
              className="p-2 text-zinc-500 hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
              title="刷新预览"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="relative bg-zinc-50 dark:bg-black/20 min-h-[100px] flex justify-center">
        {isPreview ? (
          <div className="w-full flex justify-center py-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
            <div 
                className="transition-all duration-500 ease-in-out shadow-2xl rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white overflow-hidden" 
                style={{ width: viewWidths[viewMode], height: '500px' }}
            >
              <iframe
                key={key}
                srcDoc={renderCode()}
                className="w-full h-full border-0"
                sandbox="allow-scripts"
                title="HTML Preview Content"
              />
            </div>
          </div>
        ) : (
          <div className="w-full max-h-[600px] overflow-auto">
            <pre className="p-6 text-sm font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed">
              <code className={cn("language-" + language)}>{code}</code>
            </pre>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      {isPreview && (
        <div className="px-5 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-primary/5 flex items-center justify-between">
           <span className="text-[10px] text-primary/70 dark:text-emerald-400/50 font-medium">预览模式已启用 (Sandboxed Iframe)</span>
           <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">渲染自：{language}</span>
        </div>
      )}
    </div>
  )
}
