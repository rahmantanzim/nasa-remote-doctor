import type { Environment, EnvironmentId } from '../types'

// The 4 environment presets (SPEC.md section 6).
// Values are approximate, for simulation. Verify before quoting in the pitch.

export const ENVIRONMENTS: Record<EnvironmentId, Environment> = {
  leo: {
    id: 'leo',
    name: 'Space Station (LEO)',
    // Near real-time: LEO relay links add well under 1 s. Modelled as 0 min.
    // Source: SPEC.md §6 ("near real-time").
    delayMinutes: { min: 0, max: 0, demo: 0 },
    // Microgravity in orbit (free fall). Source: SPEC.md §6.
    gravityG: 0,
    // ~0.5 mSv/day. Source: SPEC.md §6; NASA reports ISS crew dose of
    // roughly 0.3–0.8 mSv/day depending on solar cycle and orbit.
    radiationMSvPerDay: 0.5,
    // Near-continuous relay coverage; modelled as 4 long windows.
    // Assumption.
    syncWindows: [
      { start: '00:00', durationMinutes: 330 }, // assumption
      { start: '06:00', durationMinutes: 330 }, // assumption
      { start: '12:00', durationMinutes: 330 }, // assumption
      { start: '18:00', durationMinutes: 330 }, // assumption
    ],
  },

  'moon-base': {
    id: 'moon-base',
    name: 'Moon base',
    // ~1.3 s one-way light time (≈384,400 km ÷ c). 1.3 s = 0.0217 min.
    // Source: SPEC.md §6; physics.
    delayMinutes: { min: 1.3 / 60, max: 1.3 / 60, demo: 1.3 / 60 },
    // Lunar surface gravity 1.62 m/s² ≈ 0.17 g. Source: SPEC.md §6.
    gravityG: 0.17,
    // ~1.4 mSv/day. Source: Chang'e-4 Lunar Lander Neutrons and Dosimetry
    // (LND) measured ~1.37 mSv/day dose equivalent on the lunar surface
    // (Zhang et al., Science Advances 2020). SPEC.md §6.
    radiationMSvPerDay: 1.4,
    // Assumption: relay-satellite passes, 3 windows per day.
    syncWindows: [
      { start: '02:00', durationMinutes: 120 }, // assumption
      { start: '10:00', durationMinutes: 120 }, // assumption
      { start: '18:00', durationMinutes: 120 }, // assumption
    ],
  },

  'mars-transit': {
    id: 'mars-transit',
    name: 'Mars transit',
    // 3–22 min one-way, depending on Earth–Mars distance. Demo uses 18 min.
    // Source: SPEC.md §6 and §2.
    delayMinutes: { min: 3, max: 22, demo: 18 },
    // Coasting spacecraft, no spin gravity. Source: SPEC.md §6.
    gravityG: 0,
    // ~1.8 mSv/day. Source: SPEC.md §6; MSL RAD measured ~1.84 mSv/day
    // during cruise to Mars (Zeitlin et al., Science 2013).
    radiationMSvPerDay: 1.8,
    // Assumption: Deep Space Network-style passes, 3 short windows per day.
    // 14:20 matches the SPEC F6 example ("Next sync 14:20").
    syncWindows: [
      { start: '06:20', durationMinutes: 40 }, // assumption
      { start: '14:20', durationMinutes: 40 }, // assumption (SPEC F6 example)
      { start: '22:20', durationMinutes: 40 }, // assumption
    ],
  },

  'mars-base': {
    id: 'mars-base',
    name: 'Mars base',
    // Same light-time range as transit. Demo value: assumption (mid-range).
    // Source: SPEC.md §6.
    delayMinutes: { min: 3, max: 22, demo: 12 },
    // Mars surface gravity 3.71 m/s² ≈ 0.38 g. Source: SPEC.md §6.
    gravityG: 0.38,
    // ~0.7 mSv/day. Source: SPEC.md §6; Curiosity RAD measured ~0.64 mSv/day
    // on the surface (Hassler et al., Science 2014). Atmosphere + planet shield.
    radiationMSvPerDay: 0.7,
    // Assumption: orbiter relay passes, 2 windows per sol.
    syncWindows: [
      { start: '09:00', durationMinutes: 30 }, // assumption
      { start: '21:00', durationMinutes: 30 }, // assumption
    ],
  },
}

export const ENVIRONMENT_IDS = Object.keys(ENVIRONMENTS) as EnvironmentId[]
