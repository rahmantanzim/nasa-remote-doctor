import { describe, expect, it } from 'vitest'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../data/environments'
import { MISSION } from '../data/mission'
import type { EnvironmentId } from '../types'
import { formatDelay } from './earthLink'
import { evaluateCrew } from './index'
import { buildMission } from './mission'
import { lucas, maya, sam } from './testCrew'

const day = MISSION.currentDay
const at = (env: EnvironmentId, crew = sam) => evaluateCrew(crew, buildMission(MISSION, env, day))

describe('environment switch (SPEC F9)', () => {
  it('builds the mission from the preset: delay, sync windows, day', () => {
    const m = buildMission(MISSION, 'mars-base', 150)
    expect(m.environment).toBe('mars-base')
    expect(m.delayMinutes).toBe(ENVIRONMENTS['mars-base'].delayMinutes.demo)
    expect(m.syncWindows).toBe(ENVIRONMENTS['mars-base'].syncWindows)
    expect(m.currentDay).toBe(150)
    expect(buildMission(MISSION, 'mars-transit', 999).currentDay).toBe(MISSION.landingDay)
  })

  it('Space Station has near-zero delay', () => {
    const m = buildMission(MISSION, 'leo', day)
    expect(m.delayMinutes).toBe(0)
    expect(formatDelay(m.delayMinutes)).toBe('near real-time')
  })

  it('partial gravity lowers bone, muscle and fluid-shift effects (Mars base < Mars transit)', () => {
    const transit = at('mars-transit', maya).signals.now
    const marsBase = at('mars-base', maya).signals.now
    const moon = at('moon-base', maya).signals.now
    expect(marsBase.boneLossPercent).toBeLessThan(transit.boneLossPercent)
    expect(marsBase.strengthIndex).toBeGreaterThan(transit.strengthIndex)
    expect(marsBase.sansScore).toBeLessThan(transit.sansScore)
    // More gravity, less loss: Mars (0.38 g) < Moon (0.17 g) < transit (0 g).
    expect(marsBase.boneLossPercent).toBeLessThan(moon.boneLossPercent)
    expect(moon.boneLossPercent).toBeLessThan(transit.boneLossPercent)
  })

  it('radiation totals follow each environment rate (plus the scaled solar event)', () => {
    for (const env of ENVIRONMENT_IDS) {
      const e = ENVIRONMENTS[env]
      const total = at(env).signals.now.cumulativeDoseMSv
      // Sam sheltered: 4 mSv deep-space event dose, scaled by exposure.
      const expected = e.radiationMSvPerDay * day + 4 * e.solarEventExposure
      expect(Math.abs(total - expected) / expected, env).toBeLessThan(0.01)
    }
  })

  it("Lucas's solar event dose is smaller where the planet or magnetic field shields", () => {
    const extra = (env: EnvironmentId) => at(env, lucas).signals.extraDoseMSv
    expect(extra('leo')).toBeLessThan(extra('mars-base'))
    expect(extra('mars-base')).toBeLessThan(extra('moon-base'))
    expect(extra('moon-base')).toBeLessThan(extra('mars-transit'))
  })
})
