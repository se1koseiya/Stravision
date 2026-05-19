"use client"

import { useState } from "react"
import { Globe, Zap, ArrowUpRight, Loader2, X, PanelLeftOpen } from "lucide-react"
import { WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody } from "@/components/ai/web-preview"
import { MCPToolDisplay } from "@/components/ai/mcp-tool-display"
import { cn } from "@/lib/utils"

export default function TestStudioPanel() {
  const [studioOpen, setStudioOpen] = useState(true)
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState("https://www.bilibili.com")
  const [studioData, setStudioData] = useState([
    {
      name: "mcp_brave_search",
      input: { query: "Next.js 15 features" },
      result: {
        results: [
          { title: "Next.js 15 Release", url: "https://nextjs.org/blog/next-15", snippet: "New features in Next.js 15..." }
        ]
      }
    }
  ])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white">Studio Panel Test</h1>
        
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 bg-white dark:bg-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Main Chat Area</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              This simulates the main chat area. The studio panel should appear on the right with:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Emerald colors instead of blue</li>
              <li>New shadcn WebPreview component</li>
              <li>Proper browser preview functionality</li>
            </ul>
            
            <div className="mt-6 space-y-4">
              <button 
                onClick={() => setStudioOpen(!studioOpen)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {studioOpen ? 'Hide' : 'Show'} Studio Panel
              </button>
              
              <button 
                onClick={() => setCurrentBrowserUrl(currentBrowserUrl === "https://www.bilibili.com" ? "https://example.com" : "https://www.bilibili.com")}
                className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 transition-colors ml-4"
              >
                切换网站 ({currentBrowserUrl.includes('bilibili') ? 'B站→Example' : 'Example→B站'})
              </button>
            </div>
          </div>

          {/* Studio Panel */}
          <div className={cn(
            "relative flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-20",
            studioOpen ? "w-[400px] lg:w-[480px] xl:w-[550px] translate-x-0" : "w-0 translate-x-full opacity-0"
          )}>
            {studioOpen && (
              <div className="w-full h-full flex flex-col overflow-hidden">
                {/* Studio Header */}
                <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-primary dark:text-emerald-400 flex items-center justify-center">
                      <Zap size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 dark:text-white">工作室</h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Globe size={12} />
                        {studioData.length > 0 ? `正在处理: ${studioData[studioData.length - 1].name}...` : '等待工具执行...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setStudioOpen(false)}
                      className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <PanelLeftOpen size={18} className="rotate-180" />
                    </button>
                    <button 
                      onClick={() => setStudioOpen(false)}
                      className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Studio Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-[#09090B]">
                  <div className="space-y-6">
                    {/* Browser Preview with new shadcn WebPreview */}
                    {currentBrowserUrl && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 mb-4">
                            <WebPreview 
                                defaultUrl={currentBrowserUrl}
                                className="h-[400px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm"
                            >
                                <WebPreviewNavigation className="bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
                                    <div className="flex gap-1.5 mr-3">
                                        <div className="size-2.5 rounded-full bg-red-400" />
                                        <div className="size-2.5 rounded-full bg-amber-400" />
                                        <div className="size-2.5 rounded-full bg-green-400" />
                                    </div>
                                    <WebPreviewUrl 
                                        value={currentBrowserUrl}
                                        className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                        readOnly
                                    />
                                    <WebPreviewNavigationButton 
                                        tooltip="在新标签页打开"
                                        onClick={() => window.open(currentBrowserUrl, '_blank')}
                                    >
                                        <ArrowUpRight className="size-4" />
                                    </WebPreviewNavigationButton>
                                </WebPreviewNavigation>
                                <WebPreviewBody 
                                    src={currentBrowserUrl}
                                />
                            </WebPreview>
                        </div>
                    )}

                    {/* MCP Tool Results */}
                    {studioData.length > 0 ? (
                       studioData.map((data, idx) => (
                         <MCPToolDisplay
                           key={idx}
                           toolName={data.name}
                           result={'success'}
                           input={data.input}
                           output={data.result}
                           className="mb-4"
                         />
                       ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600 pt-20">
                         <Loader2 size={24} className="animate-spin mb-4" />
                         <p className="text-sm">等待工具执行结果...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}