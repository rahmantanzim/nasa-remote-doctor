import { describe, expect, it } from 'vitest'
import * as P from './physiology'

describe('physiology models (pure)', () => {
  it('bone: weightless + no exercise loses the CSA maximum (1.5%/month)', () => {
    expect(P.boneLossPercentPerMonth(0, 1)).toBeCloseTo(1.5)
    expect(P.boneLossPercentPerMonth(1, 1)).toBeLessThan(0.5)
    expect(P.boneLossPercentPerMonth(0, 0)).toBe(0) // Earth gravity
  })

  it('SANS: thigh cuffs slow the rise', () => {
    expect(P.sansStep(10, 4, 1)).toBeLessThan(P.sansStep(10, 0, 1))
  })

  it('sleep debt counts only the last 14 nights and never goes negative', () => {
    expect(P.sleepDebt(Array(30).fill(6), 8)).toBe(28)
    expect(P.sleepDebt(Array(14).fill(9), 8)).toBe(0)
  })

  it('isolation load peaks in the third quarter of the mission', () => {
    const at = (d: number) => P.isolationLoad(d, 210)
    expect(at(131)).toBeGreaterThan(at(60))
    expect(at(131)).toBeGreaterThan(at(200))
  })

  it('radiation event dose depends on shelter', () => {
    const events = [{ kind: 'solar-particle-event' as const, day: 5, doseShelteredMSv: 4, doseUnshelteredMSv: 40 }]
    expect(P.eventDose(5, events, true)).toBe(4)
    expect(P.eventDose(5, events, false)).toBe(40)
    expect(P.eventDose(6, events, false)).toBe(0)
  })
})
