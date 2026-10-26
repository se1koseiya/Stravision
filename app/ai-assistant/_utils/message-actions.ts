"use client"

// html-to-image 和 jspdf 仅在下载 PDF 时使用，延迟加载
import { toast } from "@/lib/ui/feedback"
import type { AISettings, Message } from "@/app/ai-assistant/types"

/**
 * Read files from input element, convert to data URLs, add to attachments.
 * Returns the new attachments array and count.
 */
export function processFiles(
  files: File[],
  setAttachments: React.Dispatch<React.SetStateAction<string[]>>,
  showNotice: (title: string, message: string, type: string) => void
) {
  if (files.length === 0) return
  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : ""
      if (url) setAttachments((prev) => [...prev, url])
    }
    reader.readAsDataURL(file)
  })
  showNotice("附件已添加", `共 ${files.length} 个`, "success")
}

/**
 * Handle file select from input.
 */
export function createSelectFilesHandler(
  setAttachments: React.Dispatch<React.SetStateAction<string[]>>,
  showNotice: (title: string, message: string, type: string) => void
): React.ChangeEventHandler<HTMLInputElement> {
  return (e) => {
    const files = Array.from(e.currentTarget.files || [])
    processFiles(files, setAttachments, showNotice)
    e.currentTarget.value = ""
  }
}

/**
 * Handle clipboard paste of files into textarea.
 */
export function createPasteHandler(
  setAttachments: React.Dispatch<React.SetStateAction<string[]>>,
  showNotice: (title: string, message: string, type: string) => void
) {
  return (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      processFiles(files, setAttachments, showNotice)
    }
  }
}

/**
 * Download a message as PDF.
 */
export async function handleDownloadPDF(
  messageIndex: number,
  showNotice: (title: string, message: string, type: string) => void
) {
  const element = document.getElementById(`message-content-${messageIndex}`)
  if (!element) return

  showNotice("正在生成 PDF...", "请稍候，这可能需要几秒钟", "loading")

  try {
    const htmlToImage = await import("html-to-image")
    const { default: jsPDF } = await import("jspdf")

    const dataUrl = await htmlToImage.toPng(element, {
      backgroundColor: "#ffffff",
      style: { color: "#000000" },
    })
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const img = new window.Image()
    img.src = dataUrl
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
    })
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (img.height * imgWidth) / img.width
    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save(`MeiXiaozhi-Report-${new Date().toISOString().slice(0, 10)}.pdf`)
    showNotice("PDF 生成成功", "文件已开始下载", "success")
  } catch {
    showNotice("PDF 生成失败", "请重试或检查内容是否包含复杂元素", "error")
  }
}

/**
 * Save AI settings to state + localStorage.
 */
export function handleSettingsSave(
  settings: AISettings,
  setAiSettings: (s: AISettings) => void,
  setSelectedModel: (m: string) => void
) {
  setAiSettings(settings)
  localStorage.setItem("ai-settings", JSON.stringify(settings))
  setSelectedModel(settings.model)
}

/**
 * Copy message text to clipboard.
 */
export function copyMessageText(msg: Message) {
  const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
  navigator.clipboard.writeText(text)
  toast.success("已复制到剪贴板")
}
