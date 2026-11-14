// App state: who is signed in, whose data is shown, the selected body part,
// and the One Action log ("Done" / "Not today" per crew member per day).
// Saved in localStorage so a reload (or a tired astronaut) lands where they left off.
// Offline-first: no network, and the app still works if storage is blocked.
//
// Role rules come from access.ts and are enforced HERE: the session a
// component receives can only ever point at a crew member the user may see.

import { useSyncExternalStore } from 'react'
import { BODY_PART_BY_ID } from '../data/bodyParts'
import { formatShipTime } from '../engine/earthLink'
import type { Action, ActionLogEntry, ActionOutcome, BodyPartId, CrewMember } from '../types'
import { type ViewMode, canView, findCrew, resolveViewedCrew, viewModeFor, visibleCrew } from './access'
import { type ActionLog, actionKey, parseActionLog, withEntry, withoutEntry } from './actionLog'

interface StoredState {
  /** Signed-in crew member (prototype: no password). null = start screen. */
  userId: string | null
  /** Crew member whose data is shown (only changeable in the CMO view). */
  crewId: string | null
  selectedPart: BodyPartId | null
}

/** Bump the version if the shape changes, so old saved state is ignored. */
const STORAGE_KEY = 'remote-doctor:ui:v2'
/** The action log is saved separately: it outlives sign-in sessions. */
const ACTION_LOG_KEY = 'remote-doctor:actions:v1'

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

function loadActionLog(): ActionLog {
  try {
    const raw = localStorage.getItem(ACTION_LOG_KEY)
    return raw ? parseActionLog(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

let state: StoredState = load()
let actionLog: ActionLog = loadActionLog()
const listeners = new Set<() => void>()

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked: keep working in memory.
  }
}

function setState(next: StoredState): void {
  state = next
  save(STORAGE_KEY, state)
  for (const l of listeners) l()
}

function setActionLog(next: ActionLog): void {
  actionLog = next
  save(ACTION_LOG_KEY, actionLog)
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

/** The signed-in user, if they may act for this crew member (themself, or anyone in the CMO view). */
function actorFor(crewId: string): CrewMember | null {
  const user = findCrew(state.userId)
  return user && canView(user, crewId) ? user : null
}

/** Record "Done" / "Not today" for a crew member's One Action on a mission day. */
export function recordAction(
  crewId: string,
  day: number,
  action: Action,
  part: BodyPartId | null,
  outcome: ActionOutcome,
  shipMinutes: number,
): void {
  const actor = actorFor(crewId)
  if (!actor) return
  setActionLog(
    withEntry(actionLog, {
      crewId,
      day,
      outcome,
      actionTitle: action.title,
      part,
      escalationLevel: action.escalationLevel,
      recordedBy: actor.id,
      shipTime: formatShipTime(shipMinutes),
    }),
  )
}

/** Undo today's choice. */
export function clearAction(crewId: string, day: number): void {
  if (actorFor(crewId)) setActionLog(withoutEntry(actionLog, crewId, day))
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

/** The saved One Action choice for a crew member on a day (null = not answered yet). */
export function useActionEntry(crewId: string, day: number): ActionLogEntry | null {
  const key = actionKey(crewId, day)
  return useSyncExternalStore(
    subscribe,
    () => actionLog[key] ?? null,
    () => actionLog[key] ?? null,
  )
}
