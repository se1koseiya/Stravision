"use client"

import { useEffect } from "react"

export function CopyrightProtection() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    // 1. 禁用右键
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    // 2. 禁用主要开发者工具快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault()
        return
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) {
        e.preventDefault()
        return
      }
      // Ctrl+U (查看源码)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault()
        return
      }
    }

    // 3. 反调试探测 (Debugger 陷阱)
    const detectDevTools = () => {
      const start = Date.now()
      debugger // 如果 F12 开启，会在这里停顿
      const end = Date.now()
      if (end - start > 100) {
        // 说明被拦截了，检测到调试
        console.clear()
        console.log("%c⚠️ 系统保护", "color: red; font-size: 20px; font-weight: bold;");
        console.log("检测到调试行为，保护模式已开启。");
      }
    }

    // 4. 控制台清理
    const clearConsole = setInterval(() => {
      console.clear()
      console.log("%c© STRAVISION - 版权所有", "color: #10b981; font-size: 16px; font-weight: bold;");
      console.log("AI 驱动的物联网农业平台。本系统受核心加密保护，请尊重知识产权。");
    }, 5000)

    window.addEventListener("contextmenu", handleContextMenu)
    window.addEventListener("keydown", handleKeyDown)
    
    // 定期执行调试探测
    const debugTimer = setInterval(detectDevTools, 2000)

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu)
      window.removeEventListener("keydown", handleKeyDown)
      clearInterval(clearConsole)
      clearInterval(debugTimer)
    }
  }, [])

  return null
}
