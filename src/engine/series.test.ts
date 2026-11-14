import { describe, expect, it } from 'vitest'
import { MISSION } from '../data/mission'
import type { BodyPartId } from '../types'
import { BODY_PART_ORDER } from './forecast'
import type { TrendSeries } from './series'
import { engineFor, lucas, maya, sam } from './testCrew'

const at = (s: TrendSeries, day: number) => {
  const p = s.points.find((x) => x.day === day)
  if (!p) throw new Error(`no point for day ${day}`)
  return p
}
const today = MISSION.currentDay
const landing = MISSION.landingDay

describe('trend series', () => {
  it('covers Day 1 → landing day: history until today, forecast from today', () => {
    for (const c of [maya, lucas, sam]) {
      const r = engineFor(c)
      for (const part of BODY_PART_ORDER) {
        const s = r.series[part]
        const tag = `${c.id}/${part}`
        expect(s.points, tag).toHaveLength(landing)
        expect(s.currentDay).toBe(today)
        expect(s.landingDay).toBe(landing)
        for (const p of s.points) {
          expect(p.low, tag).toBeLessThanOrEqual(p.high)
          if (p.day <= today) expect(Number.isFinite(p.value), `${tag} d${p.day}`).toBe(true)
          else expect(p.value, tag).toBeNull()
          if (p.day >= today) expect(Number.isFinite(p.forecast), `${tag} d${p.day}`).toBe(true)
          else expect(p.forecast, tag).toBeNull()
        }
        // Forecast starts exactly where history ends.
        expect(at(s, today).forecast).toBe(at(s, today).value)
      }
    }
  })

  it('"your normal" line sits inside the normal band', () => {
    for (const c of [maya, lucas, sam]) {
      const r = engineFor(c)
      for (const part of BODY_PART_ORDER) {
        for (const p of r.series[part].points) {
          expect(p.normal, `${c.id}/${part} d${p.day}`).toBeGreaterThanOrEqual(p.low - 1e-9)
          expect(p.normal, `${c.id}/${part} d${p.day}`).toBeLessThanOrEqual(p.high + 1e-9)
        }
      }
    }
  })

  it('forecast ends at the engine landing projection', () => {
    const r = engineFor(maya)
    const end = (part: BodyPartId) => at(r.series[part], landing).forecast
    expect(end('bones')).toBeCloseTo(100 - r.signals.landing.boneLossPercent, 9)
    expect(end('eyes')).toBeCloseTo(r.signals.landing.sansScore, 9)
    expect(end('radiation')).toBeCloseTo(r.signals.landing.cumulativeDoseMSv, 9)
  })

  it('Lucas: radiation leaves the normal band on Day 131 and stays above it', () => {
    const s = engineFor(lucas).series.radiation
    expect(at(s, 130).value).toBeLessThanOrEqual(at(s, 130).high)
    expect(at(s, 131).value).toBeGreaterThan(at(s, 131).high)
    expect(at(s, landing).forecast).toBeGreaterThan(at(s, landing).high)
  })

  it('Maya: SANS is above the band today and heads higher; Sam stays inside', () => {
    const m = engineFor(maya).series.eyes
    expect(at(m, today).value).toBeGreaterThan(at(m, today).high)
    expect(at(m, landing).forecast).toBeGreaterThan(at(m, today).value ?? Infinity)
    const s = engineFor(sam).series.eyes
    expect(at(s, landing).forecast).toBeLessThan(at(s, landing).high)
  })

  it('temperature band rises with space fever (expected change, not a problem)', () => {
    const s = engineFor(sam).series.immune
    expect(at(s, today).high).toBeGreaterThan(at(s, 1).high + 0.2)
  })

  it('smoothing: the daily-reading line moves less day to day than raw readings', () => {
    const r = engineFor(sam)
    const raw = r.signals.history.map((h) => h.indicators.heartRate)
    const smooth = r.series.heart.points.filter((p) => p.value !== null).map((p) => p.value as number)
    const jumps = (xs: number[]) => xs.slice(1).reduce((sum, x, i) => sum + Math.abs(x - xs[i]), 0)
    expect(jumps(smooth)).toBeLessThan(jumps(raw) / 3)
  })
})
