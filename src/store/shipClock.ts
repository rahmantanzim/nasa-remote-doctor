// Ship clock: starts at the mission's ship time when the app opens, then
// moves forward in real time. Minutes since ship midnight (wraps at 24:00).

import { useEffect, useState } from 'react'
import { MINUTES_PER_DAY, parseShipTime } from '../engine/earthLink'

/** Real-time moment the app opened; the ship clock counts from here. */
const OPENED_AT_MS = Date.now()

/** Ship time now, minutes since ship midnight. */
export function shipMinutesNow(startHHMM: string, nowMs: number = Date.now()): number {
  const elapsedMinutes = (nowMs - OPENED_AT_MS) / 60_000
  return (parseShipTime(startHHMM) + elapsedMinutes) % MINUTES_PER_DAY
}

/** Re-render every second with the current ship time. */
export function useShipMinutes(startHHMM: string): number {
  const [minutes, setMinutes] = useState(() => shipMinutesNow(startHHMM))
  useEffect(() => {
    const id = setInterval(() => setMinutes(shipMinutesNow(startHHMM)), 1000)
    return () => clearInterval(id)
  }, [startHHMM])
  return minutes
}
