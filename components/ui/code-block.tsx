"use client"

import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = "json", className }: CodeBlockProps) {
  return (
    <div className={cn("relative", className)}>
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  )
}