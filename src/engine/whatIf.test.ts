import { describe, expect, it } from 'vitest'
import { MISSION } from '../data/mission'
import { evaluateCrew } from './index'
import { currentHabits } from './signals'
import { maya } from './testCrew'

const real = evaluateCrew(maya, MISSION)
const habits = currentHabits(real.signals)
const whatIf = (patch: Partial<typeof habits>) => evaluateCrew(maya, MISSION, undefined, {}, { ...habits, ...patch })
const status = (r: typeof real, part: string) => r.statuses.find((s) => s.part === part)

describe('"What if" (SPEC F10)', () => {
  it('more exercise improves the bone forecast', () => {
    const more = whatIf({ exerciseMinutes: 120 })
    expect(more.signals.landing.boneLossPercent).toBeLessThan(real.signals.landing.boneLossPercent)
    expect(more.signals.landing.strengthIndex).toBeGreaterThan(real.signals.landing.strengthIndex)
    // Forecast word: from Declining to Recovering, trend in plain words.
    expect(status(real, 'bones')?.status).toBe('declining')
    expect(status(more, 'bones')?.status).toBe('recovering')
    expect(status(more, 'bones')?.trendLabel).toBe('Bone loss slowing')
  })

  it('more thigh-cuff hours lower the SANS projection', () => {
    const cuffs = whatIf({ thighCuffHours: 4 })
    expect(cuffs.signals.landing.sansScore).toBeLessThan(real.signals.landing.sansScore)
    const lastForecast = (r: typeof real) => r.series.eyes.points.at(-1)?.forecast ?? NaN
    expect(lastForecast(cuffs)).toBeLessThan(lastForecast(real))
    expect(status(cuffs, 'eyes')?.status).toBe('recovering')
  })

  it('more sleep lowers the landing-day sleep debt', () => {
    expect(whatIf({ sleepHours: 8 }).signals.landing.sleepDebtHours).toBeLessThan(real.signals.landing.sleepDebtHours)
  })

  it('what-if changes only the future, never the past', () => {
    const more = whatIf({ exerciseMinutes: 180 })
    expect(more.signals.history).toEqual(real.signals.history)
    expect(more.signals.now).toEqual(real.signals.now)
  })

  it('reset (real habits) returns the original results', () => {
    expect(evaluateCrew(maya, MISSION, undefined, {}, undefined)).toEqual(real)
    expect(whatIf({}).signals.landing).toEqual(real.signals.landing)
  })

  it('worse habits show as worsening', () => {
    const less = whatIf({ exerciseMinutes: 0 })
    expect(status(less, 'bones')?.trend).toBe('worsening')
  })
})
