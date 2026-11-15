// Build the running mission from the base mission, the chosen environment
// preset (SPEC.md F9) and the ship clock's day.

import { ENVIRONMENTS } from '../data/environments'
import type { EnvironmentId, Mission } from '../types'

export function buildMission(base: Mission, environmentId: EnvironmentId, clockDay: number): Mission {
  const env = ENVIRONMENTS[environmentId]
  return {
    ...base,
    environment: env.id,
    delayMinutes: env.delayMinutes.demo,
    syncWindows: env.syncWindows,
    // The clock may run past landing day; the mission stops there.
    currentDay: Math.min(Math.max(1, clockDay), base.landingDay),
  }
}
