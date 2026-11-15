// Mission clock: mission time = minutes since Day 1, 00:00 ship time.
//
// On first use it starts at the mission's day and ship time (Day 140, 13:28)
// and then runs in real time. The anchor is saved, so a reload continues
// where the clock was (queued reports keep consistent times).
// Demo controls can move the clock forward (e.g. to the next sync window).

import { useSyncExternalStore } from 'react'
import { MISSION } from '../data/mission'
import { dayOfMission, missionTime, parseShipTime } from '../engine/earthLink'

const CLOCK_KEY = 'remote-doctor:clock:v1'

interface Anchor {
  /** Real time (ms since epoch) when the mission time below was true. */
  realMs: number
  /** Mission time at that moment. */
  mission: number
}

const startOfDemo = (): Anchor => ({
  realMs: Date.now(),
  mission: missionTime(MISSION.currentDay, parseShipTime(MISSION.shipTime)),
})

function loadAnchor(): Anchor {
  try {
    const raw = localStorage.getItem(CLOCK_KEY)
    if (raw) {
      const a = JSON.parse(raw) as Partial<Anchor>
      if (typeof a.realMs === 'number' && typeof a.mission === 'number' && Number.isFinite(a.mission)) {
        return { realMs: a.realMs, mission: a.mission }
      }
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return startOfDemo()
}

let anchor: Anchor = loadAnchor()
const listeners = new Set<() => void>()

function saveAnchor(): void {
  try {
    localStorage.setItem(CLOCK_KEY, JSON.stringify(anchor))
  } catch {
    // Storage blocked: the clock still runs in memory.
  }
}
saveAnchor()

/** Mission time now. */
export function missionNow(nowMs: number = Date.now()): number {
  return anchor.mission + (nowMs - anchor.realMs) / 60_000
}

// Snapshot updated once a second (and on jumps) so React sees stable values.
let current = missionNow()
let ticker: ReturnType<typeof setInterval> | null = null

function publish(): void {
  current = missionNow()
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  ticker ??= setInterval(publish, 1000)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && ticker) {
      clearInterval(ticker)
      ticker = null
    }
  }
}

/** Demo control: set the mission clock to a later time (never backwards). */
export function jumpMissionClockTo(t: number): void {
  if (t <= missionNow()) return
  anchor = { realMs: Date.now(), mission: t }
  saveAnchor()
  publish()
}

/** Demo control: back to the mission start (Day 140, 13:28). */
export function resetMissionClock(): void {
  anchor = startOfDemo()
  saveAnchor()
  publish()
}

/** Mission time, updated every second. */
export function useMissionNow(): number {
  return useSyncExternalStore(subscribe, () => current, () => current)
}

const currentDay = () => dayOfMission(current)

/** Mission day, re-rendering only when the day changes (not every second). */
export function useMissionDay(): number {
  return useSyncExternalStore(subscribe, currentDay, currentDay)
}
