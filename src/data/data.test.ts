import { describe, expect, it } from 'vitest'
import { BODY_PARTS, BODY_PART_BY_ID, HAZARDS } from './bodyParts'
import { CREW } from './crew'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from './environments'
import { MISSION } from './mission'

describe('static data is complete', () => {
  it('has 3 crew members with unique ids and seeds', () => {
    expect(CREW).toHaveLength(3)
    expect(new Set(CREW.map((c) => c.id)).size).toBe(3)
    expect(new Set(CREW.map((c) => c.seed)).size).toBe(3)
  })

  it('has 9 body parts with unique ids', () => {
    expect(BODY_PARTS).toHaveLength(9)
    expect(Object.keys(BODY_PART_BY_ID)).toHaveLength(9)
  })

  it('every body part has at least one known hazard', () => {
    for (const part of BODY_PARTS) {
      expect(part.hazards.length, part.id).toBeGreaterThan(0)
      for (const h of part.hazards) expect(HAZARDS[h], `${part.id}:${h}`).toBeDefined()
    }
  })

  it('has 4 environments', () => {
    expect(ENVIRONMENT_IDS).toHaveLength(4)
  })

  it('mission is Mars transit, Day 140 of 210, 18 min delay', () => {
    expect(MISSION.environment).toBe('mars-transit')
    expect(MISSION.currentDay).toBe(140)
    expect(MISSION.landingDay).toBe(210)
    expect(MISSION.delayMinutes).toBe(18)
    expect(MISSION.syncWindows).toBe(ENVIRONMENTS['mars-transit'].syncWindows)
  })
})
