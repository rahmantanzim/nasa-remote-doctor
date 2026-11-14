import { describe, expect, it } from 'vitest'
import { CREW } from '../data/crew'
import { canView, findCrew, resolveViewedCrew, viewModeFor, visibleCrew } from './access'

const get = (id: string) => {
  const c = findCrew(id)
  if (!c) throw new Error(id)
  return c
}
const maya = get('okafor')
const lucas = get('tremblay')
const sam = get('ito')

describe('access: who sees what (SPEC §3)', () => {
  it('astronauts see only their own data', () => {
    for (const u of [maya, sam]) {
      expect(viewModeFor(u)).toBe('astronaut')
      expect(visibleCrew(u).map((c) => c.id)).toEqual([u.id])
      for (const other of CREW.filter((c) => c.id !== u.id)) expect(canView(u, other.id)).toBe(false)
    }
  })

  it('the Crew Medical Officer sees the whole crew', () => {
    expect(viewModeFor(lucas)).toBe('crew-medical-officer')
    expect(visibleCrew(lucas).map((c) => c.id)).toEqual(CREW.map((c) => c.id))
  })

  it('a request for someone you may not see falls back to yourself', () => {
    expect(resolveViewedCrew(sam, maya.id).id).toBe(sam.id)
    expect(resolveViewedCrew(sam, null).id).toBe(sam.id)
    expect(resolveViewedCrew(lucas, maya.id).id).toBe(maya.id)
    expect(resolveViewedCrew(lucas, 'nobody').id).toBe(lucas.id)
  })
})
