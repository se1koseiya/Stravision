"use client"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * AI Assistant 骨架屏 — 完全匹配真实页面布局
 * 真实布局：左侧 Sider(260px) + 右侧 Content(top bar + chat area + input)
 */
export function AIAssistantSkeleton() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden flex font-sans bg-gray-50 dark:bg-slate-950 text-zinc-900 dark:text-slate-100">
      {/* ===== Sidebar (260px) ===== */}
      <div
        className="dark:bg-slate-900"
        style={{
          width: 260,
          background: "#f7f8fa",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* 顶部标题栏 */}
        <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 14px" }}>
          <Skeleton className="h-7 w-20" />
          <div style={{ flex: 1 }} />
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg ml-1" />
        </div>

        {/* 新建对话按钮 */}
        <div style={{ padding: "0 12px 10px" }}>
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>

        {/* 对话列表 */}
        <div style={{ flex: 1, overflow: "hidden", padding: "2px 10px 0" }}>
          {/* 今天分组 */}
          <div style={{ padding: "10px 4px 6px" }}>
            <Skeleton className="h-3 w-8" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="dark:bg-slate-800/50"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 2,
              }}
            >
              <Skeleton className="size-4 rounded-sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Skeleton className="h-3.5 w-full" />
              </div>
              <Skeleton className="size-4 rounded" />
            </div>
          ))}

          {/* 更早分组 */}
          <div style={{ padding: "10px 4px 6px" }}>
            <Skeleton className="h-3 w-8" />
          </div>
          {[4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="dark:bg-slate-800/50"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                marginBottom: 2,
              }}
            >
              <Skeleton className="size-4 rounded-sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <Skeleton className="size-4 rounded" />
            </div>
          ))}
        </div>

        {/* 底部用户区域 */}
        <div
          className="dark:border-slate-700"
          style={{
            padding: "12px 12px 16px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Skeleton className="size-8 rounded-full" />
          <div style={{ flex: 1 }}>
            <Skeleton className="h-3.5 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-7 rounded" />
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="dark:bg-slate-950" style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", background: "#f7f8fa" }}>
        {/* Top Bar (h-12) */}
        <div className="h-12 flex items-center gap-3 px-4 shrink-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <div className="flex-1" />
        </div>

        {/* Chat Area — MateChatHome 首页 */}
        <div
          className="dark:bg-slate-900"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#fff",
            borderRadius: "0 12px 0 0",
          }}
        >
          {/* MateChatHome 欢迎界面骨架 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            {/* Logo / Avatar */}
            <Skeleton className="size-16 rounded-2xl mb-4" />

            {/* 欢迎标题 */}
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-8" />

            {/* 快捷操作卡片 */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="dark:border-slate-700 dark:bg-slate-800/50"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <Skeleton className="size-9 rounded-lg" />
                  <div style={{ flex: 1 }}>
                    <Skeleton className="h-3.5 w-20 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ChatSenderInput 底部输入框 */}
          <div className="dark:border-slate-700" style={{ padding: "12px 16px 16px", borderTop: "1px solid #f5f5f5" }}>
            <div
              className="dark:bg-slate-800 dark:border-slate-700"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 8,
                background: "#f9fafb",
                borderRadius: 16,
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
              }}
            >
              {/* 附件按钮 */}
              <Skeleton className="size-8 rounded-lg" />
              {/* 输入区域 */}
              <div style={{ flex: 1 }}>
                <Skeleton className="h-5 w-full" />
              </div>
              {/* 发送按钮 */}
              <Skeleton className="size-8 rounded-full" />
            </div>
            {/* 底部工具栏 */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-5 w-14 rounded" />
              </div>
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
