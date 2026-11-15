import { describe, expect, it } from 'vitest'
import { CREW } from '../data/crew'
import { ENVIRONMENTS } from '../data/environments'
import { MISSION } from '../data/mission'
import { missionTime, parseShipTime } from '../engine/earthLink'
import { evaluateCrew } from '../engine'
import type { ActionLogEntry, CrewMember, EarthReport } from '../types'
import { buildReport } from './buildReport'
import { enqueue, nextDemoEvent, queueStatus, replyAt, reportsVisibleTo, sentAt, summarize } from './earthQueue'

const crew = (id: string) => CREW.find((c) => c.id === id) as CrewMember
const [maya, lucas, sam] = ['okafor', 'tremblay', 'ito'].map(crew)
const day = MISSION.currentDay
const at = (hhmm: string, d = day) => missionTime(d, parseShipTime(hhmm))
const nameOf = (id: string) => crew(id).name

function report(c: CrewMember, opts: { type?: 'daily' | 'weekly'; now?: number; actions?: ActionLogEntry[] } = {}): EarthReport {
  return buildReport(
    {
      crew: c,
      type: opts.type ?? 'daily',
      result: evaluateCrew(c, MISSION),
      checkIns: {},
      actions: opts.actions ?? [],
      mission: MISSION,
      now: opts.now ?? at('13:30'),
    },
    nameOf,
  )
}

const section = (r: EarthReport, title: string) => r.sections.find((s) => s.title === title)?.lines.join('\n') ?? ''

