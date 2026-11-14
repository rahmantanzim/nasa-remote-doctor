// Earth link: is the link to Earth open right now, and when is the next sync
// window? (SPEC.md F6). Pure functions of ship time — no clock inside.
//
// Times are minutes since ship midnight (0 … 1440). Windows may cross midnight.

import type { SyncWindow } from '../types'

export const MINUTES_PER_DAY = 24 * 60

const mod = (x: number, m: number) => ((x % m) + m) % m

/** "HH:MM" → minutes since midnight. Throws on bad input (config error). */
export function parseShipTime(hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) throw new Error(`Bad ship time "${hhmm}" (expected HH:MM)`)
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) throw new Error(`Bad ship time "${hhmm}"`)
  return h * 60 + m
}

/** Minutes since midnight → "HH:MM" (wraps past midnight). */
export function formatShipTime(minutes: number): string {
  const total = Math.floor(mod(minutes, MINUTES_PER_DAY))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface LinkState {
  open: boolean
  /** If open: ship time the current window closes, and minutes until then. */
  closesAt: number | null
  minutesUntilClose: number | null
  /** Start of the next window that is not the current one. */
  nextStart: number
  minutesUntilNext: number
}

/** Link state at ship time `now` (minutes since midnight). */
export function linkState(windows: SyncWindow[], now: number): LinkState {
  if (windows.length === 0) throw new Error('Mission has no sync windows')
  const t = mod(now, MINUTES_PER_DAY)
  const parsed = windows.map((w) => ({ start: parseShipTime(w.start), duration: w.durationMinutes }))

  // Open if we are inside any window (minutes since its start < its duration).
  const current = parsed.find((w) => mod(t - w.start, MINUTES_PER_DAY) < w.duration)

  // Next window: the soonest start strictly after now (a window starting
  // exactly now is the current one, so its next start is tomorrow).
  let nextStart = parsed[0].start
  let minutesUntilNext = Infinity
  for (const w of parsed) {
    const raw = mod(w.start - t, MINUTES_PER_DAY)
    const until = raw === 0 ? MINUTES_PER_DAY : raw
    if (w === current && until < MINUTES_PER_DAY) continue
    if (until < minutesUntilNext) {
      minutesUntilNext = until
      nextStart = w.start
    }
  }

  if (!current) return { open: false, closesAt: null, minutesUntilClose: null, nextStart, minutesUntilNext }
  const minutesUntilClose = current.duration - mod(t - current.start, MINUTES_PER_DAY)
  return {
    open: true,
    closesAt: mod(current.start + current.duration, MINUTES_PER_DAY),
    minutesUntilClose,
    nextStart,
    minutesUntilNext,
  }
}

/** Countdown in plain words, rounded up to the whole minute: "52 min", "1 h 5 min". */
export function formatCountdown(minutes: number): string {
  const whole = Math.max(1, Math.ceil(minutes - 1e-9))
  if (whole < 60) return `${whole} min`
  const h = Math.floor(whole / 60)
  const m = whole % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** One-way light delay in plain words: "18 min", "1.3 s", "near real-time". */
export function formatDelay(delayMinutes: number): string {
  if (delayMinutes <= 0) return 'near real-time'
  if (delayMinutes < 1) return `${(delayMinutes * 60).toFixed(1)} s`
  return `${Math.round(delayMinutes)} min`
}
