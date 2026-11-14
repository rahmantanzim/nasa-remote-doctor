// App UI state: selected crew member and selected body part.
// Saved in localStorage so a reload (or a tired astronaut) lands where they left off.
// Offline-first: no network, and the app still works if storage is blocked.

import { useSyncExternalStore } from 'react'
import { BODY_PART_BY_ID } from '../data/bodyParts'
import { CREW } from '../data/crew'
import type { BodyPartId } from '../types'

export interface UiState {
  crewId: string
  selectedPart: BodyPartId | null
}

/** Bump the version if the shape changes, so old saved state is ignored. */
const STORAGE_KEY = 'remote-doctor:ui:v1'

/** Default: the Commander — the main demo story (SPEC.md F1). */
const DEFAULT_STATE: UiState = { crewId: CREW[0].id, selectedPart: null }

const isCrewId = (x: unknown): x is string => typeof x === 'string' && CREW.some((c) => c.id === x)
const isPartId = (x: unknown): x is BodyPartId => typeof x === 'string' && x in BODY_PART_BY_ID

function load(): UiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_STATE
    const { crewId, selectedPart } = parsed as Record<string, unknown>
    return {
      crewId: isCrewId(crewId) ? crewId : DEFAULT_STATE.crewId,
      selectedPart: isPartId(selectedPart) ? selectedPart : null,
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
    return DEFAULT_STATE
  }
}

let state: UiState = load()
const listeners = new Set<() => void>()

function setState(patch: Partial<UiState>): void {
  state = { ...state, ...patch }
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

const getSnapshot = () => state

export const selectCrew = (crewId: string) => {
  if (isCrewId(crewId)) setState({ crewId })
}

export const selectPart = (part: BodyPartId | null) => setState({ selectedPart: part })

/** Toggle: selecting the open part again closes it. */
export const togglePart = (part: BodyPartId) =>
  setState({ selectedPart: state.selectedPart === part ? null : part })

export function useAppStore(): UiState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
