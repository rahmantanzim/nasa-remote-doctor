import { describe, expect, it } from 'vitest'
import { MISSION } from '../data/mission'
import { simulateCrew } from '../sim/simulate'
import type { DailyRecord } from '../types'
import { engineFor, lucas, maya, sam } from './testCrew'

const levelOf = (r: ReturnType<typeof engineFor>, part: string) => r.statuses.find((s) => s.part === part)?.escalationLevel

describe('escalation', () => {
  it('Maya: eyes (SANS) is Level 2 — Crew Medical Officer', () => {
    const r = engineFor(maya)
    expect(levelOf(r, 'eyes')).toBe(2)
    expect(Math.max(...r.statuses.map((s) => s.escalationLevel))).toBe(2)
  })

  it('Lucas: radiation is flagged at Level 3 — Flight Surgeon', () => {
    const r = engineFor(lucas)
    const rad = r.statuses.find((s) => s.part === 'radiation')
    expect(rad?.escalationLevel).toBe(3)
    expect(rad?.status).not.toBe('steady')
    expect(rad?.reason).toMatch(/solar event/)
  })

  it('Lucas on the solar event day itself: Level 4 shelter protocol', () => {
    const r = engineFor(lucas, { ...MISSION, currentDay: 131 })
    expect(levelOf(r, 'radiation')).toBe(4)
    expect(r.oneAction.title).toMatch(/storm shelter/i)
    expect(r.oneAction.offlineProtocol?.length).toBeGreaterThan(0)
  })

  it('sheltered crew (Maya, Sam) are not flagged for the same solar event', () => {
    expect(levelOf(engineFor(maya), 'radiation')).toBe(1)
    expect(levelOf(engineFor(sam), 'radiation')).toBe(1)
  })

  it('Sam: no body part above Level 1', () => {
    for (const s of engineFor(sam).statuses) expect(s.escalationLevel, s.part).toBe(1)
  })

  it('space fever alone does not trigger an infection warning', () => {
    // Body runs warmer in space; set the last 14 days 0.7 °C above Sam's
    // EARTH baseline — high by Earth rules, normal for his space normal.
    const history = simulateCrew(sam, MISSION).map((r, i, all) =>
      i >= all.length - 14
        ? { ...r, indicators: { ...r.indicators, bodyTemp: sam.baseline.bodyTemp + 0.7 } }
        : r,
    )
    const r = engineFor(sam, MISSION, history)
    const imm = r.statuses.find((s) => s.part === 'immune')
    expect(imm?.escalationLevel).toBe(1)
    expect(imm?.reason).toMatch(/normal for you in space/)
    expect(imm?.reason).not.toMatch(/infection/i)
    expect(r.signals.feverDays).toBe(0)
  })

  it('a real fever (above the space normal, several days, with other signs) does escalate', () => {
    const history = simulateCrew(sam, MISSION).map((r, i, all) =>
      i >= all.length - 3
        ? {
            ...r,
            indicators: { ...r.indicators, bodyTemp: r.indicators.bodyTemp + 1.2 },
            symptoms: { ...r.symptoms, fatigue: true },
          }
        : r,
    )
    expect(levelOf(engineFor(sam, MISSION, history), 'immune')).toBeGreaterThanOrEqual(2)
  })

  it('a single bad day does not escalate', () => {
    const awful = (r: DailyRecord): DailyRecord => ({
      ...r,
      indicators: {
        heartRate: 112,
        systolicBP: 150,
        diastolicBP: 98,
        glucose: 140,
        bodyTemp: 38.4,
        sleepHours: 3.5,
        mood: 1,
      },
      symptoms: { headache: true, blurryNearVision: true, rash: true, dizziness: true, nausea: true, fatigue: true },
      source: 'checkin',
    })
    const base = simulateCrew(sam, MISSION)
    for (const badIndex of [base.length - 1, base.length - 4]) {
      const history = base.map((r, i) => (i === badIndex ? awful(r) : r))
      const r = engineFor(sam, MISSION, history)
      for (const s of r.statuses) expect(s.escalationLevel, `day ${badIndex + 1}: ${s.part}`).toBe(1)
    }
  })

  it('every status has an escalation reason', () => {
    for (const c of [maya, lucas, sam])
      for (const s of engineFor(c).statuses) expect(s.escalationReason.length).toBeGreaterThan(10)
  })
})
