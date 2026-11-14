// App state: who is signed in, whose data is shown, and the selected body part.
// Saved in localStorage so a reload (or a tired astronaut) lands where they left off.
// Offline-first: no network, and the app still works if storage is blocked.
//
// Role rules come from access.ts and are enforced HERE: the session a
// component receives can only ever point at a crew member the user may see.

import { useSyncExternalStore } from 'react'
import { BODY_PART_BY_ID } from '../data/bodyParts'
import type { BodyPartId, CrewMember } from '../types'
import { type ViewMode, canView, findCrew, resolveViewedCrew, viewModeFor, visibleCrew } from './access'

interface StoredState {
  /** Signed-in crew member (prototype: no password). null = start screen. */
  userId: string | null
  /** Crew member whose data is shown (only changeable in the CMO view). */
  crewId: string | null
  selectedPart: BodyPartId | null
}

/** Bump the version if the shape changes, so old saved state is ignored. */
const STORAGE_KEY = 'remote-doctor:ui:v2'

const EMPTY: StoredState = { userId: null, crewId: null, selectedPart: null }

const isPartId = (x: unknown): x is BodyPartId => typeof x === 'string' && x in BODY_PART_BY_ID

function load(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY
    const { userId, crewId, selectedPart } = parsed as Record<string, unknown>
    const user = typeof userId === 'string' ? findCrew(userId) : null
    if (!user) return EMPTY
    const viewed = resolveViewedCrew(user, typeof crewId === 'string' ? crewId : null)
    return { userId: user.id, crewId: viewed.id, selectedPart: isPartId(selectedPart) ? selectedPart : null }
  } catch {
    // Storage blocked or corrupt: start at the sign-in screen.
    return EMPTY
  }
}

let state: StoredState = load()
const listeners = new Set<() => void>()

function setState(next: StoredState): void {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: keep working in memory.
  }
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** "Who is using this tablet?" — sign in as a crew member; start on your own data. */
export function signIn(userId: string): void {
  const user = findCrew(userId)
  if (user) setState({ userId: user.id, crewId: user.id, selectedPart: null })
}

/** Back to the start screen. Nothing of the previous user stays selected. */
export function switchUser(): void {
  setState(EMPTY)
}

/** Show another crew member's data — only if the signed-in user may see it. */
export function selectCrew(crewId: string): void {
  const user = findCrew(state.userId)
  if (user && canView(user, crewId)) setState({ ...state, crewId })
}

export function selectPart(part: BodyPartId | null): void {
  setState({ ...state, selectedPart: part })
}

/** Toggle: selecting the open part again closes it. */
export function togglePart(part: BodyPartId): void {
  selectPart(state.selectedPart === part ? null : part)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type Session =
  | { signedIn: false }
  | {
      signedIn: true
      user: CrewMember
      viewMode: ViewMode
      /** Crew whose data this user may see (just themself for astronauts). */
      visibleCrew: CrewMember[]
      /** Crew member whose data is shown now (always allowed). */
      viewed: CrewMember
      selectedPart: BodyPartId | null
    }

// Cache so useSyncExternalStore gets a stable snapshot between changes.
let cachedFor: StoredState | null = null
let cachedSession: Session = { signedIn: false }
// Keep the same visibleCrew array while the same user is signed in, so the
// app does not re-run the simulation when only the selected part changes.
let visibleFor: string | null = null
let visibleCache: CrewMember[] = []

function visibleCrewCached(user: CrewMember): CrewMember[] {
  if (visibleFor !== user.id) {
    visibleFor = user.id
    visibleCache = visibleCrew(user)
  }
  return visibleCache
}

function getSession(): Session {
  if (cachedFor === state) return cachedSession
  const user = findCrew(state.userId)
  cachedSession = user
    ? {
        signedIn: true,
        user,
        viewMode: viewModeFor(user),
        visibleCrew: visibleCrewCached(user),
        viewed: resolveViewedCrew(user, state.crewId),
        selectedPart: state.selectedPart,
      }
    : { signedIn: false }
  cachedFor = state
  return cachedSession
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSession, getSession)
}
