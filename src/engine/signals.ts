// Signals: everything the engine knows about one crew member today, computed
// once and shared by forecast, escalation and actions.
//
// Key idea: compare each person to THEIR OWN normal, adjusted for changes we
// expect in space (body runs a bit warmer, blood pressure a bit lower). Those
// expected changes come from the same constants the simulation uses, so the
// engine and the body model never disagree.

import type {
  CrewMember,
  DailyRecord,
  Environment,
  Mission,
  ModelState,
  Symptoms,
} from '../types'
import * as P from '../sim/physiology'

/** One week of readings smooths out day-to-day noise. Assumption. */
export const RECENT_DAYS = 7
/** Symptoms are counted over two weeks (same window as sleep debt). Assumption. */
export const SYMPTOM_WINDOW_DAYS = 14
/** Fever check looks at the last 3 mornings. Assumption. */
export const FEVER_WINDOW_DAYS = 3
/**
 * A temperature this far above your space-normal counts as a fever day.
 * Assumption: ~0.6 °C over personal normal is a meaningful rise; the classic
 * 38.0 °C fever line is ~1 °C above a typical 37 °C normal.
 */
export const FEVER_MARGIN_C = 0.6
/** Mood this many points below your normal counts as a low-mood day. Assumption. */
export const LOW_MOOD_DROP = 2

export type SymptomKey = keyof Symptoms
export type SymptomCounts = Record<SymptomKey, number>

/**
 * Typical values over a window of days.
 * Body readings (HR, BP, glucose, temperature, mood) use the MEDIAN, so one
 * odd morning cannot move the result — one bad day alone never escalates.
 * Behaviour (sleep, exercise, cuffs) uses the MEAN, because totals matter
 * for the body models (a short night really does add sleep debt).
 */
export interface WindowStats {
  heartRate: number
  systolicBP: number
  diastolicBP: number
  glucose: number
  bodyTemp: number
  sleepHours: number
  mood: number
  exerciseMinutes: number
  thighCuffHours: number
}

export interface CrewSignals {
  crew: CrewMember
  day: number
  landingDay: number
  daysToLanding: number
  unload: number
  backgroundDoseMSvPerDay: number
  history: DailyRecord[]
  today: DailyRecord
  now: ModelState
  /** Body state projected to landing day if this week's habits continue. */
  landing: ModelState
  /** Last RECENT_DAYS days. */
  recent: WindowStats
  /** The RECENT_DAYS days before that. */
  prior: WindowStats
  /** Personal normal, adjusted for expected space changes. */
  expected: {
    heartRate: number
    systolicBP: number
    diastolicBP: number
    glucose: number
    bodyTemp: number
  }
  /** Symptom days in the last RECENT_DAYS and the RECENT_DAYS before. */
  symptomsRecent: SymptomCounts
  symptomsPrior: SymptomCounts
  /** Fever days in the last FEVER_WINDOW_DAYS mornings. */
  feverDays: number
  /** Any rash / fatigue / headache / nausea in the fever window. */
  feverWindowHasOtherSign: boolean
  lowMoodDaysRecent: number
  lowMoodDaysPrior: number
  /** Radiation above normal background in the last SYMPTOM_WINDOW_DAYS, mSv. */
  extraDoseMSv: number
  /** Day of the biggest extra dose in that window (if any). */
  extraDoseDay: number | null
  /** Radiation above background today, mSv. */
  extraDoseTodayMSv: number
}

const SYMPTOM_KEYS: SymptomKey[] = ['headache', 'blurryNearVision', 'rash', 'dizziness', 'nausea', 'fatigue']

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

export function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function windowStats(records: DailyRecord[]): WindowStats {
  const md = (f: (r: DailyRecord) => number) => median(records.map(f))
  const m = (f: (r: DailyRecord) => number) => mean(records.map(f))
  return {
    heartRate: md((r) => r.indicators.heartRate),
    systolicBP: md((r) => r.indicators.systolicBP),
    diastolicBP: md((r) => r.indicators.diastolicBP),
    glucose: md((r) => r.indicators.glucose),
    bodyTemp: md((r) => r.indicators.bodyTemp),
    sleepHours: m((r) => r.indicators.sleepHours),
    mood: md((r) => r.indicators.mood),
    exerciseMinutes: m((r) => r.exerciseMinutes),
    thighCuffHours: m((r) => r.countermeasures.thighCuffHours),
  }
}

function countSymptoms(records: DailyRecord[]): SymptomCounts {
  const counts = Object.fromEntries(SYMPTOM_KEYS.map((k) => [k, 0])) as SymptomCounts
  for (const r of records) for (const k of SYMPTOM_KEYS) if (r.symptoms[k]) counts[k]++
  return counts
}

/** Model state `daysAgo` days before the last record (clamped to Day 1). */
export function stateDaysAgo(s: Pick<CrewSignals, 'history'>, daysAgo: number): ModelState {
  const i = Math.max(0, s.history.length - 1 - daysAgo)
  return s.history[i].model
}

/**
 * Project the body forward from the last record to landing day, assuming
 * this week's habits (exercise, sleep, thigh cuffs) stay the same.
 * Uses the same physiology models as the simulation, without noise.
 */
