"use client"

import * as React from "react"
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import Image from "next/image"

import { cn } from "@/lib/utils"

interface CitationCardProps {
    citation: {
        number: string
        title: string
        url: string
        description?: string
    }
    className?: string
}

export function CitationCard({ citation, className }: CitationCardProps) {
    const hostname = new URL(citation.url).hostname

    return (
        <div className={cn(
            "group w-full p-0 overflow-hidden rounded-2xl transition-all duration-300",
            "bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50",
            "dark:from-emerald-950/20 dark:via-zinc-900 dark:to-teal-950/20",
            "border border-emerald-200/60 dark:border-emerald-900/30",
            "hover:border-emerald-300 dark:hover:border-emerald-800",
            "hover:shadow-lg hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/20",
            "hover:-translate-y-0.5",
            className
        )}>
            {/* 顶部装饰条 */}
            <div className="h-1 bg-gradient-to-r from-primary via-teal-500 to-cyan-500" />
            
            <div className="p-4 space-y-3">
                {/* Header: Icon + Hostname + Number Badge */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative size-6 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 shrink-0 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                            <img
                                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                                alt=""
                                className="size-4 object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        </div>
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                            {hostname}
                        </span>
                    </div>
                    {citation.number && (
                        <div className="shrink-0 size-6 rounded-full bg-gradient-to-br from-primary to-teal-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            {citation.number}
                        </div>
                    )}
                </div>

                {/* Body: Title + Description */}
                <div>
                    <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight hover:text-primary dark:hover:text-emerald-400 transition-colors mb-2 line-clamp-2"
                    >
                        {citation.title}
                    </a>
                    {citation.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {citation.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Footer: Action */}
            <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/30 px-4 py-2.5 border-t border-emerald-100/50 dark:border-emerald-900/30 flex justify-end">
                <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary dark:text-emerald-400 flex items-center gap-1.5 hover:gap-2 transition-all group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
                >
                    访问来源 <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" />
                </a>
            </div>
        </div>
    )
}
