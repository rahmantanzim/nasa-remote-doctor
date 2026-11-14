import { describe, expect, it } from 'vitest'
import { MISSION } from '../data/mission'
import { simulateCrew } from '../sim/simulate'
import { statusOf } from './forecast'
import { buildSignals, median } from './signals'
import { ENVIRONMENTS } from '../data/environments'
import { engineFor, lucas, maya, sam } from './testCrew'

const env = ENVIRONMENTS[MISSION.environment]

describe('forecast', () => {
  it('forecast words follow trend + concern', () => {
    expect(statusOf('stable', 0, 0)).toBe('steady')
    expect(statusOf('worsening', 0, 0)).toBe('drifting')
    expect(statusOf('stable', 0, 2)).toBe('drifting') // bad projection alone, no sign today
    expect(statusOf('worsening', 1, 2)).toBe('declining')
    expect(statusOf('improving', 1, 1)).toBe('recovering')
  })

  it('median ignores one outlier', () => {
    expect(median([60, 61, 59, 60, 110, 62, 58])).toBe(60)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('projects to landing day: bone loss and dose keep growing; more for low exercise', () => {
    const s = buildSignals(maya, simulateCrew(maya, MISSION), MISSION, env)
    expect(s.daysToLanding).toBe(70)
    expect(s.landing.boneLossPercent).toBeGreaterThan(s.now.boneLossPercent)
    expect(s.landing.cumulativeDoseMSv).toBeCloseTo(s.now.cumulativeDoseMSv + 70 * env.radiationMSvPerDay, 5)
    const samS = buildSignals(sam, simulateCrew(sam, MISSION), MISSION, env)
    const gain = (x: typeof s) => x.landing.boneLossPercent - x.now.boneLossPercent
    expect(gain(s)).toBeGreaterThan(gain(samS))
  })

  it('every body part gets a reason and a landing-day meaning', () => {
    for (const c of [maya, lucas, sam]) {
      const { statuses } = engineFor(c)
      expect(statuses).toHaveLength(9)
      for (const st of statuses) {
        expect(st.reason.length, `${c.id}/${st.part}`).toBeGreaterThan(10)
        expect(st.landingDayForecast.length, `${c.id}/${st.part}`).toBeGreaterThan(10)
        expect(st.reason).not.toMatch(/NaN|undefined/)
        expect(st.landingDayForecast).not.toMatch(/NaN|undefined/)
      }
    }
  })

  it('trend labels are plain words: "Stable" or what is moving and which way', () => {
    const by = Object.fromEntries(engineFor(maya).statuses.map((s) => [s.part, s]))
    expect(by.sleep.trendLabel).toBe('Sleep debt rising')
    expect(by.eyes.trendLabel).toBe('Eye signs rising')
    for (const st of engineFor(sam).statuses) expect(st.trend, st.part).not.toBe('worsening')
    for (const c of [maya, lucas, sam])
      for (const st of engineFor(c).statuses) expect(st.trendLabel).not.toMatch(/holding|getting/i)
  })

  it('Sam: every body part is Steady', () => {
    for (const st of engineFor(sam).statuses) expect(st.status, st.part).toBe('steady')
  })

  it('Maya: eyes, sleep and bones are Declining', () => {
    const by = Object.fromEntries(engineFor(maya).statuses.map((s) => [s.part, s]))
    for (const p of ['eyes', 'sleep', 'bones'] as const) expect(by[p].status, p).toBe('declining')
    expect(by.eyes.trend).toBe('worsening')
  })

  it('runs early in the mission (short history) without errors', () => {
    for (const day of [1, 2, 5, 10]) {
      const m = { ...MISSION, currentDay: day }
      expect(() => engineFor(sam, m)).not.toThrow()
    }
  })
})
