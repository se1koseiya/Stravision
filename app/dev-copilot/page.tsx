"use client"

/**
 * Copilot 侧栏视觉验收探针（临时路由，验收完删）
 * 直接挂载 CopilotSidebar，受控展开，支持亮暗切换。
 */

import { useState } from "react"
import { ConfigProvider } from "antd"
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar"

const BERRY_PRIMARY = "#0a84ff"

export default function DevCopilotPage() {
  const [open, setOpen] = useState(true)
  const [dark, setDark] = useState(false)

  return (
    <ConfigProvider
      /* 模拟 dashboard 等业务页主题（borderRadius 22），验证侧栏 Sender 不再继承巨圆角 */
      theme={{ token: { borderRadius: 22, colorPrimary: BERRY_PRIMARY } }}
    >
    <div
      data-probe="copilot"
      style={{
        position: "fixed",
        inset: 0,
        background: dark ? "#09090b" : "#f7f8fa",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        data-probe="controls"
        style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8, zIndex: 300 }}
      >
        <button
          id="probe-toggle-open"
          onClick={() => setOpen(v => !v)}
          style={btnStyle(dark)}
        >
          {open ? "收起侧栏" : "展开侧栏"}
        </button>
        <button id="probe-toggle-dark" onClick={() => setDark(v => !v)} style={btnStyle(dark)}>
          切换 {dark ? "亮色" : "暗色"}
        </button>
      </div>

      {/* 版式参考卡：与 ai-assistant 主内容白卡同规格 */}
      <div
        data-probe="ref-card"
        style={{
          position: "absolute",
          top: 72,
          left: 16,
          width: 400,
          background: dark ? "#18181b" : "#fff",
          border: `1px solid ${dark ? "#3f3f46" : "#e8e8ea"}`,
          borderRadius: 10,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          padding: 16,
          color: dark ? "#f4f4f5" : "#18181b",
          fontSize: 12.5,
          lineHeight: 1.8,
        }}
      >
        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>
          参考卡（ai-assistant 主内容白卡规格）
        </div>
        圆角 10 ｜ 描边 #e8e8ea / #3f3f46 ｜ 阴影 0 1px 2px
        <br />
        右侧 Copilot 侧栏应为同一套规格
        <br />
        空态显示「实时监控」专属欢迎词 + 3 条推荐问题
      </div>

      <CopilotSidebar
        pageKey="monitor"
        dark={dark}
        open={open}
        onOpenChange={setOpen}
        deviceData={{ temperature: 24.3, humidity: 61.5, relay2: 1 }}
        context={() =>
          [
            "页面：实时监控（/monitor）",
            "当前温度：24.3℃",
            "当前湿度：61.5%",
            "已开启设备：继电器2",
          ].join("\n")
        }
      />
    </div>
    </ConfigProvider>
  )
}

function btnStyle(dark: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #e8e8ea",
    background: dark ? "#27272a" : "#fff",
    color: dark ? "#f4f4f5" : "#18181b",
    cursor: "pointer",
    fontSize: 13,
  }
}
