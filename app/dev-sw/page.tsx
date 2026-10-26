"use client"
import { IconCompass, IconFileText, IconDown } from "@/components/icon"
export default function DevSwPage() {
  return (
    <div className="ai-assistant-page" style={{ minHeight: "100vh", background: "#fff", padding: 20 }}>
      <style>{`
        .ai-assistant-page svg { stroke-width: 1.9; }
        .ai-assistant-page svg[width="13"],
        .ai-assistant-page svg[width="14"] { stroke-width: 1.75; }
        .ai-assistant-page svg[width="12"] { stroke-width: 2; }
      `}</style>
      <IconCompass size={16} strokeWidth={2} />
      <IconFileText size={14} strokeWidth={2} />
      <IconDown size={12} strokeWidth={2} />
    </div>
  )
}
