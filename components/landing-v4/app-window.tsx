"use client"

import { useEffect, useState } from "react"
import { Avatar, ConfigProvider, theme } from "antd"
import zhCN from "antd/locale/zh_CN"
import { Conversations } from "@ant-design/x"
import { useTheme } from "next-themes"
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  Compass,
  FolderOpen,
  MessageSquare,
  PanelLeftClose,
  Search,
  SquarePen,
} from "lucide-react"
import { MateChatHome } from "@/components/ai/matechat-home"

/* ------------------------------------------------------------
   首屏应用窗口 —— 直接拼装 ai-assistant 的真实界面：
   · 左侧栏：照搬 app/ai-assistant/page.tsx 的侧栏结构（260px）
   · 主区域：真实 <MateChatHome />（打字机招呼语 / IP 动图 /
     真输入胶囊 / 记忆条 / 快捷指令胶囊全部来自产品代码）
   窗口高度固定，外层深色阴影托出「应用浮在页面上」的层次。
   ------------------------------------------------------------ */

const NAV_ITEMS = [
  { icon: Compass, label: "探索", badge: null as number | null },
  { icon: FolderOpen, label: "我的空间", badge: 6 },
  { icon: CalendarClock, label: "定时任务", badge: null },
  { icon: BookOpen, label: "知识库", badge: null },
]

const RECENT_ITEMS = [
  { key: "s1", label: "3 号棚湿度偏高怎么处理" },
  { key: "s2", label: "本茬生长情况复盘" },
  { key: "s3", label: "夜间补光时段优化" },
  { key: "s4", label: "今日巡检日报生成" },
  { key: "s5", label: "水肥一体化方案调整" },
]

export function AppWindow({ className }: { className?: string }) {
  const [input, setInput] = useState("")
  const [activeKey, setActiveKey] = useState("s1")
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"

  return (
    <div className={className}>
      <ConfigProvider
        locale={zhCN}
        theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm }}
      >
        <div className="mx-auto w-full max-w-[1060px]">
        <div className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-[#f7f8fa] shadow-[0_48px_110px_-48px_rgba(15,23,42,0.5)] dark:border-white/[0.08] dark:bg-[#141714] dark:shadow-[0_48px_110px_-48px_rgba(0,0,0,0.8)]">
          {/* 顶栏：窗口圆点 + 通知 */}
          <div className="flex h-12 items-center gap-3 border-b border-black/[0.055] bg-white px-4 dark:border-white/[0.08] dark:bg-[#191C1A]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
            </span>
            <span className="relative ml-auto flex size-8 items-center justify-center rounded-full text-zinc-500">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          <div className="flex h-[612px]">
            {/* ===== 侧栏（照搬 ai-assistant 真实侧栏） ===== */}
            <aside className="hidden w-[260px] shrink-0 flex-col sm:flex">
              <div className="flex items-center px-4 pb-3.5 pt-[18px]">
                <span className="text-[22px] font-bold tracking-tight text-zinc-900 dark:text-[#E4EEE9]">莓小智</span>
                <div className="flex-1" />
                <span className="flex size-8 items-center justify-center rounded-lg text-zinc-500 dark:text-[#9BA39E]">
                  <Search className="size-4" />
                </span>
                <span className="flex size-8 items-center justify-center rounded-lg text-zinc-500 dark:text-[#9BA39E]">
                  <PanelLeftClose className="size-4" />
                </span>
              </div>

              <div className="px-3 pb-2.5">
                <div className="flex h-10 w-full items-center justify-between rounded-[10px] border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-zinc-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/[0.16] dark:bg-[#1E2220] dark:text-[#D6DAD6] dark:shadow-none">
                  <span className="flex items-center gap-1.5">
                    <SquarePen className="size-[15px]" strokeWidth={1.8} />
                    新建对话
                  </span>
                  <MessageSquare className="size-[15px] text-zinc-400 dark:text-[#9BA39E]" />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-2.5">
                {NAV_ITEMS.map((n, i) => (
                  <div
                    key={n.label}
                    className="flex cursor-pointer select-none items-center gap-[7px] px-1 text-zinc-600 dark:text-[#9BA39E]"
                    style={{ paddingTop: i === 0 ? 10 : 8, paddingBottom: 6 }}
                  >
                    <n.icon className="size-[15px]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-zinc-700 dark:text-[#D6DAD6]">{n.label}</span>
                    {n.badge != null && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-lg bg-zinc-100 px-[5px] text-[10px] leading-4 text-zinc-400 dark:bg-[#2A2F2D] dark:text-[#9BA39E]">
                        {n.badge}
                      </span>
                    )}
                  </div>
                ))}

                <div className="px-1 pb-1 pt-3 text-[12px] font-medium text-zinc-500 dark:text-[#9BA39E]">最近对话</div>
                <Conversations
                  items={RECENT_ITEMS}
                  activeKey={activeKey}
                  onActiveChange={(k) => setActiveKey(String(k))}
                  styles={{ item: { borderRadius: 8, padding: "7px 10px 7px 32px", marginBottom: 1 } }}
                  className="[&_.ant-conversations-item]:!text-[#C2CAC5] dark:[&_.ant-conversations-item]:!text-[#C2CAC5] [&_.ant-conversations-item-active]:!text-[#E4EEE9] dark:[&_.ant-conversations-item-active]:!text-[#E4EEE9] dark:[&_.ant-conversations-label]:!text-[#9BA39E] dark:[&_.ant-conversations-label]:!opacity-100"
                />
              </div>

              {/* 用户区 */}
              <div className="flex items-center gap-2.5 rounded-[10px] bg-[#f5f5f5] p-2.5 mx-2 mb-2.5 dark:bg-[#1E2220]">
                <Avatar
                  size={32}
                  src="/images/user_default_avatar/avatar1.png"
                  className="!bg-[#e6f4ff] !text-[14px] !text-[#1677ff]"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight text-zinc-700 dark:text-[#E4EEE9]">
                    莓园主理人
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-[#9BA39E]">PRO</div>
                </div>
                <ChevronRight className="size-3.5 shrink-0 text-zinc-400 dark:text-[#9BA39E]" />
              </div>
            </aside>

            {/* ===== 主区域：真实 MateChatHome（跟随页面深浅色） ===== */}
            <main className="min-w-0 flex-1 p-3">
              <div className="h-full overflow-y-auto overflow-x-hidden rounded-[12px] bg-white dark:bg-[#111413]">
                <MateChatHome
                  onSendMessage={() => {}}
                  input={input}
                  setInput={setInput}
                  isLoading={false}
                  darkMode={dark}
                  approvalMode="auto"
                  setApprovalMode={() => {}}
                  enableReasoning={false}
                  setEnableReasoning={() => {}}
                  enableSearch={false}
                  setEnableSearch={() => {}}
                  hasSearchTool
                />
              </div>
            </main>
          </div>
        </div>
        </div>
      </ConfigProvider>
    </div>
  )
}
