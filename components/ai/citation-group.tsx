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
          className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full pl-1 pr-3 py-1 transition-colors cursor-pointer group select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          <div className="flex -space-x-2 overflow-hidden py-0.5 pl-0.5">
            {sources.slice(0, 3).map((s, i) => (
              <div 
                key={i} 
                className="size-5 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm shrink-0 relative z-10"
              >
                {s.number}
              </div>
            ))}
            {sources.length > 3 && (
              <div className="size-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[9px] font-medium text-gray-500 shrink-0 relative z-20">
                +{sources.length - 3}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500 font-medium group-hover:text-gray-700">Source</span>
        </button>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[80vh] overflow-hidden flex flex-col p-0 z-[100]">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle>参考来源 ({sources.length})</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
            {sources.map((s, i) => (
              <CitationCard key={`${s.url}-${i}`} citation={s} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
