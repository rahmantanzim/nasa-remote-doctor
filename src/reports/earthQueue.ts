// Earth queue (SPEC.md F7). Reports wait on the ship until the next sync
// window, travel to Earth at light speed, and the flight surgeon's reply
// travels back. Everything here is a pure function of time — the queue
// state is never stored, so it can never get out of step with the clock.
//
//   queuedAt ──(wait for link)──► sentAt ──(round-trip light time,
//                                            then wait for link)──► replyAt
//
// Assumption: the flight surgeon is on console during the pass and replies
// at once; only light time and link availability delay the answer.

import { firstOpenAtOrAfter } from '../engine/earthLink'
import { canView } from '../store/access'
import type { CrewMember, EarthReport, QueueState, ReportReply } from '../types'
import { FLIGHT_SURGEON, replyLines } from './flightSurgeonReply'

/** When the report leaves the ship: the first open link at or after queuing. */
export function sentAt(report: EarthReport): number {
  return firstOpenAtOrAfter(report.link.syncWindows, report.queuedAt)
}

/**
 * When the reply reaches the ship: one-way to Earth + one-way back
 * (round-trip light time), and only while the link is open.
 */
export function replyAt(report: EarthReport): number {
  const roundTrip = 2 * report.link.delayMinutes
  return firstOpenAtOrAfter(report.link.syncWindows, sentAt(report) + roundTrip)
}

export interface QueueStatus {
  state: QueueState
  sentAt: number
  replyAt: number
  reply: ReportReply | null
}

export function queueStatus(report: EarthReport, now: number): QueueStatus {
  const sent = sentAt(report)
  const replied = replyAt(report)
  if (now < sent) return { state: 'queued', sentAt: sent, replyAt: replied, reply: null }
  if (now < replied) return { state: 'sent', sentAt: sent, replyAt: replied, reply: null }
  return {
    state: 'replied',
    sentAt: sent,
    replyAt: replied,
    reply: { from: FLIGHT_SURGEON, lines: replyLines(report), receivedAt: replied },
  }
}

/**
 * Add a report to the queue. A report still waiting on the ship for the same
 * crew member, type and day is replaced (Earth gets the latest version).
 * Reports already sent are never changed.
 */
export function enqueue(reports: readonly EarthReport[], report: EarthReport, now: number): EarthReport[] {
  const sameWaiting = (r: EarthReport) =>
    r.crewId === report.crewId &&
    r.type === report.type &&
    r.day === report.day &&
    queueStatus(r, now).state === 'queued'
  return [...reports.filter((r) => !sameWaiting(r)), report]
}

/** Roles (SPEC.md §3): astronauts see their own reports; the CMO sees all crew reports. */
export function reportsVisibleTo(user: CrewMember, reports: readonly EarthReport[]): EarthReport[] {
  return reports.filter((r) => canView(user, r.crewId))
}

export interface QueueSummary {
  waiting: number
  sent: number
  replied: number
}

export function summarize(reports: readonly EarthReport[], now: number): QueueSummary {
  const out: QueueSummary = { waiting: 0, sent: 0, replied: 0 }
  for (const r of reports) {
    const st = queueStatus(r, now).state
    if (st === 'queued') out.waiting++
    else if (st === 'sent') out.sent++
    else out.replied++
  }
  return out
}

/**
 * Demo control: the next moment worth jumping to. If a reply is on its way,
 * its arrival; otherwise the start of the next sync window.
 */
export function nextDemoEvent(
  reports: readonly EarthReport[],
  now: number,
  nextSyncStart: number,
): { kind: 'reply' | 'sync'; at: number } {
  const pendingReplies = reports
    .map((r) => queueStatus(r, now))
    .filter((q) => q.state === 'sent')
    .map((q) => q.replyAt)
  const soonestReply = pendingReplies.length > 0 ? Math.min(...pendingReplies) : Infinity
  return soonestReply <= nextSyncStart ? { kind: 'reply', at: soonestReply } : { kind: 'sync', at: nextSyncStart }
}

/** Is a saved report object usable? (Storage is never trusted blindly.) */
export function isValidReport(x: unknown): x is EarthReport {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Record<string, unknown>
  const link = r.link as Record<string, unknown> | undefined
  const facts = r.facts as Record<string, unknown> | undefined
  return (
    typeof r.id === 'string' &&
    typeof r.crewId === 'string' &&
    typeof r.crewName === 'string' &&
    (r.type === 'daily' || r.type === 'weekly') &&
    typeof r.day === 'number' &&
    typeof r.queuedAt === 'number' &&
    Number.isFinite(r.queuedAt) &&
    typeof r.summaryFirstLine === 'string' &&
    Array.isArray(r.sections) &&
    !!facts &&
    Array.isArray(facts.findings) &&
    !!link &&
    typeof link.delayMinutes === 'number' &&
    Array.isArray(link.syncWindows) &&
    link.syncWindows.length > 0
  )
}
