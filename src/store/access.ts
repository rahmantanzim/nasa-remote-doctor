// Who may see whose health data (SPEC.md §3 "Who sees what").
//
//   Astronaut             → only their own data
//   Crew Medical Officer  → their own data + a crew overview (all crew)
//   Flight surgeon (Earth)→ only the Earth Report (not part of this tablet app)
//
// All role decisions live here. Components ask; they never decide.

import { CREW } from '../data/crew'
import type { CrewMember } from '../types'

export type ViewMode = 'astronaut' | 'crew-medical-officer'

/** Roles that get the crew overview. Source: SPEC.md §3. */
const CREW_OVERVIEW_ROLES: readonly string[] = ['Crew Medical Officer']

export function findCrew(id: string | null, crew: readonly CrewMember[] = CREW): CrewMember | null {
  return crew.find((c) => c.id === id) ?? null
}

export function viewModeFor(user: CrewMember): ViewMode {
  return CREW_OVERVIEW_ROLES.includes(user.role) ? 'crew-medical-officer' : 'astronaut'
}

/** Crew members whose data this user may see, in crew order. */
export function visibleCrew(user: CrewMember, crew: readonly CrewMember[] = CREW): CrewMember[] {
  return viewModeFor(user) === 'crew-medical-officer' ? [...crew] : crew.filter((c) => c.id === user.id)
}

export function canView(user: CrewMember, crewId: string, crew: readonly CrewMember[] = CREW): boolean {
  return visibleCrew(user, crew).some((c) => c.id === crewId)
}

/** The crew member to show: the requested one if allowed, otherwise the user themself. */
export function resolveViewedCrew(
  user: CrewMember,
  requestedId: string | null,
  crew: readonly CrewMember[] = CREW,
): CrewMember {
  return requestedId !== null && canView(user, requestedId, crew) ? (findCrew(requestedId, crew) ?? user) : user
}
