import type { Mission } from '../types'
import { ENVIRONMENTS } from './environments'

// Default demo mission: Mars transit, Day 140 of 210 (SPEC.md F1).

const environment = ENVIRONMENTS['mars-transit']

export const MISSION: Mission = {
  environment: environment.id,
  // Day 140 of 210 → 70 days to landing. Source: SPEC.md F1.
  currentDay: 140,
  // Landing day = Day 210. Source: SPEC.md F1.
  landingDay: 210,
  // 18 min one-way demo delay. Source: SPEC.md §6 / F6.
  delayMinutes: environment.delayMinutes.demo,
  syncWindows: environment.syncWindows,
  // 13:28 ship time → next sync 14:20 is "in 52 min", matching SPEC F6 example.
  // Assumption (demo clock).
  shipTime: '13:28',
  events: [
    {
      kind: 'solar-particle-event',
      // Day 131: nine days ago, so it shows as a recent spike in trend charts.
      // Assumption (demo timing).
      day: 131,
      // Extra dose inside the storm shelter. Assumption: a moderate SPE is
      // mostly stopped by shelter shielding (water/polyethylene walls).
      doseShelteredMSv: 4,
      // Extra dose outside the shelter. Assumption, tuned for demo: about 10×
      // the sheltered dose. Large historic SPEs (e.g. Aug 1972) could give far
      // more behind thin shielding — this is deliberately moderate.
      doseUnshelteredMSv: 40,
    },
  ],
}
