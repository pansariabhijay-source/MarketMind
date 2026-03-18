import React, { useEffect, useRef } from 'react'

export default function AnimatedBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let W, H

    const particles = []
    const PARTICLE_COUNT = 50

    function resize() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    function spawnParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.25 + 0.05,
        color: Math.random() > 0.6 ? '#E8B86D' : '#4ECDC4',
      }
    }

    resize()
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle())

    const lines = Array.from({length: 6}, (_, i) => ({
      y: (H / 6) * i + H/12,
      offset: Math.random() * Math.PI * 2,
      speed: 0.0015 + Math.random() * 0.0015,
      amp: 15 + Math.random() * 25,
      color: i % 4 === 0 ? '#E8B86D' : '#272B3A',
      alpha: i % 4 === 0 ? 0.10 : 0.06,
    }))

    let t = 0

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Background — deep navy, not pure black
      const grad = ctx.createRadialGradient(W*0.35, H*0.35, 0, W*0.35, H*0.35, W*0.8)
      grad.addColorStop(0, '#161924')
      grad.addColorStop(1, '#0F1117')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Subtle top glow
      const topGlow = ctx.createRadialGradient(W*0.5, 0, 0, W*0.5, 0, H*0.5)
      topGlow.addColorStop(0, '#E8B86D08')
      topGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = topGlow
      ctx.fillRect(0, 0, W, H)

      // Flowing lines
      lines.forEach(line => {
        ctx.beginPath()
        ctx.strokeStyle = line.color
        ctx.globalAlpha = line.alpha
        ctx.lineWidth = 0.8
        for (let x = 0; x <= W; x += 4) {
          const y = line.y + Math.sin(x * 0.006 + t * line.speed * 100 + line.offset) * line.amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      })

      // Particles
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      })

      ctx.globalAlpha = 1
      t += 0.008
      raf = requestAnimationFrame(draw)
    }

    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.9 }}
    />
  )
}
