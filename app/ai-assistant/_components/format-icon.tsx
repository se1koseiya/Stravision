/**
 * 格式 → 图标（唯一源）
 *
 * 🚨 三处共用这一张映射表，同一份 .docx 必须长得一样：
 *   · 消息里的文档卡（document-card.tsx）
 *   · sender 的待发送附件条（chat-sender-input.tsx）
 *   · 预览抽屉的头部（document-preview.tsx）
 *
 * 没有专门图标的一律回退文本图标，绝不按格式乱配图形。
 */

import {
  IconFilePdf,
  IconFilePpt,
  IconFileText,
  IconFileWord,
  IconFileAddition,
} from "@/components/icon"

export function formatIcon(format: string) {
  switch ((format || "").toLowerCase()) {
    case "pdf":
      return IconFilePdf
    case "docx":
      return IconFileWord
    case "pptx":
      return IconFilePpt
    case "xlsx":
    case "csv":
      return IconFileAddition
    default:
      return IconFileText
  }
}
