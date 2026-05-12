'use client'

import { useEffect, useState } from 'react'
import styles from './Timer.module.css'

interface TimerProps {
  startTime: Date
  staleThresholdSeconds?: number
  onStaleChange?: (isStale: boolean) => void
}

export function Timer({
  startTime,
  staleThresholdSeconds = 300,
  onStaleChange,
}: TimerProps) {
  const [seconds, setSeconds] = useState(() => {
    return Math.floor((Date.now() - startTime.getTime()) / 1000)
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const newSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setSeconds(newSeconds)

      const isStale = newSeconds >= staleThresholdSeconds
      onStaleChange?.(isStale)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, staleThresholdSeconds, onStaleChange])

  const minutes = Math.floor(seconds / 60)
  const displayText = `${minutes} min`

  const getColorClass = () => {
    if (seconds >= staleThresholdSeconds) {
      return styles.critical
    }
    if (seconds >= staleThresholdSeconds * 0.6) {
      return styles.warning
    }
    return styles.normal
  }

  return (
    <span className={`${styles.timer} ${getColorClass()}`}>
      ⏱️ {displayText}
    </span>
  )
}