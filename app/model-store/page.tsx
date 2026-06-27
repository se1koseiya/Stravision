"use client"

import dynamic from "next/dynamic"

// 新版模型商店页面：直接复用 unified-explore 中使用的 ModelStoreContent 组件
// 与技能/插件商店保持完全一致的 UI 风格（标题/插图/主标签/子标签/搜索/卡片网格/详情弹窗）
const ModelStoreContent = dynamic(
  () => import("@/components/model-store/model-store-content").then(m => ({ default: m.ModelStoreContent })),
  { ssr: false }
)

export default function ModelStorePage() {
  return <ModelStoreContent />
}
