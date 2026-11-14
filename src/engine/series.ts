// Trend chart data (SPEC.md F2 item 5): one key value per body part over
// mission days, with the person's normal shown as a band.
//
// The band uses the same "watch" thresholds as the forecast, so the chart and
// the forecast word always agree: leaving the band = the engine starts to care.

import * as P from '../sim/physiology'
import type { BodyPartId, DailyRecord } from '../types'
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
  value: number
  /** Normal band for this day (it can move, e.g. space fever, dose budget). */
  low: number
  high: number
}

export interface TrendSeries {
  part: BodyPartId
  label: string
  unit: string
  /** What the band means, in plain words. */
  bandLabel: string
  /** Decimals to show. */
  decimals: number
  points: TrendPoint[]
}

/** Rolling weekly median of a daily reading — same smoothing the engine uses. */
function weeklyMedian(history: DailyRecord[], i: number, f: (r: DailyRecord) => number): number {
  return median(history.slice(Math.max(0, i - RECENT_DAYS + 1), i + 1).map(f))
}

type Def = Omit<TrendSeries, 'part' | 'points'> & {
  point: (r: DailyRecord, i: number, s: CrewSignals) => Omit<TrendPoint, 'day'>
}

const DEFS: Record<BodyPartId, Def> = {
  brain: {
    label: 'Mood (weekly middle value)',
    unit: '/ 5',
    bandLabel: 'Your normal mood',
    decimals: 1,
    point: (_r, i, s) => ({
      value: weeklyMedian(s.history, i, (x) => x.indicators.mood),
      low: s.crew.baseline.mood - MOOD_DROP_WATCH,
      high: 5,
    }),
  },
  eyes: {
    label: 'Fluid shift toward the head (SANS score)',
    unit: '/ 100',
    bandLabel: 'Below the symptom zone',
    decimals: 0,
    point: (r) => ({ value: r.model.sansScore, low: 0, high: SANS_WATCH_FRACTION * P.SANS_SYMPTOM_ONSET }),
  },
  heart: {
    label: 'Resting heart rate (weekly middle value)',
    unit: 'bpm',
    bandLabel: 'Your normal',
    decimals: 0,
    point: (_r, i, s) => ({
      value: weeklyMedian(s.history, i, (x) => x.indicators.heartRate),
      low: s.expected.heartRate - HR_RISE_WATCH,
      high: s.expected.heartRate + HR_RISE_WATCH,
    }),
  },
  immune: {
    label: 'Body temperature (weekly middle value)',
    unit: '°C',
    bandLabel: 'Your normal in space (runs a little warmer)',
    decimals: 1,
    point: (r, i, s) => {
      const expected = P.bodyTempMean(s.crew.baseline.bodyTemp, r.day, s.unload, 0)
      return {
        value: weeklyMedian(s.history, i, (x) => x.indicators.bodyTemp),
        low: expected - FEVER_MARGIN_C,
        high: expected + FEVER_MARGIN_C,
      }
    },
  },
  muscles: {
    label: 'Leg strength',
    unit: '% of pre-flight',
    bandLabel: 'On track',
    decimals: 1,
    point: (r) => ({ value: r.model.strengthIndex, low: STRENGTH_WATCH, high: 100 }),
  },
  bones: {
    label: 'Hip bone density',
    unit: '% of pre-flight',
    bandLabel: 'On track with good exercise',
    decimals: 1,
    point: (r, _i, s) => ({
      value: 100 - r.model.boneLossPercent,
      low: 100 - (BONE_RATE_WATCH * s.unload * r.day) / P.DAYS_PER_MONTH,
      high: 100,
    }),
  },
  sleep: {
    label: 'Sleep debt (last 2 weeks)',
    unit: 'h',
    bandLabel: 'Well rested',
    decimals: 0,
    point: (r) => ({ value: r.model.sleepDebtHours, low: 0, high: SLEEP_DEBT_WATCH_HOURS }),
  },
  metabolism: {
    label: 'Fasting blood sugar (weekly middle value)',
    unit: 'mg/dL',
    bandLabel: 'Your normal',
    decimals: 0,
    point: (_r, i, s) => ({
      value: weeklyMedian(s.history, i, (x) => x.indicators.glucose),
      low: s.expected.glucose - GLUCOSE_RISE_WATCH,
      high: s.expected.glucose + GLUCOSE_RISE_WATCH,
    }),
  },
  radiation: {
    label: 'Total radiation dose',
    unit: 'mSv',
    bandLabel: 'Normal dose for this trip',
    decimals: 0,
    point: (r, _i, s) => {
      const planned = s.backgroundDoseMSvPerDay * r.day
      return {
        value: r.model.cumulativeDoseMSv,
        low: Math.max(0, planned - EXTRA_DOSE_WATCH_MSV),
        high: planned + EXTRA_DOSE_WATCH_MSV,
      }
    },
  },
}

export function trendSeries(part: BodyPartId, s: CrewSignals): TrendSeries {
  const { point, ...meta } = DEFS[part]
  return { part, ...meta, points: s.history.map((r, i) => ({ day: r.day, ...point(r, i, s) })) }
}
