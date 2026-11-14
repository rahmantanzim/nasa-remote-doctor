import { describe, expect, it } from 'vitest'
import { ENVIRONMENTS } from '../data/environments'
import { MISSION } from '../data/mission'
import {
  formatCountdown,
  formatDelay,
  formatShipTime,
  linkState,
  parseShipTime,
} from './earthLink'

const marsWindows = ENVIRONMENTS['mars-transit'].syncWindows // 06:20, 14:20, 22:20 · 40 min
const t = parseShipTime

describe('earth link: sync windows', () => {
  it('parses and formats ship time', () => {
    expect(t('13:28')).toBe(808)
    expect(formatShipTime(808)).toBe('13:28')
    expect(formatShipTime(1440 + 5)).toBe('00:05') // wraps past midnight
    expect(() => t('25:00')).toThrow()
    expect(() => t('1:5')).toThrow()
  })

  it('demo start (13:28): link closed, next sync 14:20 in 52 min (SPEC F6 example)', () => {
    const s = linkState(MISSION.syncWindows, t(MISSION.shipTime))
    expect(s.open).toBe(false)
    expect(formatShipTime(s.nextStart)).toBe('14:20')
    expect(s.minutesUntilNext).toBe(52)
    expect(formatCountdown(s.minutesUntilNext)).toBe('52 min')
  })

  it('inside a window: open, with time until it closes and the following window', () => {
    const s = linkState(marsWindows, t('14:35'))
    expect(s.open).toBe(true)
    expect(formatShipTime(s.closesAt ?? -1)).toBe('15:00')
    expect(s.minutesUntilClose).toBe(25)
    expect(formatShipTime(s.nextStart)).toBe('22:20')
  })

  it('window edges: opens exactly at start, closed exactly at end', () => {
    expect(linkState(marsWindows, t('14:20')).open).toBe(true)
    expect(linkState(marsWindows, t('15:00')).open).toBe(false)
    expect(formatShipTime(linkState(marsWindows, t('15:00')).nextStart)).toBe('22:20')
  })

  it('after the last window of the day, the next one is tomorrow morning', () => {
    const s = linkState(marsWindows, t('23:30'))
    expect(s.open).toBe(false)
    expect(formatShipTime(s.nextStart)).toBe('06:20')
    expect(s.minutesUntilNext).toBe(6 * 60 + 50)
  })

  it('handles a window that crosses midnight', () => {
    const w = [{ start: '23:30', durationMinutes: 60 }]
    expect(linkState(w, t('00:15')).open).toBe(true)
    expect(linkState(w, t('00:15')).minutesUntilClose).toBe(15)
    expect(linkState(w, t('00:30')).open).toBe(false)
    expect(linkState(w, t('00:30')).minutesUntilNext).toBe(23 * 60)
  })

  it('a single daily window that is open now: next is the same window tomorrow', () => {
    const w = [{ start: '10:00', durationMinutes: 30 }]
    const s = linkState(w, t('10:00'))
    expect(s.open).toBe(true)
    expect(s.minutesUntilNext).toBe(1440)
  })

  it('countdown rounds up and reads plainly; fractional clock time works', () => {
    expect(linkState(MISSION.syncWindows, t('13:28') + 0.5).minutesUntilNext).toBeCloseTo(51.5)
    expect(formatCountdown(51.5)).toBe('52 min')
    expect(formatCountdown(0.2)).toBe('1 min')
    expect(formatCountdown(65)).toBe('1 h 5 min')
    expect(formatCountdown(120)).toBe('2 h')
  })

  it('formats the one-way delay', () => {
    expect(formatDelay(18)).toBe('18 min')
    expect(formatDelay(ENVIRONMENTS['moon-base'].delayMinutes.demo)).toBe('1.3 s')
    expect(formatDelay(0)).toBe('near real-time')
  })

  it('every environment preset has valid windows', () => {
    for (const env of Object.values(ENVIRONMENTS)) expect(() => linkState(env.syncWindows, 0)).not.toThrow()
  })
})
