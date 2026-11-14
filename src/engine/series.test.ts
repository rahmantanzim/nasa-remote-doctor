import { describe, expect, it } from 'vitest'
import { MISSION } from '../data/mission'
import { BODY_PART_ORDER } from './forecast'
import { engineFor, lucas, maya, sam } from './testCrew'

describe('trend series', () => {
  it('every part has one point per mission day, finite values and a valid band', () => {
    for (const c of [maya, lucas, sam]) {
      const r = engineFor(c)
      for (const part of BODY_PART_ORDER) {
        const s = r.series[part]
        expect(s.points).toHaveLength(MISSION.currentDay)
        for (const p of s.points) {
          expect(Number.isFinite(p.value), `${c.id}/${part}`).toBe(true)
          expect(p.low, `${c.id}/${part}`).toBeLessThanOrEqual(p.high)
        }
      }
    }
  })

  it('Lucas: radiation leaves the normal band on Day 131', () => {
    const pts = engineFor(lucas).series.radiation.points
    expect(pts[129].value).toBeLessThanOrEqual(pts[129].high)
    expect(pts[130].value).toBeGreaterThan(pts[130].high)
  })

  it('Maya: SANS leaves the band; Sam stays inside it', () => {
    const last = (c: typeof maya) => engineFor(c).series.eyes.points.at(-1)!
    expect(last(maya).value).toBeGreaterThan(last(maya).high)
    expect(last(sam).value).toBeLessThan(last(sam).high)
  })

  it('temperature band rises with space fever (expected change, not a problem)', () => {
    const pts = engineFor(sam).series.immune.points
    expect(pts.at(-1)!.high).toBeGreaterThan(pts[0].high + 0.2)
  })
})
