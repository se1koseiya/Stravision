"use client"
import { useEffect } from "react"

/**
 * 遗留 Service Worker 自清理。
 *
 * 项目早期曾有 PWA SW（/sw.js），现已移除；但 SW 一旦注册就会在
 * 用户 profile 中永久驻留并劫持页面请求，而注册代码早已不运行、
 * 没有任何机会注销它。这里在每次挂载时注销全部 SW 并清空其缓存
 * （应用自身不使用 CacheStorage，清空无副作用）。
 */
export function SWRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(async (results) => {
        if (results.some(Boolean)) console.log('[sw] legacy service worker unregistered')
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys()
          await Promise.all(keys.map((k) => caches.delete(k)))
        }
      })
      .catch(() => {})
  }, [])

  return null
}
