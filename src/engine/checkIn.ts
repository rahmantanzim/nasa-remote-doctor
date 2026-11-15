// Morning check-in helpers (SPEC.md F3). The form shows today's simulated
// sensor values; the astronaut confirms or edits them.

import { CHECK_IN_FIELD_BY_KEY, type CheckInNumberKey } from '../data/checkInFields'
import type { CheckIn, DailyRecord } from '../types'

/** The editable answers of a check-in (no crew/day/time). */
export type CheckInAnswers = Omit<CheckIn, 'crewId' | 'day' | 'savedAt'>

/**
 * Pre-filled answers for the check-in on `day`: today's readings and
 * symptoms, plus yesterday's exercise and thigh-cuff hours, from the history.
 * If a check-in already exists for today, the form shows it instead.
 */
export function checkInDefaults(history: DailyRecord[], day: number, existing?: CheckIn): CheckInAnswers {
  if (existing) {
    const { crewId: _c, day: _d, savedAt: _s, ...answers } = existing
    return answers
  }
  const today = history.find((r) => r.day === day)
  if (!today) throw new Error(`No record for day ${day}`)
  const yesterday = history.find((r) => r.day === day - 1)
  return {
    indicators: { ...today.indicators },
    symptoms: { ...today.symptoms },
    exerciseMinutesYesterday: yesterday?.exerciseMinutes ?? 0,
    thighCuffHoursYesterday: yesterday?.countermeasures.thighCuffHours ?? 0,
  }
}

/** Keep a value inside the field's limits and on its decimals. */
export function clampCheckInValue(key: CheckInNumberKey, value: number): number {
  const f = CHECK_IN_FIELD_BY_KEY[key]
  const clamped = Math.min(f.max, Math.max(f.min, value))
  return Number(clamped.toFixed(f.decimals))
}

/**
 * Show a value as people read it: temperature always with one decimal
 * (37.0), sleep without trailing zeros (6.25, 5.5, 7), others as whole numbers.
 */
export function formatCheckInValue(key: CheckInNumberKey, value: number): string {
  const f = CHECK_IN_FIELD_BY_KEY[key]
  if (key === 'bodyTemp') return value.toFixed(1)
  return String(Number(value.toFixed(f.decimals)))
}

/** One +/- tap. */
export function stepCheckInValue(key: CheckInNumberKey, value: number, direction: 1 | -1): number {
  return clampCheckInValue(key, value + direction * CHECK_IN_FIELD_BY_KEY[key].step)
}

/** Read a number field from the answers. */
export function getCheckInValue(a: CheckInAnswers, key: CheckInNumberKey): number {
  if (key === 'exerciseMinutesYesterday' || key === 'thighCuffHoursYesterday') return a[key]
  return a.indicators[key]
}

/** Return new answers with one number field changed (clamped). */
export function setCheckInValue(a: CheckInAnswers, key: CheckInNumberKey, value: number): CheckInAnswers {
  const v = clampCheckInValue(key, value)
  if (key === 'exerciseMinutesYesterday' || key === 'thighCuffHoursYesterday') return { ...a, [key]: v }
  return { ...a, indicators: { ...a.indicators, [key]: v } }
}

/** Mood is a 1–5 tap. */
export function setMood(a: CheckInAnswers, mood: number): CheckInAnswers {
  return { ...a, indicators: { ...a.indicators, mood: Math.min(5, Math.max(1, Math.round(mood))) } }
}

/** Is a saved check-in object valid? (Storage is never trusted blindly.) */
export function isValidCheckIn(x: unknown): x is CheckIn {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  const ind = c.indicators as Record<string, unknown> | undefined
  const sym = c.symptoms as Record<string, unknown> | undefined
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  return (
    typeof c.crewId === 'string' &&
    typeof c.day === 'number' &&
    Number.isInteger(c.day) &&
    typeof c.savedAt === 'string' &&
    num(c.exerciseMinutesYesterday) &&
    num(c.thighCuffHoursYesterday) &&
    !!ind &&
    ['heartRate', 'systolicBP', 'diastolicBP', 'glucose', 'bodyTemp', 'sleepHours', 'mood'].every((k) => num(ind[k])) &&
    !!sym &&
    ['headache', 'blurryNearVision', 'rash', 'dizziness', 'nausea', 'fatigue'].every((k) => typeof sym[k] === 'boolean')
  )
}