describe('Earth report content', () => {
  it('Maya: eyes first; open escalations at Level 2; action and radiation listed', () => {
    const r = report(maya, {
      actions: [
        { crewId: 'okafor', day, outcome: 'done', actionTitle: 'Wear thigh cuffs for 4 hours today', part: 'eyes', escalationLevel: 2, recordedBy: 'okafor', shipTime: '13:31' },
      ],
    })
    expect(r.summaryFirstLine).toMatch(/^Eyes \(Level 2\)/)
    expect(section(r, 'Open escalations')).toMatch(/Level 2 · Crew Medical Officer — Eyes/)
    expect(section(r, 'Open escalations')).toMatch(/Sleep/)
    expect(section(r, 'One Action')).toMatch(/Wear thigh cuffs.*done at 13:31/)
    expect(section(r, 'Morning check-in')).toMatch(/No check-in today/)
    expect(section(r, 'Radiation')).toMatch(/% of NASA's 600 mSv career limit/)
    expect(r.sections.map((s) => s.title)).toEqual([
      'Open escalations',
      'Forecast by body part',
      'Morning check-in',
      'One Action',
      'Radiation',
    ])
  })

  it('Lucas: radiation at Level 3 comes first, with the extra dose and % of the limit', () => {
    const r = report(lucas)
    expect(r.summaryFirstLine).toMatch(/^Radiation \(whole body\) \(Level 3\)/)
    const esc = section(r, 'Open escalations').split('\n')
    expect(esc[0]).toMatch(/^Level 3 · Flight Surgeon — Radiation/)
    expect(section(r, 'Radiation')).toMatch(/Extra dose in the last 2 weeks: 40 mSv \(solar event, Day 131\)/)
    expect(section(r, 'Radiation')).toMatch(/Total dose: 292 mSv — 49%/)
  })

  it('Sam: all steady, no open escalations', () => {
    const r = report(sam)
    expect(r.summaryFirstLine).toBe('All steady. Nothing needs a doctor today.')
    expect(section(r, 'Open escalations')).toMatch(/^None/)
  })

  it('weekly report covers 7 days and counts One Action answers', () => {
    const actions: ActionLogEntry[] = [
      { crewId: 'okafor', day: day - 1, outcome: 'done', actionTitle: 'A', part: 'eyes', escalationLevel: 2, recordedBy: 'okafor', shipTime: '09:00' },
      { crewId: 'okafor', day: day - 2, outcome: 'not-today', actionTitle: 'A', part: 'eyes', escalationLevel: 2, recordedBy: 'tremblay', shipTime: '09:00' },
    ]
    const r = report(maya, { type: 'weekly', actions })
    expect(r.summaryFirstLine).toMatch(/^This week \(Days 134–140\)/)
    expect(section(r, 'One Action this week')).toMatch(/Done 1 · Not today 1 · No answer 5/)
    expect(section(r, 'One Action this week')).toMatch(/by Dr. Lucas Tremblay/)
    expect(section(r, 'Check-ins this week')).toMatch(/Check-ins done: 0 of 7 days/)
  })
})

describe('Earth queue', () => {
  // Mars transit windows: 06:20, 14:20, 22:20 (40 min); 18 min one-way.
  it('waits for the next sync window, then sends', () => {
    const r = report(maya, { now: at('13:30') })
    expect(sentAt(r)).toBe(at('14:20'))
    expect(queueStatus(r, at('14:19')).state).toBe('queued')
    expect(queueStatus(r, at('14:20')).state).toBe('sent')
  })

  it('sends at once if the link is open when queued', () => {
    const r = report(maya, { now: at('14:30') })
    expect(sentAt(r)).toBe(at('14:30'))
  })

  it('reply arrives only after the round-trip delay (2 × 18 min)', () => {
    const r = report(maya, { now: at('13:30') })
    expect(replyAt(r)).toBe(at('14:56'))
    expect(queueStatus(r, at('14:55')).state).toBe('sent')
    expect(queueStatus(r, at('14:55')).reply).toBeNull()
    const done = queueStatus(r, at('14:56'))
    expect(done.state).toBe('replied')
    expect(done.reply?.from).toBe('Dr. Hart, Flight Surgeon')
  })

  it('a reply that would land after the window closes waits for the next window', () => {
    const r = report(maya, { now: at('14:50') }) // sent 14:50, back at 15:26 → link closed
    expect(replyAt(r)).toBe(at('22:20'))
  })

  it('flight surgeon reply follows the report (deterministic)', () => {
    const m = queueStatus(report(maya), at('15:00')).reply?.lines.join(' ') ?? ''
    expect(m).toMatch(/agree with thigh cuffs/)
    expect(m).toMatch(/weekly near-vision check/)
    const l = queueStatus(report(lucas), at('15:00')).reply?.lines.join(' ') ?? ''
    expect(l).toMatch(/extra 40 mSv is now in your dose record/)
    const s = queueStatus(report(sam), at('15:00')).reply?.lines.join(' ') ?? ''
    expect(s).toMatch(/Everything is steady/)
    expect(queueStatus(report(maya), at('15:00')).reply).toEqual(queueStatus(report(maya), at('15:00')).reply)
  })

  it('re-queuing replaces a waiting report but never a sent one', () => {
    const first = report(maya, { now: at('13:30') })
    const second = report(maya, { now: at('13:40') })
    expect(enqueue([first], second, at('13:40'))).toEqual([second])
    const later = report(maya, { now: at('14:30') })
    expect(enqueue([first], later, at('14:30'))).toHaveLength(2)
  })

  it('summary counts waiting, sent and replied', () => {
    const a = report(maya, { now: at('13:30') })
    const b = report(sam, { now: at('06:00') })
    expect(summarize([a, b], at('14:00'))).toEqual({ waiting: 1, sent: 0, replied: 1 })
  })

  it('demo control jumps to the next sync, then to the reply', () => {
    const r = report(maya, { now: at('13:30') })
    expect(nextDemoEvent([r], at('13:30'), at('14:20'))).toEqual({ kind: 'sync', at: at('14:20') })
    expect(nextDemoEvent([r], at('14:20'), at('22:20'))).toEqual({ kind: 'reply', at: at('14:56') })
  })

  it('works in other environments (Space Station: near-zero delay)', () => {
    const leo = { delayMinutes: 0, syncWindows: ENVIRONMENTS.leo.syncWindows }
    const r = buildReport(
      { crew: sam, type: 'daily', result: evaluateCrew(sam, MISSION), checkIns: {}, actions: [], mission: leo, now: at('10:00') },
      nameOf,
    )
    expect(replyAt(r)).toBe(sentAt(r))
  })
})

describe('report roles (SPEC §3)', () => {
  const all = [report(maya), report(lucas), report(sam)]
  it('astronauts see only their own reports', () => {
    expect(reportsVisibleTo(maya, all).map((r) => r.crewId)).toEqual(['okafor'])
    expect(reportsVisibleTo(sam, all).map((r) => r.crewId)).toEqual(['ito'])
  })
  it('the Crew Medical Officer sees all crew reports', () => {
    expect(reportsVisibleTo(lucas, all)).toHaveLength(3)
  })
})
