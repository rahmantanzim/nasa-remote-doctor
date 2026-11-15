// Engine entry point: crew history in → body-part statuses, actions,
// chart series and today's ONE action out. Components only read this.

import { ENVIRONMENTS } from '../data/environments'
import { simulateCrew } from '../sim/simulate'
import type {
  Action,
  BodyPartId,
  BodyPartStatus,
  CheckInsByDay,
  CrewMember,
  DailyRecord,
  EscalationLevel,
  Environment,
  Mission,
} from '../types'
import { actionFor, chooseOneAction, rankStatuses } from './actions'
import { assessBodyParts } from './escalation'
import { type TrendSeries, trendSeries } from './series'
import { type CrewSignals, type Habits, buildSignals } from './signals'

export interface EngineResult {
  signals: CrewSignals
  statuses: BodyPartStatus[]
  /** Statuses sorted most-urgent first. */
  ranked: BodyPartStatus[]
  /** Highest escalation level across the body. */
  topLevel: EscalationLevel
  /** Every body part Steady at Level 1 (One Action = "keep your routine"). */
  allSteady: boolean
  /** The action for each body part (detail panel). */
  actions: Record<BodyPartId, Action>
  /** Trend chart data for each body part. */
  series: Record<BodyPartId, TrendSeries>
  oneAction: Action
  /** Body part the One Action comes from (null = "keep your routine"). */
  oneActionPart: BodyPartId | null
}

export function runEngine(
  crew: CrewMember,
  history: DailyRecord[],
  mission: Mission,
  environment: Environment = ENVIRONMENTS[mission.environment],
  /** "What if" habits from today to landing (SPEC F10). Omit for real habits. */
  whatIfHabits?: Habits,
): EngineResult {
  const signals = buildSignals(crew, history, mission, environment, whatIfHabits)
  const statuses = assessBodyParts(signals)
  const ranked = rankStatuses(statuses)
  const { action, part } = chooseOneAction(statuses, signals)
  const byPart = <T,>(f: (st: BodyPartStatus) => T) =>
    Object.fromEntries(statuses.map((st) => [st.part, f(st)])) as Record<BodyPartId, T>
  return {
    signals,
    statuses,
    ranked,
    topLevel: ranked[0].escalationLevel,
    allSteady: part === null,
    actions: byPart((st) => actionFor(st, signals)),
    series: byPart((st) => trendSeries(st.part, signals)),
    oneAction: action,
    oneActionPart: part,
  }
}

/** Simulate a crew member's history (with their check-ins) and run the engine on it. */
export function evaluateCrew(
  crew: CrewMember,
  mission: Mission,
  environment: Environment = ENVIRONMENTS[mission.environment],
  checkIns: CheckInsByDay = {},
  whatIfHabits?: Habits,
): EngineResult {
  return runEngine(crew, simulateCrew(crew, mission, environment, checkIns), mission, environment, whatIfHabits)
}
