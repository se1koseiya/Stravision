"use client"

/**
 * 临时验收路由（dev only）：设置弹窗深色模式适配验收
 * - 直接挂载 AISettingsDialog，绕过登录（headless 停在登录页的问题）
 * - 按钮切换 next-themes 主题，验证弹窗跟随全局主题
 * 用完可整目录删除（app/dev-* 不会被生产构建引用）
 */

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { ConfigProvider, App as AntApp, Button, Space, Tag } from "antd"
import { AISettingsDialog, type SettingsSection } from "@/components/ai-settings-dialog"

export default function DevSettingsDarkPage() {
  const [open, setOpen] = useState(true)
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  /**
   * 支持 ?section=ai-services 直达分区（2026-10-01 新增「AI 服务」分区验收用）。
   * 🚨 必须在 useEffect 里读，不能在 useState 初始化器里读 —— 本页是 "use client"
   *    但仍会被 SSR 一次，`typeof window` 分支会让服务端/客户端渲染出不同分区，
   *    触发 hydration mismatch。
   */
  const [initialSection, setInitialSection] = useState<SettingsSection | undefined>(undefined)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("section")
    if (s) setInitialSection(s as SettingsSection)
  }, [])

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
          <Space orientation="vertical" size={16}>
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
          <AISettingsDialog open={open} onOpenChange={setOpen} initialSection={initialSection} />
        </div>
      </AntApp>
    </ConfigProvider>
  )
}