export function projectToLanding(
  crew: CrewMember,
  history: DailyRecord[],
  mission: Mission,
  environment: Environment,
  habits: Pick<WindowStats, 'exerciseMinutes' | 'sleepHours' | 'thighCuffHours'>,
): ModelState {
  const { baseline } = crew
  const unload = P.unloading(environment.gravityG)
  const nights = history.slice(-P.SLEEP_DEBT_WINDOW_NIGHTS).map((r) => r.indicators.sleepHours)
  const exFrac = P.exerciseFraction(habits.exerciseMinutes, baseline.exerciseTargetMinutes)
  let state = { ...history[history.length - 1].model }

  for (let day = history.length + 1; day <= mission.landingDay; day++) {
    nights.push(habits.sleepHours)
    const sleepDebtHours = P.sleepDebt(nights, baseline.sleepNeedHours)
    const sleepLoad = P.sleepLoad(sleepDebtHours)
    const stress = P.stressLevel(P.isolationLoad(day, mission.landingDay), sleepLoad)
    const hipBoneDensity = P.boneStep(state.hipBoneDensity, exFrac, unload)
    const cardioDeconditioning = P.cardioStep(state.cardioDeconditioning, exFrac, unload)
    state = {
      hipBoneDensity,
      boneLossPercent: (1 - hipBoneDensity / baseline.hipBoneDensity) * 100,
      strengthIndex: P.muscleStep(state.strengthIndex, exFrac, unload),
      sansScore: P.sansStep(state.sansScore, habits.thighCuffHours, unload),
      sleepDebtHours,
      cardioDeconditioning,
      orthostaticRisk: P.orthostaticRisk(cardioDeconditioning, day, unload),
      insulinResistance: P.insulinResistanceStep(state.insulinResistance, exFrac, unload),
      stress,
      immuneStress: P.immuneStress(stress, sleepLoad, unload),
      cumulativeDoseMSv: state.cumulativeDoseMSv + environment.radiationMSvPerDay,
    }
  }
  return state
}

/** Build the signals for one crew member from their history (Day 1 … today). */
export function buildSignals(
  crew: CrewMember,
  history: DailyRecord[],
  mission: Mission,
  environment: Environment,
): CrewSignals {
  if (history.length === 0) throw new Error(`No records for ${crew.id}`)
  const { baseline } = crew
  const today = history[history.length - 1]
  const day = today.day
  const unload = P.unloading(environment.gravityG)

  const recentRecords = history.slice(-RECENT_DAYS)
  const priorRecords = history.slice(-2 * RECENT_DAYS, -RECENT_DAYS)
  const recent = windowStats(recentRecords)
  // Early in the mission there is no prior week yet: compare with this week.
  const prior = priorRecords.length > 0 ? windowStats(priorRecords) : recent

  const spaceBP = P.heartMeans(baseline, { deconditioning: 0, sleepLoad: 0, stress: 0, day, unload })
  const expected = {
    heartRate: baseline.restingHeartRate,
    systolicBP: spaceBP.systolicBP,
    diastolicBP: spaceBP.diastolicBP,
    glucose: baseline.fastingGlucose,
    bodyTemp: P.bodyTempMean(baseline.bodyTemp, day, unload, 0),
  }

  const feverRecords = history.slice(-FEVER_WINDOW_DAYS)
  const feverDays = feverRecords.filter((r) => r.indicators.bodyTemp >= expected.bodyTemp + FEVER_MARGIN_C).length
  const feverWindowHasOtherSign = feverRecords.some(
    (r) => r.symptoms.rash || r.symptoms.fatigue || r.symptoms.headache || r.symptoms.nausea,
  )

  const lowMood = (rs: DailyRecord[]) => rs.filter((r) => r.indicators.mood <= baseline.mood - LOW_MOOD_DROP).length

  const background = environment.radiationMSvPerDay
  const doseWindow = history.slice(-SYMPTOM_WINDOW_DAYS)
  // Extra dose above background. Normal day-to-day wobble is ±3%, so only
  // count days clearly above background (> 1.5× rate) as event dose.
  const extraOf = (r: DailyRecord) => (r.radiationDose > 1.5 * background ? r.radiationDose - background : 0)
  const extraDoseMSv = doseWindow.reduce((sum, r) => sum + extraOf(r), 0)
  const biggest = doseWindow.reduce<DailyRecord | null>(
    (best, r) => (extraOf(r) > 0 && (best === null || extraOf(r) > extraOf(best)) ? r : best),
    null,
  )

  return {
    crew,
    day,
    landingDay: mission.landingDay,
    daysToLanding: Math.max(0, mission.landingDay - day),
    unload,
    backgroundDoseMSvPerDay: background,
    history,
    today,
    now: today.model,
    landing: projectToLanding(crew, history, mission, environment, recent),
    recent,
    prior,
    expected,
    symptomsRecent: countSymptoms(recentRecords),
    symptomsPrior: countSymptoms(priorRecords),
    feverDays,
    feverWindowHasOtherSign,
    lowMoodDaysRecent: lowMood(recentRecords),
    lowMoodDaysPrior: lowMood(priorRecords),
    extraDoseMSv,
    extraDoseDay: biggest?.day ?? null,
    extraDoseTodayMSv: extraOf(today),
  }
}

/** Symptom days over the full SYMPTOM_WINDOW_DAYS window. */
export function symptomDays(s: CrewSignals, key: SymptomKey): number {
  return s.symptomsRecent[key] + s.symptomsPrior[key]
}
