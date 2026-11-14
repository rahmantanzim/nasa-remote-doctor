// Trend chart data (SPEC.md F2 item 5): one key value per body part over
// the whole mission (Day 1 → landing day).
//
//   value    — what happened (Day 1 → today), smoothed
//   forecast — the engine's landing projection (today → landing day)
//   low/high — the normal band
//   normal   — "your normal": the expected path for this person in space
//
// The band uses the same "watch" thresholds as the forecast, so the chart and
// the forecast word always agree: leaving the band = the engine starts to care.

import * as P from '../sim/physiology'
import type { BodyPartId, DailyRecord, ModelState } from '../types'
import {
  BONE_RATE_WATCH,
  EXTRA_DOSE_WATCH_MSV,
  GLUCOSE_RISE_WATCH,
  HR_RISE_WATCH,
  MOOD_DROP_WATCH,
  SANS_WATCH_FRACTION,
  SLEEP_DEBT_WATCH_HOURS,
  STRENGTH_WATCH,
} from './forecast'
import { type CrewSignals, FEVER_MARGIN_C, RECENT_DAYS, median } from './signals'

export interface TrendPoint {
  day: number
  /** Measured / simulated value (null after today). */
  value: number | null
  /** Projected value if habits stay the same (null before today). */
  forecast: number | null
  /** Normal band for this day (it can move, e.g. space fever, dose budget). */
  low: number
  high: number
  /** Your normal: the expected value for you in space on this day. */
  normal: number
}

export interface TrendSeries {
  part: BodyPartId
  label: string
  unit: string
  /** What the band means, in plain words. */
  bandLabel: string
  /** Decimals to show. */
  decimals: number
  currentDay: number
  landingDay: number
  points: TrendPoint[]
}

// ---------------------------------------------------------------------------
// Smoothing
// ---------------------------------------------------------------------------

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/**
 * Smooth a noisy daily reading: rolling weekly median (one odd day cannot
 * move it — same rule as the engine), then a rolling weekly mean of those
 * medians so the line is not jagged.
 */
export function smoothDaily(history: DailyRecord[], f: (r: DailyRecord) => number): number[] {
  const raw = history.map(f)
  const window = (xs: number[], i: number) => xs.slice(Math.max(0, i - RECENT_DAYS + 1), i + 1)
  const medians = raw.map((_, i) => median(window(raw, i)))
  return medians.map((_, i) => mean(window(medians, i)))
}

/** Run a one-step model from Day 1 to `toDay`, returning the value on each day. */
function path(start: number, toDay: number, step: (prev: number, day: number) => number): number[] {
  const out: number[] = []
  let v = start
  for (let day = 1; day <= toDay; day++) {
    v = step(v, day)
    out.push(v)
  }
  return out
}

// ---------------------------------------------------------------------------
// Series definitions
// ---------------------------------------------------------------------------

interface Ctx {
  s: CrewSignals
  /** Smoothed history values (only for indicator series). */
  smoothed: number[] | null
  /** "Your normal" path, one value per day from Day 1 to landing (if not constant). */
  normalPath: number[] | null
}

interface Def {
  label: string
  unit: string
  bandLabel: string
  decimals: number
  /** Raw daily reading to smooth (indicator series). */
  daily?: (r: DailyRecord) => number
  /** Value from a model state (model series) — also used for history if no `daily`. */
  fromModel: (m: ModelState, day: number, s: CrewSignals) => number
  band: (day: number, s: CrewSignals) => [number, number]
  normal: (day: number, ctx: Ctx) => number
  /** Optional path builder for "your normal" (runs once per series). */
  normalPath?: (s: CrewSignals) => number[]
}

const sleepLoadOf = (m: ModelState) => P.sleepLoad(m.sleepDebtHours)

