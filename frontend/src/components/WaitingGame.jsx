import React, { useState, useEffect, useRef, useCallback } from 'react'

const GRID_W = 20
const GRID_H = 14
const CELL = 28
const TICK = 130

const DIR = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] }

function randomFood(snake) {
  let pos
  do {
    pos = [Math.floor(Math.random()*GRID_W), Math.floor(Math.random()*GRID_H)]
  } while (snake.some(s => s[0]===pos[0] && s[1]===pos[1]))
  return pos
}

export default function WaitingGame({ agentName }) {
  const [snake, setSnake]     = useState([[10,7],[9,7],[8,7]])
  const [dir, setDir]         = useState(DIR.RIGHT)
  const [food, setFood]       = useState([15,7])
  const [score, setScore]     = useState(0)
  const [dead, setDead]       = useState(false)
  const [started, setStarted] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const nextDir = useRef(DIR.RIGHT)
  const gameRef = useRef(null)

  const reset = useCallback(() => {
    const s = [[10,7],[9,7],[8,7]]
    setSnake(s)
    setDir(DIR.RIGHT)
    nextDir.current = DIR.RIGHT
    setFood(randomFood(s))
    setScore(0)
    setDead(false)
    setStarted(true)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (!started || dead) return
      const map = {
        ArrowUp:    DIR.UP,    w: DIR.UP,
        ArrowDown:  DIR.DOWN,  s: DIR.DOWN,
        ArrowLeft:  DIR.LEFT,  a: DIR.LEFT,
        ArrowRight: DIR.RIGHT, d: DIR.RIGHT,
      }
      const next = map[e.key]
      if (!next) return
      e.preventDefault()
      // Prevent reversing
      const cur = nextDir.current
      if (next[0] === -cur[0] && next[1] === -cur[1]) return
      nextDir.current = next
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, dead])

  useEffect(() => {
    if (!started || dead) return
    const id = setInterval(() => {
      setSnake(prev => {
        const d = nextDir.current
        setDir(d)
        const head = [prev[0][0]+d[0], prev[0][1]+d[1]]
        // Wall collision
        if (head[0]<0||head[0]>=GRID_W||head[1]<0||head[1]>=GRID_H) {
          setDead(true)
          setHighScore(h => Math.max(h, score))
          return prev
        }
        // Self collision
        if (prev.some(s=>s[0]===head[0]&&s[1]===head[1])) {
          setDead(true)
          setHighScore(h => Math.max(h, score))
          return prev
        }
        const ate = head[0]===food[0] && head[1]===food[1]
        const next = [head, ...prev]
        if (!ate) next.pop()
        else {
          setScore(sc => sc+10)
          setFood(randomFood(next))
        }
        return next
      })
    }, TICK)
    return () => clearInterval(id)
  }, [started, dead, food, score])

  // Mobile controls
  const move = (d) => {
    if (!started || dead) return
    const cur = nextDir.current
    if (d[0]===-cur[0] && d[1]===-cur[1]) return
    nextDir.current = d
  }

  const W = GRID_W * CELL
  const H = GRID_H * CELL

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-lg">
        <div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest">While you wait</p>
          <p className="font-mono text-gold text-xs mt-0.5 truncate max-w-[220px]">
            Agent running: <span className="text-bright">{agentName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-muted uppercase tracking-widest">Score</p>
          <p className="font-display text-2xl text-gold tracking-wider">{score}</p>
          {highScore > 0 && <p className="font-mono text-xs text-muted">Best: {highScore}</p>}
        </div>
      </div>

      {/* Game canvas */}
      <div
        ref={gameRef}
        className="relative border border-border bg-void overflow-hidden"
        style={{ width: W, height: H, maxWidth: '100%' }}
        tabIndex={0}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 opacity-10" width={W} height={H}>
          {Array.from({length: GRID_W+1}).map((_,i) => (
            <line key={`v${i}`} x1={i*CELL} y1={0} x2={i*CELL} y2={H} stroke="#2C2C3A" strokeWidth="1"/>
          ))}
          {Array.from({length: GRID_H+1}).map((_,i) => (
            <line key={`h${i}`} x1={0} y1={i*CELL} x2={W} y2={i*CELL} stroke="#2C2C3A" strokeWidth="1"/>
          ))}
        </svg>

        {/* Snake */}
        {snake.map((s, i) => (
          <div
            key={i}
            className="absolute transition-all duration-75"
            style={{
              left: s[0]*CELL+2,
              top:  s[1]*CELL+2,
              width: CELL-4,
              height: CELL-4,
              background: i===0
                ? '#C9A84C'
                : `rgba(201,168,76,${Math.max(0.15, 1-(i*0.06))})`,
              borderRadius: i===0 ? '3px' : '2px',
            }}
          >
            {i===0 && (
              <div className="w-full h-full flex items-center justify-center text-void text-xs font-bold">
                ▶
              </div>
            )}
          </div>
        ))}

        {/* Food */}
        <div
          className="absolute flex items-center justify-center animate-pulse"
          style={{ left: food[0]*CELL+2, top: food[1]*CELL+2, width: CELL-4, height: CELL-4 }}
        >
          <div className="w-3 h-3 bg-teal rounded-full shadow-lg" style={{boxShadow:'0 0 8px #2DD4BF'}} />
        </div>

        {/* Overlay — start / dead */}
        {(!started || dead) && (
          <div className="absolute inset-0 bg-void/85 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
            {dead && (
              <>
                <p className="font-display text-4xl text-rose tracking-widest">DEAD</p>
                <p className="font-mono text-soft text-xs">Score: {score}</p>
              </>
            )}
            {!started && !dead && (
              <p className="font-display text-3xl text-gold tracking-widest">SNAKE</p>
            )}
            <button
              onClick={reset}
              className="px-6 py-2 border border-gold text-gold font-mono text-xs tracking-widest uppercase hover:bg-gold hover:text-void transition-all mt-2"
            >
              {dead ? 'Retry' : 'Play'}
            </button>
            <p className="font-mono text-muted text-xs">WASD or Arrow keys</p>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="grid grid-cols-3 gap-1 w-28">
        <div />
        <button onClick={() => move(DIR.UP)}    className="p-2 border border-border text-muted hover:border-gold hover:text-gold font-mono text-xs transition-all text-center">▲</button>
        <div />
        <button onClick={() => move(DIR.LEFT)}  className="p-2 border border-border text-muted hover:border-gold hover:text-gold font-mono text-xs transition-all text-center">◀</button>
        <button onClick={() => move(DIR.DOWN)}  className="p-2 border border-border text-muted hover:border-gold hover:text-gold font-mono text-xs transition-all text-center">▼</button>
        <button onClick={() => move(DIR.RIGHT)} className="p-2 border border-border text-muted hover:border-gold hover:text-gold font-mono text-xs transition-all text-center">▶</button>
      </div>

      <p className="font-mono text-muted text-xs">Report generating in background — keep playing!</p>
    </div>
  )
}
