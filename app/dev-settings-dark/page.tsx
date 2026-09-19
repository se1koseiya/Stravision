"use client"

/**
 * 临时验收路由（dev only）：设置弹窗深色模式适配验收
 * - 直接挂载 AISettingsDialog，绕过登录（headless 停在登录页的问题）
 * - 按钮切换 next-themes 主题，验证弹窗跟随全局主题
 * 用完可整目录删除（app/dev-* 不会被生产构建引用）
 */

import { useState } from "react"
import { useTheme } from "next-themes"
import { ConfigProvider, App as AntApp, Button, Space, Tag } from "antd"
import { AISettingsDialog } from "@/components/ai-settings-dialog"

export default function DevSettingsDarkPage() {
  const [open, setOpen] = useState(true)
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <ConfigProvider>
      <AntApp>
        <div
          style={{
            minHeight: "100vh",
            padding: 40,
            background: isDark ? "#09090b" : "#f4f4f5",
            color: isDark ? "#e4e4e7" : "#18181b",
            transition: "background .3s ease",
          }}
        >
          <Space direction="vertical" size={16}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>设置弹窗深色适配验收</h1>
            <Space>
              <Button type="primary" onClick={() => setOpen(true)}>打开设置弹窗</Button>
              <Button onClick={() => setTheme(isDark ? "light" : "dark")}>
                切换到{isDark ? "浅色" : "深色"}模式
              </Button>
              <Tag color={isDark ? "purple" : "blue"}>当前: {resolvedTheme ?? "(system/未挂载)"}</Tag>
            </Space>
            <p style={{ fontSize: 13, opacity: 0.65 }}>
              验收点：① 弹窗容器/左栏/白卡片/文字随主题切换 ② antd 控件（下拉/输入/开关）为对应算法 ③ 圆角无白边外漏
            </p>
          </Space>
          <AISettingsDialog open={open} onOpenChange={setOpen} />
        </div>
      </AntApp>
    </ConfigProvider>
  )
}
