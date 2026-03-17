"use client"

import { useEffect, useRef } from "react"

export function RainEffect() {
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

    // Raindrop Class
    class Drop {
      x: number
      y: number
      z: number // depth 0-1
      length: number
      speed: number
      
      constructor() {
        this.x = Math.random() * w
        this.y = Math.random() * h - h // Start above
        this.z = Math.random() * 0.5 + 0.5 // 0.5 - 1.0
        this.length = Math.random() * 20 + 10
        this.speed = (Math.random() * 10 + 15) * this.z
      }

      update() {
        this.y += this.speed
        if (this.y > h) {
          this.y = -this.length
          this.x = Math.random() * w
          this.z = Math.random() * 0.5 + 0.5
          this.speed = (Math.random() * 10 + 15) * this.z
          // Chance to create splash could be handled here
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x, this.y + this.length)
        // Lighter, bluer, techy rain
        // Opacity depends on depth (z)
        ctx.strokeStyle = `rgba(186, 230, 253, ${this.z * 0.3})` // sky-200
        ctx.lineWidth = this.z * 1.5
        ctx.stroke()
      }
    }

    // Splash Class
    class Splash {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      
      constructor(x: number) {
        this.x = x
        this.y = h
        this.vx = (Math.random() - 0.5) * 4
        this.vy = -(Math.random() * 3 + 2)
        this.life = 1.0
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        this.vy += 0.2 // gravity
        this.life -= 0.05
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, 1, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(186, 230, 253, ${this.life * 0.5})`
        ctx.fill()
      }
    }

    const drops: Drop[] = []
    const splashes: Splash[] = []
    const dropCount = 150 // Dense rain

    for (let i = 0; i < dropCount; i++) {
      drops.push(new Drop())
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      
      // Update Drops
      drops.forEach(drop => {
        drop.update()
        drop.draw()
        
        // Randomly create splash when hitting bottom
        if (drop.y > h - drop.speed && Math.random() > 0.9) {
          splashes.push(new Splash(drop.x))
        }
      })

      // Update Splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        splashes[i].update()
        splashes[i].draw()
        if (splashes[i].life <= 0) {
          splashes.splice(i, 1)
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}
