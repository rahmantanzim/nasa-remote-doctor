// "What if" slider ranges (SPEC.md F10). Wide enough to explore, inside what
// a crew member could really do on a long mission.

import type { Habits } from '../engine/signals'

export interface WhatIfControl {
  key: keyof Habits
  label: string
  unit: string
  min: number
  max: number
  step: number
}

export const WHAT_IF_CONTROLS: readonly WhatIfControl[] = [
  // ISS plan is ~120 min/day; up to 180 allows "more than plan". Assumption.
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min a day', min: 0, max: 180, step: 5 },
  // 4–9 h covers very short to full nights (need ≈ 8 h, SPEC §7). Assumption.
  { key: 'sleepHours', label: 'Sleep', unit: 'h a night', min: 4, max: 9, step: 0.25 },
  // Full cuff effect at 4 h (physiology.ts); up to 8 h allowed. Assumption.
  { key: 'thighCuffHours', label: 'Thigh cuffs', unit: 'h a day', min: 0, max: 8, step: 0.5 },
]
