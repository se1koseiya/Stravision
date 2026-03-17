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
        <div className={cn("w-full p-0 overflow-hidden bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800", className)}>
            <div className="p-4 space-y-3">
                {/* Header: Icon + Hostname */}
                <div className="flex items-center gap-2">
                    <div className="relative size-5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                            alt=""
                            className="size-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                        {hostname}
                    </span>
                </div>

                {/* Body: Title + Description */}
                <div>
                    <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight hover:underline mb-1"
                    >
                        {citation.title}
                    </a>
                    {citation.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                            {citation.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Footer: Action */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                    Visit Source <ExternalLink size={10} />
                </a>
            </div>
        </div>
    )
}
