"use client"

import dynamic from "next/dynamic"

// 新版插件商店页面：直接复用 unified-explore 中使用的 MCPStoreContent 组件
// 与技能商店保持完全一致的 UI 风格（标题/插图/主标签/子标签/搜索/卡片网格/详情弹窗）
const MCPStoreContent = dynamic(
  () => import("@/components/mcp/mcp-store-content").then(m => ({ default: m.MCPStoreContent })),
  { ssr: false }
)

export default function MCPStorePage() {
  return <MCPStoreContent />
}
