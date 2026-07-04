"use client"

import dynamic from "next/dynamic"

// 知识库市场浏览页：复用与 MCP 商店一致的 UI 风格
// - 标题/插图/主标签/子标签/搜索/卡片网格/详情弹窗
// - 详情页内支持：订阅 / 取消订阅 / 进入对话
const KBStoreContent = dynamic(
  () => import("@/components/kb/kb-store-content").then(m => ({ default: m.KBStoreContent })),
  { ssr: false }
)

export default function KBStorePage() {
  return <KBStoreContent />
}
