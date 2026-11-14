// Engine entry point: crew history in → body-part statuses + today's ONE action out.

import { ENVIRONMENTS } from '../data/environments'
import type { Action, BodyPartId, BodyPartStatus, CrewMember, DailyRecord, Environment, Mission } from '../types'
import { chooseOneAction } from './actions'
import { assessBodyParts } from './escalation'
import { type CrewSignals, buildSignals } from './signals'

export interface EngineResult {
  signals: CrewSignals
  statuses: BodyPartStatus[]
  oneAction: Action
  /** Body part the One Action comes from (null = "keep your routine"). */
  oneActionPart: BodyPartId | null
}

export function runEngine(
  crew: CrewMember,
  history: DailyRecord[],
  mission: Mission,
  environment: Environment = ENVIRONMENTS[mission.environment],
): EngineResult {
  const signals = buildSignals(crew, history, mission, environment)
  const statuses = assessBodyParts(signals)
  const { action, part } = chooseOneAction(statuses, signals)
  return { signals, statuses, oneAction: action, oneActionPart: part }
}
