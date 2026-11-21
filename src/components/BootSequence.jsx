import { useEffect, useState } from 'react'

// Hacker-terminal boot lines, typed out one character at a time.
const LINES = [
  '> INITIALIZING SUBNETMASTER CORE...',
  '> CONNECTING TO SECURE NETWORK...',
  '> ACCESS GRANTED.',
]

/**
 * Cinematic terminal boot sequence. Types each line character-by-character
 * with a blinking cursor. Purely presentational — the parent controls how
 * long the screen stays via its own timer and AnimatePresence.
 */
export default function BootSequence() {
  const [lineIndex, setLineIndex] = useState(0)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let cancelled = false
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    async function run() {
      for (let li = 0; li < LINES.length; li++) {
        if (cancelled) return
        setLineIndex(li)
        setTyped('')
        const line = LINES[li]
        for (let i = 1; i <= line.length; i++) {
          if (cancelled) return
          setTyped(line.slice(0, i))
          await sleep(28)
        }
        await sleep(200)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="w-full max-w-sm font-mono text-sm leading-relaxed text-emerald-400 sm:text-base">
      {LINES.map((line, i) => {
        if (i < lineIndex) {
          return (
            <div key={i} className="whitespace-nowrap">
              {line}
            </div>
          )
        }
        if (i === lineIndex) {
          return (
            <div key={i} className="flex whitespace-nowrap">
              <span>{typed}</span>
              <span className="ml-1 inline-block h-[1.1em] w-[8px] translate-y-[1px] animate-pulse bg-emerald-400" />
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
