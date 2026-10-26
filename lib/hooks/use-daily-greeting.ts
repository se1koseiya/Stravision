import { useEffect, useRef } from 'react'
import { useSpeechSynthesis } from '@/lib/hooks/use-speech-synthesis'
import { toast } from '@/lib/ui/feedback'
import React from 'react'
import { IconMagic } from "@/components/icon";

interface UseDailyGreetingOptions {
  username?: string
  enabled?: boolean
}

export function useDailyGreeting({ username, enabled = true }: UseDailyGreetingOptions = {}) {
  const { speak, isSpeaking } = useSpeechSynthesis()
  const hasGreeted = useRef(false)

  useEffect(() => {
    if (!enabled || !username) return

    const checkAndGreet = () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const storageKey = `last_greeting_${username}`
        const lastGreetDate = localStorage.getItem(storageKey)

        if (lastGreetDate !== today && !hasGreeted.current) {
          // Determine greeting based on time of day
          const hour = new Date().getHours()
          let timeGreeting = ''
          if (hour < 6) timeGreeting = '夜深了'
          else if (hour < 9) timeGreeting = '早上好'
          else if (hour < 12) timeGreeting = '上午好'
          else if (hour < 14) timeGreeting = '中午好'
          else if (hour < 18) timeGreeting = '下午好'
          else timeGreeting = '晚上好'

          const greetingText = `${timeGreeting}，${username}。我是您的智能管家莓小智，随时为您服务。`

          // Mark as greeted immediately to prevent double firing
          localStorage.setItem(storageKey, today)
          hasGreeted.current = true

          // Speak the greeting
          // Use a slight delay to ensure the page is loaded and user is ready
          setTimeout(() => {
            speak(greetingText)
            
            // Show a toast as well
            toast(greetingText, {
              icon: React.createElement(IconMagic, { className: "w-4 h-4 text-emerald-500" }),
              duration: 4000,
            })
          }, 1500)
        }
      } catch (e) {
        console.error("Failed to execute daily greeting:", e)
      }
    }

    // Check immediately on mount
    checkAndGreet()

  }, [username, enabled, speak])

  return { isSpeaking }
}
