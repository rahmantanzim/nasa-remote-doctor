// One Action log: "Done" / "Not today", per crew member per mission day.
// Pure helpers; the store saves the log and checks who may write to it.

import { BODY_PART_BY_ID } from '../data/bodyParts'
import type { ActionLogEntry, ActionOutcome, EscalationLevel } from '../types'
import { findCrew } from './access'

export type ActionLog = Readonly<Record<string, ActionLogEntry>>

export const actionKey = (crewId: string, day: number): string => `${crewId}:${day}`

const OUTCOMES: readonly ActionOutcome[] = ['done', 'not-today']
const LEVELS: readonly EscalationLevel[] = [1, 2, 3, 4]

function isEntry(x: unknown): x is ActionLogEntry {
  if (typeof x !== 'object' || x === null) return false
  const e = x as Record<string, unknown>
  return (
    typeof e.crewId === 'string' &&
    findCrew(e.crewId) !== null &&
    typeof e.day === 'number' &&
    Number.isInteger(e.day) &&
    e.day >= 1 &&
    OUTCOMES.includes(e.outcome as ActionOutcome) &&
    typeof e.actionTitle === 'string' &&
    (e.part === null || (typeof e.part === 'string' && e.part in BODY_PART_BY_ID)) &&
    LEVELS.includes(e.escalationLevel as EscalationLevel) &&
    typeof e.recordedBy === 'string' &&
    findCrew(e.recordedBy) !== null &&
    typeof e.shipTime === 'string' &&
    /^\d{2}:\d{2}$/.test(e.shipTime)
  )
}

/** Read a saved log; drops anything malformed (never trusts storage blindly). */
export function parseActionLog(raw: unknown): ActionLog {
  if (typeof raw !== 'object' || raw === null) return {}
  const out: Record<string, ActionLogEntry> = {}
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (isEntry(value)) out[actionKey(value.crewId, value.day)] = value
  }
  return out
}

export function withEntry(log: ActionLog, entry: ActionLogEntry): ActionLog {
  return { ...log, [actionKey(entry.crewId, entry.day)]: entry }
}

export function withoutEntry(log: ActionLog, crewId: string, day: number): ActionLog {
  const key = actionKey(crewId, day)
  if (!(key in log)) return log
  const { [key]: _removed, ...rest } = log
  return rest
}

