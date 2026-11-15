// Environment preset (SPEC.md F9): a tablet setting, saved across users.

import { useSyncExternalStore } from 'react'
import { ENVIRONMENTS } from '../data/environments'
import { MISSION } from '../data/mission'
import type { EnvironmentId } from '../types'

const ENV_KEY = 'remote-doctor:environment:v1'

const isEnvId = (x: unknown): x is EnvironmentId => typeof x === 'string' && x in ENVIRONMENTS

function load(): EnvironmentId {
  try {
    const raw = localStorage.getItem(ENV_KEY)
    if (raw && isEnvId(raw)) return raw
  } catch {
    // Storage blocked: use the default.
  }
  // Default: the mission's own environment (Mars transit).
  return MISSION.environment
}

let current: EnvironmentId = load()
const listeners = new Set<() => void>()

export function setEnvironment(id: EnvironmentId): void {
  if (!isEnvId(id) || id === current) return
  current = id
  try {
    localStorage.setItem(ENV_KEY, id)
  } catch {
    // Storage blocked: keep it in memory.
  }
  for (const l of listeners) l()
}

export function useEnvironmentId(): EnvironmentId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => current,
  )
}
