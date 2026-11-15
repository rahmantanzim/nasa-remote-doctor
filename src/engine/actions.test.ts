import { describe, expect, it } from 'vitest'
import { BODY_PART_ORDER } from './forecast'
import { PRIORITY, actionFor, canDefer, rankStatuses } from './actions'
import { MISSION } from '../data/mission'
import { engineFor, lucas, maya, sam } from './testCrew'

describe('actions', () => {
  it('PRIORITY lists every body part exactly once', () => {
    expect([...PRIORITY].sort()).toEqual([...BODY_PART_ORDER].sort())
  })

  it('Maya: top issue is eyes (SANS); One Action is thigh cuffs at Level 2', () => {
    const r = engineFor(maya)
    expect(rankStatuses(r.statuses)[0].part).toBe('eyes')
    expect(r.oneActionPart).toBe('eyes')
    expect(r.oneAction.title).toMatch(/thigh cuffs/i)
    expect(r.oneAction.escalationLevel).toBe(2)
    expect(r.oneAction.why).toMatch(/blurry near vision/)
    expect(r.oneAction.how.join(' ')).toMatch(/Crew Medical Officer/)
  })

  it('Lucas: One Action is the radiation report at Level 3; he is the CMO so a backup checks him', () => {
    const r = engineFor(lucas)
    expect(r.oneActionPart).toBe('radiation')
    expect(r.oneAction.escalationLevel).toBe(3)
    expect(r.oneAction.how.join(' ')).toMatch(/backup medical officer/)
    expect(r.oneAction.how.join(' ')).toMatch(/Earth Report/)
  })

  it('Sam: One Action is "keep your routine" at Level 1', () => {
    const r = engineFor(sam)
    expect(r.oneActionPart).toBeNull()
    expect(r.oneAction.title).toMatch(/routine/i)
    expect(r.oneAction.escalationLevel).toBe(1)
  })

  it('every body-part action has a why, steps, and an offline plan', () => {
    for (const c of [maya, lucas, sam]) {
      const r = engineFor(c)
      for (const st of r.statuses) {
        const a = actionFor(st, r.signals)
        const tag = `${c.id}/${st.part}`
        expect(a.title.length, tag).toBeGreaterThan(5)
        expect(a.why.length, tag).toBeGreaterThan(20)
        expect(a.how.length, tag).toBeGreaterThan(0)
        expect(a.offlineProtocol?.length, tag).toBeGreaterThan(0)
        expect(a.escalationLevel, tag).toBe(st.escalationLevel)
        expect(`${a.why} ${a.how.join(' ')}`, tag).not.toMatch(/NaN|undefined/)
      }
    }
  })

  it('urgent (Level 4) actions cannot be put off; others can', () => {
    expect(canDefer(engineFor(maya).oneAction)).toBe(true)
    expect(canDefer(engineFor(sam).oneAction)).toBe(true)
    const spe = engineFor(lucas, { ...MISSION, currentDay: 131 }).oneAction
    expect(spe.escalationLevel).toBe(4)
    expect(canDefer(spe)).toBe(false)
  })
})
