import { describe, expect, it } from 'vitest'
import type { ActionLogEntry } from '../types'
import { actionKey, parseActionLog, withEntry, withoutEntry } from './actionLog'

const entry: ActionLogEntry = {
  crewId: 'okafor',
  day: 140,
  outcome: 'done',
  actionTitle: 'Wear thigh cuffs for 4 hours today',
  part: 'eyes',
  escalationLevel: 2,
  recordedBy: 'okafor',
  shipTime: '13:31',
}

describe('action log', () => {
  it('stores one choice per crew member per day; a new choice replaces the old', () => {
    let log = withEntry({}, entry)
    log = withEntry(log, { ...entry, outcome: 'not-today' })
    expect(Object.keys(log)).toEqual([actionKey('okafor', 140)])
    expect(log[actionKey('okafor', 140)].outcome).toBe('not-today')
    log = withEntry(log, { ...entry, day: 141 })
    expect(Object.keys(log)).toHaveLength(2)
  })

  it('undo removes only that day', () => {
    const log = withEntry(withEntry({}, entry), { ...entry, day: 141 })
    const after = withoutEntry(log, 'okafor', 140)
    expect(Object.keys(after)).toEqual([actionKey('okafor', 141)])
    expect(withoutEntry(after, 'okafor', 999)).toBe(after)
  })

  it('reading saved data keeps valid entries and drops malformed ones', () => {
    const saved = {
      a: entry,
      b: { ...entry, crewId: 'nobody' },
      c: { ...entry, outcome: 'maybe' },
      d: { ...entry, part: 'tail' },
      e: { ...entry, day: 140.5 },
      f: 'junk',
    }
    expect(Object.values(parseActionLog(saved))).toEqual([entry])
    expect(parseActionLog(null)).toEqual({})
    expect(parseActionLog('x')).toEqual({})
  })
})
