import { describe, expect, it } from 'vitest'
import { CREW } from '../data/crew'
import { MISSION } from '../data/mission'
import type { CrewMember, DailyRecord } from '../types'
import { DAYS_PER_MONTH } from './physiology'
import { simulateCrew } from './simulate'

const crew = (id: string): CrewMember => {
  const c = CREW.find((m) => m.id === id)
  if (!c) throw new Error(`missing crew ${id}`)
  return c
}
const maya = crew('okafor')
const lucas = crew('tremblay')
const sam = crew('ito')

const at = (h: DailyRecord[], day: number): DailyRecord => h[day - 1]
const lastDays = (h: DailyRecord[], n: number) => h.slice(-n)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Same person, but with one exercise habit for the whole mission. */
const withExercise = (c: CrewMember, minutes: number): CrewMember => ({
  ...c,
  behaviour: { ...c.behaviour, usualExerciseMinutes: minutes, recentExerciseMinutes: minutes },
})
const monthlyBoneLoss = (h: DailyRecord[]) =>
  at(h, MISSION.currentDay).model.boneLossPercent / (MISSION.currentDay / DAYS_PER_MONTH)

describe('simulateCrew', () => {
  it('returns Day 1 … current day', () => {
    const h = simulateCrew(maya, MISSION)
    expect(h).toHaveLength(MISSION.currentDay)
    expect(h[0].day).toBe(1)
    expect(h.at(-1)?.day).toBe(MISSION.currentDay)
  })

  it('same seed gives the exact same history', () => {
    for (const c of CREW) expect(simulateCrew({ ...c }, MISSION)).toEqual(simulateCrew(c, MISSION))
  })

  it('different seed gives a different history', () => {
    expect(simulateCrew({ ...sam, seed: sam.seed + 1 }, MISSION)).not.toEqual(simulateCrew(sam, MISSION))
  })

  it('bone loss is ~1–1.5%/month with low exercise, and smaller with good exercise', () => {
    const low = monthlyBoneLoss(simulateCrew(withExercise(maya, 20), MISSION))
    const good = monthlyBoneLoss(simulateCrew(withExercise(maya, 120), MISSION))
    expect(low).toBeGreaterThanOrEqual(1)
    expect(low).toBeLessThanOrEqual(1.5)
    expect(good).toBeLessThan(low)
    expect(good).toBeLessThan(1)
  })

  it('Maya: SANS score and sleep debt rise over time; SANS symptoms appear recently', () => {
    const h = simulateCrew(maya, MISSION)
    const sans = (d: number) => at(h, d).model.sansScore
    const debt = (d: number) => at(h, d).model.sleepDebtHours
    expect(sans(140)).toBeGreaterThan(sans(100))
    expect(sans(100)).toBeGreaterThan(sans(30))
    expect(debt(140)).toBeGreaterThan(debt(100))
    expect(debt(140)).toBeGreaterThan(debt(30))

    const recent = lastDays(h, 14)
    expect(recent.filter((r) => r.symptoms.headache).length).toBeGreaterThanOrEqual(3)
    expect(recent.filter((r) => r.symptoms.blurryNearVision).length).toBeGreaterThanOrEqual(1)
    // No blurry vision in the first 3 months — SANS takes months to build.
    expect(h.slice(0, 90).some((r) => r.symptoms.blurryNearVision)).toBe(false)
  })

  it('Lucas: radiation dose jumps on the solar event day (Day 131)', () => {
    const h = simulateCrew(lucas, MISSION)
    const normal = mean(h.slice(120, 130).map((r) => r.radiationDose))
    expect(at(h, 131).radiationDose).toBeGreaterThan(10 * normal)
    expect(at(h, 131).model.cumulativeDoseMSv - at(h, 130).model.cumulativeDoseMSv).toBeGreaterThan(35)
    // Sheltered crewmates get a much smaller bump.
    const samDay131 = at(simulateCrew(sam, MISSION), 131).radiationDose
    expect(samDay131).toBeLessThan(at(h, 131).radiationDose / 5)
  })

  it('Sam: stays close to his baseline', () => {
    const h = simulateCrew(sam, MISSION)
    const recent = lastDays(h, 14)
    const b = sam.baseline
    expect(Math.abs(mean(recent.map((r) => r.indicators.heartRate)) - b.restingHeartRate)).toBeLessThan(5)
    // In-flight BP sits ~8 mmHg lower (Norsk 2015) — allowed.
    expect(Math.abs(mean(recent.map((r) => r.indicators.systolicBP)) - b.systolicBP)).toBeLessThan(10)
    expect(Math.abs(mean(recent.map((r) => r.indicators.glucose)) - b.fastingGlucose)).toBeLessThan(6)
    expect(mean(recent.map((r) => r.indicators.mood))).toBeGreaterThanOrEqual(3.5)
    expect(at(h, 140).model.sleepDebtHours).toBeLessThan(10)
    expect(recent.some((r) => r.symptoms.blurryNearVision)).toBe(false)
    // He is the healthiest of the three on the main drivers.
    const mayaEnd = at(simulateCrew(maya, MISSION), 140).model
    expect(at(h, 140).model.sansScore).toBeLessThan(mayaEnd.sansScore)
    expect(at(h, 140).model.boneLossPercent).toBeLessThan(mayaEnd.boneLossPercent)
  })

  it('all values stay in realistic human ranges', () => {
    for (const c of CREW) {
      for (const r of simulateCrew(c, MISSION)) {
        const i = r.indicators
        const tag = `${c.id} day ${r.day}`
        expect(i.heartRate, tag).toBeGreaterThanOrEqual(40)
        expect(i.heartRate, tag).toBeLessThanOrEqual(100)
        expect(i.systolicBP, tag).toBeGreaterThanOrEqual(85)
        expect(i.systolicBP, tag).toBeLessThanOrEqual(140)
        expect(i.diastolicBP, tag).toBeGreaterThanOrEqual(50)
        expect(i.diastolicBP, tag).toBeLessThanOrEqual(90)
        expect(i.systolicBP - i.diastolicBP, tag).toBeGreaterThanOrEqual(20)
        expect(i.glucose, tag).toBeGreaterThanOrEqual(65)
        expect(i.glucose, tag).toBeLessThanOrEqual(125)
        expect(i.bodyTemp, tag).toBeGreaterThanOrEqual(35.8)
        expect(i.bodyTemp, tag).toBeLessThanOrEqual(37.8)
        expect(i.sleepHours, tag).toBeGreaterThanOrEqual(3)
        expect(i.sleepHours, tag).toBeLessThanOrEqual(10)
        expect(Number.isInteger(i.mood) && i.mood >= 1 && i.mood <= 5, tag).toBe(true)
        expect(r.model.sansScore, tag).toBeLessThanOrEqual(100)
        expect(r.model.boneLossPercent, tag).toBeLessThan(10)
      }
    }
  })
})
