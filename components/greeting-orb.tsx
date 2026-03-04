"use client"

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { RealtimeVoiceOrb } from '@/components/realtime-voice-orb'
import { AnimatePresence, motion } from 'framer-motion'

interface GreetingOrbProps {
  username?: string
  enabled?: boolean
}

export function GreetingOrb({ username, enabled = true }: GreetingOrbProps) {
  const [shouldGreet, setShouldGreet] = useState(false)
  const [greetingText, setGreetingText] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  
  // Check if we need to greet
  useEffect(() => {
    if (!enabled || !username) return

    const checkAndGreet = () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const storageKey = `last_greeting_qwen_${username}`
        const lastGreetDate = localStorage.getItem(storageKey)

        if (lastGreetDate !== today) {
          // Determine greeting based on time of day
          const hour = new Date().getHours()
          let timeGreeting = ''
          if (hour < 6) timeGreeting = '夜深了'
          else if (hour < 9) timeGreeting = '早上好'
          else if (hour < 12) timeGreeting = '上午好'
          else if (hour < 14) timeGreeting = '中午好'
          else if (hour < 18) timeGreeting = '下午好'
          else timeGreeting = '晚上好'

          const text = `${timeGreeting}，${username}。我是您的智能管家莓小智，很高兴见到您。`
          setGreetingText(text)
          setShouldGreet(true)
          setIsVisible(true)

          // Mark as greeted immediately
          localStorage.setItem(storageKey, today)
        }
      } catch (e) {
        console.error("Failed to check greeting:", e)
      }
    }

    // Delay slightly to let page load
    const timer = setTimeout(checkAndGreet, 1000)
    return () => clearTimeout(timer)
  }, [username, enabled])

  // Hide orb after greeting completes (approximate duration)
  useEffect(() => {
    if (shouldGreet) {
      // Allow enough time for connection + speaking
      // This is a bit of a heuristic since we don't know exactly when speech ends
      // But RealtimeVoiceOrb handles the actual speaking
      const timer = setTimeout(() => {
        setIsVisible(false)
        setShouldGreet(false)
      }, 15000) // 15 seconds should be enough for connection + greeting
      
      return () => clearTimeout(timer)
    }
  }, [shouldGreet])

  if (!shouldGreet && !isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-[100] flex flex-col items-center gap-3 pointer-events-none"
        >
          <div className="bg-black/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10 shadow-lg mb-2">
            正在为您播报每日问候...
          </div>
          
          <div className="pointer-events-auto">
            <RealtimeVoiceOrb 
              size={64}
              autoConnect={true}
              instructions={`请用温暖、亲切的语气说："${greetingText}"。说完这句话后请保持安静，不要再多说话。`}
              voice="Cherry" // 使用亲切的 Cherry 音色
              onStatusChange={(status) => {
                console.log("Greeting status:", status)
              }}
              onError={(err) => {
                console.error("Greeting error:", err)
                setIsVisible(false)
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
