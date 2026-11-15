// Offline readiness (SPEC.md §4.3). Registers the service worker and tells
// the UI when the app can run with no connection at all.

import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

let ready = false
const listeners = new Set<() => void>()

function markReady(): void {
  if (ready) return
  ready = true
  for (const l of listeners) l()
}

/** Register the service worker (production builds only). */
export function startOfflineSupport(): void {
  if (!('serviceWorker' in navigator)) return
  registerSW({
    immediate: true,
    // First install finished: everything is cached.
    onOfflineReady: markReady,
    // Already installed on an earlier visit: an active worker means cached.
    onRegisteredSW: (_url, registration) => {
      if (registration?.active) markReady()
    },
  })
}

/** True once the app works fully offline. */
export function useOfflineReady(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => ready,
    () => ready,
  )
}
