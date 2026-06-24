"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

export function MessageNotificationListener() {
  const lastCheckedRef = useRef(Date.now())
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/login' || pathname === '/register') return

    // Request permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    const checkMessages = async () => {
      try {
        const res = await fetch(`/api/messages/check?since=${lastCheckedRef.current}`)
        if (res.status === 401) return
        if (res.ok) {
          const data = await res.json()
          if (data.messages && data.messages.length > 0) {
            // Found new messages
            data.messages.forEach((msg: any) => {
              const title = msg.group_name 
                ? `${msg.sender_name} (在 ${msg.group_name})`
                : msg.sender_name
              
              const body = msg.type === 'image' ? '[图片]' : 
                           msg.type === 'file' ? '[文件]' : 
                           msg.content

              // Browser Notification Logic
              // Trigger if document is hidden OR user is not on chat page
              if (Notification.permission === "granted" && (document.hidden || pathname !== '/chat')) {
                new Notification(title, {
                  body: body,
                  icon: msg.sender_avatar || "/logo.png",
                  tag: `msg-${msg.id}`, // Deduplicate notifications
                  silent: false
                })
              }
              
              // Toast Logic
              // Show toast if user is NOT on chat page
              if (pathname !== '/chat') {
                toast(title, {
                  description: body,
                  action: {
                    label: "查看",
                    onClick: () => window.location.href = "/chat"
                  }
                })
              }
            })
          }
          
          if (data.timestamp) {
            lastCheckedRef.current = data.timestamp
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

    const interval = setInterval(checkMessages, 3000) // Check every 3s
    return () => clearInterval(interval)
  }, [pathname]) // Re-create interval if pathname changes? No, interval closure captures pathname? 
  // Wait, setInterval closure captures initial pathname. 
  // I should use a ref for pathname or include pathname in dependency.
  // If I include pathname in dependency, interval resets on navigation. This is fine.

  return null
}
