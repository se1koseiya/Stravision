"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * 落地页固定浅色。
 *
 * 全站主题跟随系统（layout.tsx: attribute="class" defaultTheme="system"），
 * 系统为深色时 <html> 会挂上 .dark；而 globals.css 的 dark 变体是
 * `&:is(.dark *)`，任何内层容器都挡不住它 ——
 * 落地页本身是浅色设计，内嵌的真实产品组件（对话窗 / 监控卡 / 策略卡 /
 * 图表渲染器）却在 .dark 下渲染成暗色块，白底上直接打架。
 *
 * 所以进入落地页时把主题强制切到 light，离开时还原用户原本的选择。
 */
export function ForceLightTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = window.localStorage.getItem("theme");
    setTheme("light");
    return () => {
      setTheme(prev ?? "system");
    };
  }, [setTheme]);

  return null;
}
