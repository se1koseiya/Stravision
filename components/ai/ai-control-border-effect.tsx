'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AIControlBorderEffectProps {
  isActive: boolean
  duration?: number
}

export function AIControlBorderEffect({ 
  isActive, 
  duration = 3000 
}: AIControlBorderEffectProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isActive) {
      setShow(true)
    } else {
      const timer = setTimeout(() => setShow(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [isActive])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 主边框容器 - 使用 padding 创建边框效果 */}
          <div className="absolute inset-0 p-[4px]">
            {/* 渐变边框 */}
            <motion.div
              className="absolute inset-0 rounded-none"
              animate={{
                background: [
                  'linear-gradient(90deg, #ff006e 0%, #8338ec 25%, #3a86ff 50%, #06ffa5 75%, #ff006e 100%)',
                  'linear-gradient(90deg, #8338ec 0%, #3a86ff 25%, #06ffa5 50%, #ff006e 75%, #8338ec 100%)',
                  'linear-gradient(90deg, #3a86ff 0%, #06ffa5 25%, #ff006e 50%, #8338ec 75%, #3a86ff 100%)',
                  'linear-gradient(90deg, #06ffa5 0%, #ff006e 25%, #8338ec 50%, #3a86ff 75%, #06ffa5 100%)',
                  'linear-gradient(90deg, #ff006e 0%, #8338ec 25%, #3a86ff 50%, #06ffa5 75%, #ff006e 100%)',
                ],
              }}
              transition={{
                duration: duration / 1000,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                maskImage: 'linear-gradient(to right, black, black), linear-gradient(to right, black, black)',
                maskComposite: 'exclude',
                WebkitMaskImage: 'linear-gradient(to right, black, black), linear-gradient(to right, black, black)',
                WebkitMaskComposite: 'xor',
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
              }}
            >
              {/* 内部遮罩，创建边框效果 */}
              <div className="absolute inset-[4px] bg-transparent" />
            </motion.div>
            
            {/* 外发光层 - 顶部 */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[100px] pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 0, 110, 0.6), transparent)',
                filter: 'blur(40px)',
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* 外发光层 - 右侧 */}
            <motion.div
              className="absolute top-0 right-0 bottom-0 w-[100px] pointer-events-none"
              style={{
                background: 'linear-gradient(to left, rgba(131, 56, 236, 0.6), transparent)',
                filter: 'blur(40px)',
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
            
            {/* 外发光层 - 底部 */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[100px] pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(58, 134, 255, 0.6), transparent)',
                filter: 'blur(40px)',
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            
            {/* 外发光层 - 左侧 */}
            <motion.div
              className="absolute top-0 left-0 bottom-0 w-[100px] pointer-events-none"
              style={{
                background: 'linear-gradient(to right, rgba(6, 255, 165, 0.6), transparent)',
                filter: 'blur(40px)',
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5
              }}
            />
          </div>

          {/* 四个角的强化光晕 */}
          <motion.div
            className="absolute top-0 left-0 w-[250px] h-[250px]"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255, 0, 110, 0.7) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-0 right-0 w-[250px] h-[250px]"
            style={{
              background: 'radial-gradient(circle at top right, rgba(131, 56, 236, 0.7) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.6
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-[250px] h-[250px]"
            style={{
              background: 'radial-gradient(circle at bottom right, rgba(58, 134, 255, 0.7) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.2
            }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[250px] h-[250px]"
            style={{
              background: 'radial-gradient(circle at bottom left, rgba(6, 255, 165, 0.7) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
