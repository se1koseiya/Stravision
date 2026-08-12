
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, Sparkles, Bug, Megaphone, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ChangelogData {
  version: string
  date: string
  title?: string
  imageUrl?: string
  features: string[]
  improvements: string[]
  fixes: string[]
  action?: {
    label: string
    url: string
  }
}

interface ChangelogCardProps {
  content: string | ChangelogData
}

export function ChangelogCard({ content }: ChangelogCardProps) {
  let data: ChangelogData

  try {
    data = typeof content === 'string' ? JSON.parse(content) : content
  } catch {
    return <div className="text-red-500 text-sm">无效的更新日志数据</div>
  }

  return (
    <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden rounded-xl">
      {/* Header */}
      <div className="bg-zinc-50/50 dark:bg-zinc-800/20 p-5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="rounded-md font-mono text-xs bg-emerald-50 dark:bg-emerald-900/20 text-primary dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30 px-2 py-0.5">
            {data.version}
          </Badge>
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium font-mono">
            {data.date}
          </span>
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-start gap-2 leading-tight">
          <Megaphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          {data.title || "系统更新公告"}
        </h3>
      </div>

      {/* Optional Image */}
      {data.imageUrl && (
        <div className="w-full h-48 relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.title || "Update Image"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Content */}
      <CardContent className="p-5 space-y-6">
        {data.features && data.features.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Rocket className="h-3 w-3" />
              新功能
            </h4>
            <ul className="space-y-2 pl-1">
              {data.features.map((item, i) => (
                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-3 leading-relaxed">
                  <span className="mt-2 h-1 w-1 rounded-full bg-blue-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.improvements && data.improvements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3 w-3" />
              优化改进
            </h4>
            <ul className="space-y-2 pl-1">
              {data.improvements.map((item, i) => (
                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-3 leading-relaxed">
                  <span className="mt-2 h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.fixes && data.fixes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-red-600 dark:text-red-400">
              <Bug className="h-3 w-3" />
              问题修复
            </h4>
            <ul className="space-y-2 pl-1">
              {data.fixes.map((item, i) => (
                <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-3 leading-relaxed">
                  <span className="mt-2 h-1 w-1 rounded-full bg-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.action && data.action.url && (
          <div className="pt-2">
            <Button asChild className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg shadow-none group">
              <Link href={data.action.url}>
                {data.action.label || "查看详情"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
