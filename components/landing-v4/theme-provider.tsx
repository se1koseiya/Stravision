"use client";

import { useEffect, useState } from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import { useTheme } from "next-themes";
import { landingTheme } from "@/components/landing-v3/theme";

/**
 * 落地页 / 更新日志页的 antd 主题适配：
 * 跟随 next-themes 的 resolvedTheme，暗色时切 darkAlgorithm，
 * 让内嵌的真实产品组件（对话窗 / 监控卡 / 记忆条等）跟着一起变暗。
 */
export function LandingThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <ConfigProvider
      theme={dark ? { ...landingTheme, algorithm: antdTheme.darkAlgorithm } : landingTheme}
    >
      {children}
    </ConfigProvider>
  );
}
