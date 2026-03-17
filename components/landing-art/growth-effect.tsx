"use client"

import { useEffect, useRef } from "react"

export function GrowthEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let w = 0
    let h = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        w = parent.clientWidth
        h = parent.clientHeight
        canvas.width = w
        canvas.height = h
      }
    }
    window.addEventListener('resize', resize)
    resize()

    // --- Configuration ---
    const VINE_COUNT = 8
    const SEGMENT_LENGTH = 3
    const MAX_SEGMENTS = 200 // How long they grow
    const GROW_SPEED = 2 // Segments per frame (or frames per segment)

    // --- Classes ---

    class Leaf {
      x: number
      y: number
      angle: number
      size: number
      life: number // 0 to 1 growth
      side: number // 1 or -1

      constructor(x: number, y: number, angle: number, side: number) {
        this.x = x
        this.y = y
        this.angle = angle
        this.side = side
        this.size = Math.random() * 5 + 5
        this.life = 0
      }

      grow() {
        if (this.life < 1) this.life += 0.05
      }

      draw() {
        if (!ctx) return
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.angle + (Math.PI / 4) * this.side)
        ctx.scale(this.life, this.life)
        
        ctx.beginPath()
        // Draw a simple leaf shape
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(this.size, -this.size/2, this.size * 1.5, 0)
        ctx.quadraticCurveTo(this.size, this.size/2, 0, 0)
        
        ctx.fillStyle = `rgba(52, 211, 153, ${0.8})` // emerald-400
        ctx.fill()
        ctx.restore()
      }
    }

    class Vine {
      x: number
      y: number
      angle: number // current growth angle (-PI/2 is up)
      segments: {x: number, y: number, width: number}[]
      leaves: Leaf[]
      width: number
      color: string
      speedVar: number
      frameCount: number

      constructor() {
        this.x = Math.random() * w * 0.8 + w * 0.1 // 10% - 90% width
        this.y = h
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5
        this.segments = [{x: this.x, y: this.y, width: 4}]
        this.leaves = []
        this.width = 4
        this.color = `rgba(16, 185, 129, ${Math.random() * 0.5 + 0.5})` // emerald-500
        this.speedVar = Math.random() * 0.5 + 0.5
        this.frameCount = 0
      }

      grow() {
        if (this.segments.length >= MAX_SEGMENTS) return

        this.frameCount++
        if (this.frameCount < 2 / this.speedVar) return // Control speed
        this.frameCount = 0

        // Wiggle the angle
        this.angle += (Math.random() - 0.5) * 0.2
        // Tendency to go up
        const targetAngle = -Math.PI / 2
        this.angle += (targetAngle - this.angle) * 0.05

        // Calculate new position
        const lastPos = this.segments[this.segments.length - 1]
        const newX = lastPos.x + Math.cos(this.angle) * SEGMENT_LENGTH
        const newY = lastPos.y + Math.sin(this.angle) * SEGMENT_LENGTH

        // Taper width
        const progress = this.segments.length / MAX_SEGMENTS
        const currentWidth = Math.max(0.5, this.width * (1 - progress))

        this.segments.push({x: newX, y: newY, width: currentWidth})

        // Chance to add leaf
        if (Math.random() < 0.1 && this.segments.length > 10) {
            const side = Math.random() > 0.5 ? 1 : -1
            this.leaves.push(new Leaf(newX, newY, this.angle, side))
        }
      }

      draw() {
        if (!ctx || this.segments.length < 2) return

        // Draw Vine
        ctx.beginPath()
        ctx.moveTo(this.segments[0].x, this.segments[0].y)
        for (let i = 1; i < this.segments.length; i++) {
          // Quad curve for smoothness (simplified here to line for performance/style)
          ctx.lineTo(this.segments[i].x, this.segments[i].y)
        }
        ctx.strokeStyle = this.color
        ctx.lineWidth = 2 // Average width for simplicity in stroke
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()

        // Draw Leaves
        this.leaves.forEach(leaf => {
          leaf.grow()
          leaf.draw()
        })
        
        // Draw Glowing Tip
        if (this.segments.length < MAX_SEGMENTS) {
           const tip = this.segments[this.segments.length - 1]
           ctx.beginPath()
           ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2)
           ctx.fillStyle = "#fff"
           ctx.shadowBlur = 10
           ctx.shadowColor = "#34d399"
           ctx.fill()
           ctx.shadowBlur = 0
        }
      }
    }

    const vines: Vine[] = []
    
    // Init Vines
    for(let i=0; i<VINE_COUNT; i++) {
        setTimeout(() => {
            vines.push(new Vine())
        }, i * 300) // Stagger start times
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      
      vines.forEach(vine => {
        vine.grow()
        vine.draw()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Add a subtle bottom glow overlay */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-emerald-900/40 to-transparent" />
    </div>
  )
}
