"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CitationCard } from "./citation-card"

interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

interface CitationGroupProps {
  sources: Citation[]
}

export function CitationGroup({ sources }: CitationGroupProps) {
  const [open, setOpen] = React.useState(false)

  if (!sources || sources.length === 0) return null

  // Ensure unique keys for citation cards by combining URL and index
  return (
    <div className="mt-4 mb-2 relative z-10">
      <Sheet open={open} onOpenChange={setOpen}>
        <button 
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/30 dark:to-teal-950/30 dark:hover:from-emerald-900/40 dark:hover:to-teal-900/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-full pl-1.5 pr-4 py-1.5 transition-all cursor-pointer group select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 hover:shadow-md hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/20"
        >
          <div className="flex -space-x-2 overflow-hidden py-0.5 pl-0.5">
            {sources.slice(0, 3).map((s, i) => (
              <div 
                key={i} 
                className="size-6 rounded-full bg-gradient-to-br from-primary to-teal-600 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 relative z-10"
              >
                {s.number}
              </div>
            ))}
            {sources.length > 3 && (
              <div className="size-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-bold text-white shrink-0 relative z-20">
                +{sources.length - 3}
              </div>
            )}
          </div>
          <span className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold group-hover:text-emerald-800 dark:group-hover:text-emerald-200 transition-colors">
            参考来源 {sources.length}
          </span>
        </button>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[80vh] overflow-hidden flex flex-col p-0 z-[100] bg-gradient-to-b from-emerald-50/30 to-white dark:from-emerald-950/20 dark:to-zinc-900">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-emerald-100/50 dark:border-emerald-900/30">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              参考来源 ({sources.length})
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
            {sources.map((s, i) => (
              <CitationCard key={`${s.url}-${i}`} citation={s} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
