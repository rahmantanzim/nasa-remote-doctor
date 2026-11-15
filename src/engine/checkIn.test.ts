import { describe, expect, it } from 'vitest'
import { MISSION } from '../data/mission'
import { simulateCrew } from '../sim/simulate'
import type { CheckIn } from '../types'
import { checkInDefaults, clampCheckInValue, isValidCheckIn, setCheckInValue, stepCheckInValue } from './checkIn'
import { evaluateCrew } from './index'
import { maya, sam } from './testCrew'

const day = MISSION.currentDay

function checkInFor(crewId: string, base = checkInDefaults(simulateCrew(sam, MISSION), day)): CheckIn {
  return { crewId, day, savedAt: '13:40', ...base }
}

describe('morning check-in', () => {
  it('pre-fills today from the simulated sensor values and yesterday from yesterday', () => {
    const h = simulateCrew(sam, MISSION)
    const d = checkInDefaults(h, day)
    expect(d.indicators).toEqual(h[day - 1].indicators)
    expect(d.symptoms).toEqual(h[day - 1].symptoms)
    expect(d.exerciseMinutesYesterday).toBe(h[day - 2].exerciseMinutes)
    expect(d.thighCuffHoursYesterday).toBe(h[day - 2].countermeasures.thighCuffHours)
  })

  it('check-in values override the simulated values for today', () => {
    const base = checkInDefaults(simulateCrew(sam, MISSION), day)
    const ci = checkInFor('ito', {
      ...base,
      indicators: { ...base.indicators, heartRate: 71, systolicBP: 124, glucose: 99, bodyTemp: 37.4, mood: 2 },
    })
    const h = simulateCrew(sam, MISSION, undefined, { [day]: ci })
    const today = h[day - 1]
    expect(today.source).toBe('checkin')
    expect(today.indicators).toEqual(ci.indicators)
    // Other days are untouched.
    expect(h[day - 2]).toEqual(simulateCrew(sam, MISSION)[day - 2])
  })

  it('check-in behaviour feeds the body models', () => {
    const plain = simulateCrew(maya, MISSION)
    const base = checkInDefaults(plain, day)
    // Maya slept 8 h and wore cuffs 4 h yesterday.
    const ci = checkInFor('okafor', {
      ...base,
      indicators: { ...base.indicators, sleepHours: 8 },
      thighCuffHoursYesterday: 4,
    })
    const h = simulateCrew(maya, MISSION, undefined, { [day]: ci })
    expect(h[day - 1].model.sleepDebtHours).toBeLessThan(plain[day - 1].model.sleepDebtHours)
    expect(h[day - 2].countermeasures.thighCuffHours).toBe(4)
    expect(h[day - 2].model.sansScore).toBeLessThan(plain[day - 2].model.sansScore)
  })

  it('a check-in with new symptoms changes the engine result as expected', () => {
    const before = evaluateCrew(sam, MISSION)
    const base = checkInDefaults(simulateCrew(sam, MISSION), day)
    const ci = checkInFor('ito', {
      ...base,
      symptoms: { ...base.symptoms, blurryNearVision: true, headache: true },
    })
    const after = evaluateCrew(sam, MISSION, undefined, { [day]: ci })
    expect(after.signals.symptomsRecent.blurryNearVision).toBe(before.signals.symptomsRecent.blurryNearVision + 1)
    const eyes = after.statuses.find((s) => s.part === 'eyes')
    expect(eyes?.reason).toMatch(/Blurry near vision on 1 of the last 14 days/)
    // One day alone does not escalate.
    expect(eyes?.escalationLevel).toBe(1)
  })

  it('+/- steps stay inside the field limits', () => {
    expect(stepCheckInValue('heartRate', 200, 1)).toBe(200)
    expect(stepCheckInValue('bodyTemp', 36.9, 1)).toBe(37)
    expect(clampCheckInValue('sleepHours', -2)).toBe(0)
    const base = checkInDefaults(simulateCrew(sam, MISSION), day)
    expect(setCheckInValue(base, 'exerciseMinutesYesterday', 9999).exerciseMinutesYesterday).toBe(300)
  })

  it('validates saved check-ins', () => {
    expect(isValidCheckIn(checkInFor('ito'))).toBe(true)
    expect(isValidCheckIn({ ...checkInFor('ito'), day: 'x' })).toBe(false)
    expect(isValidCheckIn(null)).toBe(false)
  })
})
