"use client"

import { Section, H2, Caption } from "./ui-primitives"
import { motion, useSpring, useMotionValue, animate, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"

const ParticleNetwork = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Config
    const particleCount = 100
    const connectionDistance = 150
    const particles: { x: number, y: number, vx: number, vy: number, size: number, phase: number }[] = []

    // Init particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        phase: Math.random() * Math.PI * 2
      })
    }

    let mouseX = -1000
    let mouseY = -1000
    
    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Animation Loop
    let animationFrameId: number
    let time = 0

    const animate = () => {
      time += 0.01
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and Draw Particles
      particles.forEach((p, i) => {
        // Move
        p.x += p.vx
        p.y += p.vy

        // Bounce edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // Mouse interaction
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 200) {
           const forceDirectionX = dx / distance
           const forceDirectionY = dy / distance
           const force = (200 - distance) / 200
           // Gentle push away
           const directionX = forceDirectionX * force * 1
           const directionY = forceDirectionY * force * 1
           p.x -= directionX
           p.y -= directionY
        }

        // Draw Particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        // Pulse effect
        const alpha = 0.3 + Math.sin(time + p.phase) * 0.2
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      })

      // Draw Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx*dx + dy*dy)

          if (distance < connectionDistance) {
            ctx.beginPath()
            // Emerald Green fade: 16, 185, 129
            // Use lighter green/cyan for more "tech" feel: 52, 211, 153 (emerald-400)
            const alpha = (1 - distance / connectionDistance) * 0.5
            ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})` 
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

export function Topology() {
  const [connections, setConnections] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  
  const nodes = [
    { id: "sensor", label: "传感器", x: 20, y: 50, icon: "Sensor" },
    { id: "gateway", label: "边缘网关", x: 50, y: 50, icon: "Gateway" },
    { id: "cloud", label: "云端大脑", x: 80, y: 50, icon: "Cloud" }
  ]

  // Check connection status
  const isLinked1 = connections.has("sensor-gateway")
  const isLinked2 = connections.has("gateway-cloud")
  const isFullSystem = isLinked1 && isLinked2

  // Interactive Line Component
  const ConnectionLine = ({ start, end, id }: { start: any, end: any, id: string }) => {
    const isConnected = connections.has(id)
    const [isHovering, setIsHovering] = useState(false)
    
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {/* Base Line - Ultra thin */}
        <line 
          x1={`${start.x}%`} y1={`${start.y}%`} 
          x2={`${end.x}%`} y2={`${end.y}%`} 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="1" 
        />
        
        {/* Active Line - Laser Beam */}
        <motion.line 
          x1={`${start.x}%`} y1={`${start.y}%`} 
          x2={`${end.x}%`} y2={`${end.y}%`} 
          stroke="url(#gradient-line)"
          strokeWidth={isConnected ? 1 : 0}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isConnected ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
        />
        
        <defs>
          <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="#fff" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Data Packet Flow - Tiny Photon */}
        {isConnected && (
          <motion.circle 
            r="1.5" fill="#fff"
            filter="url(#glow)"
            animate={{ 
              cx: [`${start.x}%`, `${end.x}%`],
              cy: [`${start.y}%`, `${end.y}%`],
              opacity: [0, 1, 1, 0]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
        
        {/* Interaction Trigger Zone (Invisible) */}
        {!isConnected && (
          <line 
            x1={`${start.x}%`} y1={`${start.y}%`} 
            x2={`${end.x}%`} y2={`${end.y}%`} 
            stroke="transparent" 
            strokeWidth="30"
            className="pointer-events-auto cursor-pointer"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => setConnections(prev => new Set(prev).add(id))}
          />
        )}
        
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
    )
  }

  return (
    <Section>
      {/* Background Mesh - Internet of Everything */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatePresence>
          {isFullSystem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="w-full h-full"
            >
              <ParticleNetwork />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="z-20">
        <H2>这不是一块屏幕。</H2>
        <H2 className="text-emerald-500">是一个正在运行的系统。</H2>
        <Caption>点击节点间隙，建立连接。</Caption>
      </div>

      <div className="relative h-64 w-full z-20 select-none" ref={containerRef}>
        {/* Instructions - Minimal */}
        {!isFullSystem && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-white/20 uppercase">
            Connect The Dots
          </div>
        )}

        {/* Lines */}
        <ConnectionLine start={nodes[0]} end={nodes[1]} id="sensor-gateway" />
        <ConnectionLine start={nodes[1]} end={nodes[2]} id="gateway-cloud" />

        {/* Nodes - Minimal Dots */}
        {nodes.map((node, i) => {
          const isActive = (i === 0) || (i === 1 && isLinked1) || (i === 2 && isLinked2)
          
          return (
            <div 
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <motion.div 
                className={`relative flex items-center justify-center transition-all duration-500 ${
                  isActive ? "w-4 h-4" : "w-2 h-2"
                }`}
              >
                {/* Core Dot */}
                <div className={`w-full h-full rounded-full transition-colors duration-500 ${
                  isActive ? "bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]" : "bg-white/20"
                }`} />
                
                {/* Ripple Effect (Active) */}
                {isActive && (
                  <motion.div 
                    className="absolute inset-0 rounded-full border border-white/30"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>
              
              <span className={`text-[10px] tracking-widest font-jinbuti transition-colors duration-500 ${
                isActive ? "text-white opacity-100" : "text-white/20 opacity-50"
              }`}>
                {node.label}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