const DEFS: Record<BodyPartId, Def> = {
  brain: {
    label: 'Mood',
    unit: '/ 5',
    bandLabel: 'Normal mood range',
    decimals: 1,
    daily: (r) => r.indicators.mood,
    fromModel: (m, _d, s) => P.moodMean(s.crew.baseline.mood, m.stress),
    band: (_d, s) => [s.crew.baseline.mood - MOOD_DROP_WATCH, 5],
    normal: (_d, { s }) => s.crew.baseline.mood,
  },
  eyes: {
    label: 'Fluid shift toward the head (SANS score)',
    unit: '/ 100',
    bandLabel: 'Below the symptom zone',
    decimals: 0,
    fromModel: (m) => m.sansScore,
    band: () => [0, SANS_WATCH_FRACTION * P.SANS_SYMPTOM_ONSET],
    // Your normal: the path with full thigh-cuff use.
    normalPath: (s) => path(0, s.landingDay, (v) => P.sansStep(v, P.THIGH_CUFF_FULL_HOURS, s.unload)),
    normal: (d, { normalPath }) => normalPath?.[d - 1] ?? 0,
  },
  heart: {
    label: 'Resting heart rate',
    unit: 'bpm',
    bandLabel: 'Normal range',
    decimals: 0,
    daily: (r) => r.indicators.heartRate,
    fromModel: (m, day, s) =>
      P.heartMeans(s.crew.baseline, {
        deconditioning: m.cardioDeconditioning,
        sleepLoad: sleepLoadOf(m),
        stress: m.stress,
        day,
        unload: s.unload,
      }).heartRate,
    band: (_d, s) => [s.expected.heartRate - HR_RISE_WATCH, s.expected.heartRate + HR_RISE_WATCH],
    normal: (_d, { s }) => s.expected.heartRate,
  },
  immune: {
    label: 'Body temperature',
    unit: '°C',
    bandLabel: 'Normal range in space (runs a little warmer)',
    decimals: 1,
    daily: (r) => r.indicators.bodyTemp,
    fromModel: (m, day, s) => P.bodyTempMean(s.crew.baseline.bodyTemp, day, s.unload, m.immuneStress),
    band: (day, s) => {
      const t = P.bodyTempMean(s.crew.baseline.bodyTemp, day, s.unload, 0)
      return [t - FEVER_MARGIN_C, t + FEVER_MARGIN_C]
    },
    normal: (day, { s }) => P.bodyTempMean(s.crew.baseline.bodyTemp, day, s.unload, 0),
  },
  muscles: {
    label: 'Leg strength',
    unit: '% of pre-flight',
    bandLabel: 'On track',
    decimals: 1,
    fromModel: (m) => m.strengthIndex,
    band: () => [STRENGTH_WATCH, 100],
    // Your normal: the path with the full exercise plan.
    normalPath: (s) => path(s.crew.baseline.strengthIndex, s.landingDay, (v) => P.muscleStep(v, 1, s.unload)),
    normal: (d, { normalPath }) => normalPath?.[d - 1] ?? 100,
  },
  bones: {
    label: 'Hip bone density',
    unit: '% of pre-flight',
    bandLabel: 'On track with good exercise',
    decimals: 1,
    fromModel: (m) => 100 - m.boneLossPercent,
    band: (day, s) => [100 - (BONE_RATE_WATCH * s.unload * day) / P.DAYS_PER_MONTH, 100],
    // Your normal: the path with the full exercise plan.
    normalPath: (s) => path(100, s.landingDay, (v) => P.boneStep(v, 1, s.unload)),
    normal: (d, { normalPath }) => normalPath?.[d - 1] ?? 100,
  },
  sleep: {
    label: 'Sleep debt (last 2 weeks)',
    unit: 'h',
    bandLabel: 'Well rested',
    decimals: 0,
    fromModel: (m) => m.sleepDebtHours,
    band: () => [0, SLEEP_DEBT_WATCH_HOURS],
    normal: () => 0,
  },
  metabolism: {
    label: 'Fasting blood sugar',
    unit: 'mg/dL',
    bandLabel: 'Normal range',
    decimals: 0,
    daily: (r) => r.indicators.glucose,
    fromModel: (m, _d, s) => P.glucoseMean(s.crew.baseline.fastingGlucose, m.insulinResistance, sleepLoadOf(m)),
    band: (_d, s) => [s.expected.glucose - GLUCOSE_RISE_WATCH, s.expected.glucose + GLUCOSE_RISE_WATCH],
    normal: (_d, { s }) => s.expected.glucose,
  },
  radiation: {
    label: 'Total radiation dose',
    unit: 'mSv',
    bandLabel: 'Normal dose for this trip',
    decimals: 0,
    fromModel: (m) => m.cumulativeDoseMSv,
    band: (day, s) => {
      const planned = s.backgroundDoseMSvPerDay * day
      return [Math.max(0, planned - EXTRA_DOSE_WATCH_MSV), planned + EXTRA_DOSE_WATCH_MSV]
    },
    normal: (day, { s }) => s.backgroundDoseMSvPerDay * day,
  },
}

export function trendSeries(part: BodyPartId, s: CrewSignals): TrendSeries {
  const def = DEFS[part]
  const ctx: Ctx = {
    s,
    smoothed: def.daily ? smoothDaily(s.history, def.daily) : null,
    normalPath: def.normalPath ? def.normalPath(s) : null,
  }
  const point = (day: number, value: number | null, forecast: number | null): TrendPoint => {
    const [low, high] = def.band(day, s)
    return { day, value, forecast, low, high, normal: def.normal(day, ctx) }
  }

  const history = s.history.map((r, i) => {
    const value = ctx.smoothed ? ctx.smoothed[i] : def.fromModel(r.model, r.day, s)
    // Today is where the forecast starts, so the two lines join.
    return point(r.day, value, r.day === s.day ? value : null)
  })
  const future = s.projection.map((p) => point(p.day, null, def.fromModel(p.model, p.day, s)))

  return {
    part,
    label: def.label,
    unit: def.unit,
    bandLabel: def.bandLabel,
    decimals: def.decimals,
    currentDay: s.day,
    landingDay: s.landingDay,
    points: [...history, ...future],
  }
}
