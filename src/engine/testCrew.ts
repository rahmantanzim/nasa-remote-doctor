// Shared test helpers for engine tests (not used by the app).
import { CREW } from '../data/crew'
import { MISSION } from '../data/mission'
import { simulateCrew } from '../sim/simulate'
import type { CrewMember, DailyRecord, Mission } from '../types'
import { runEngine } from './index'

export function crewById(id: string): CrewMember {
  const c = CREW.find((m) => m.id === id)
  if (!c) throw new Error(`missing crew ${id}`)
  return c
}

export const maya = crewById('okafor')
export const lucas = crewById('tremblay')
export const sam = crewById('ito')

export function engineFor(crew: CrewMember, mission: Mission = MISSION, history?: DailyRecord[]) {
  return runEngine(crew, history ?? simulateCrew(crew, mission), mission)
}
