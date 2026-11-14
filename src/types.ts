// Data shapes for Remote Doctor (SPEC.md section 8).
// Types only — no values live here. Values live in src/data/ with sources.

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

/** NASA HRP's 5 hazards of human spaceflight (https://www.nasa.gov/hrp/hazards). */
export type HazardId =
  | 'radiation'
  | 'isolation' // isolation and confinement
  | 'distance' // distance from Earth
  | 'gravity' // altered gravity fields
  | 'environment' // hostile / closed environments

export type BodyPartId =
  | 'brain'
  | 'eyes'
  | 'heart'
  | 'immune'
  | 'muscles'
  | 'bones'
  | 'sleep'
  | 'metabolism'
  | 'radiation'

/** Forecast words (SPEC F4) — used instead of bare red/yellow/green. */
export type ForecastStatus = 'steady' | 'drifting' | 'declining' | 'recovering'

export type Trend = 'improving' | 'stable' | 'worsening'

/**
 * Escalation levels (SPEC F5).
 * 1 Self-care · 2 Crew Medical Officer · 3 Flight Surgeon (queued) · 4 Urgent protocol
 */
export type EscalationLevel = 1 | 2 | 3 | 4

export type EnvironmentId = 'leo' | 'moon-base' | 'mars-transit' | 'mars-base'

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

/** A person's own "normal" — the engine compares against this, not population limits. */
export interface Baseline {
  restingHeartRate: number // beats per minute
  systolicBP: number // mmHg
  diastolicBP: number // mmHg
  fastingGlucose: number // mg/dL
  bodyTemp: number // °C
  sleepNeedHours: number // hours of sleep this person needs per night
  mood: number // 1 (very low) … 5 (very good), self-reported
  exerciseTargetMinutes: number // prescribed exercise per day
  hipBoneDensity: number // g/cm² (areal BMD, DXA-style), pre-flight
  strengthIndex: number // % of pre-flight leg strength (pre-flight = 100)
}

/** Habits that drive the simulation and the demo story. */
export interface CrewBehaviour {
  /** Average exercise minutes per day over the mission so far. */
  usualExerciseMinutes: number
  /** Average exercise minutes per day over the most recent days. */
  recentExerciseMinutes: number
  /** How many recent days `recentExerciseMinutes` covers. */
  recentDays: number
  /** Average sleep hours per night over the mission so far. */
  usualSleepHours: number
  /** Average sleep hours per night over the most recent days. */
  recentSleepHours: number
  /** Hours per day wearing thigh cuffs (SANS countermeasure). */
  thighCuffHoursPerDay: number
  /** Was this person in the storm shelter during the solar particle event? */
  shelteredDuringSPE: boolean
}

export interface CrewMember {
  id: string
  name: string
  role: string
  baseline: Baseline
  behaviour: CrewBehaviour
  /** Seed for deterministic noise — same seed = same data every run. */
  seed: number
  /** One sentence for the demo / pitch. */
  demoStory: string
}

// ---------------------------------------------------------------------------
// Environment + mission
// ---------------------------------------------------------------------------

export interface SyncWindow {
  /** Ship time (UTC), "HH:MM". */
  start: string
  durationMinutes: number
}

export interface Environment {
  id: EnvironmentId
  name: string
  /** One-way light-time delay to Earth, in minutes. */
  delayMinutes: { min: number; max: number; demo: number }
  /** Gravity in multiples of Earth gravity (1 g = 9.81 m/s²). */
  gravityG: number
  /** Background radiation dose rate, mSv per day (approx.). */
  radiationMSvPerDay: number
  /** Daily windows when the link to Earth is open. */
  syncWindows: SyncWindow[]
}

/** Solar particle event: a short burst of extra radiation. */
export interface SolarParticleEvent {
  kind: 'solar-particle-event'
  day: number
  /** Extra dose for crew inside the storm shelter, mSv. */
  doseShelteredMSv: number
  /** Extra dose for crew outside the storm shelter, mSv. */
  doseUnshelteredMSv: number
}

export type MissionEvent = SolarParticleEvent

export interface Mission {
  environment: EnvironmentId
  currentDay: number
  landingDay: number
  delayMinutes: number
  syncWindows: SyncWindow[]
  /** Ship clock for the demo, "HH:MM". */
  shipTime: string
  events: MissionEvent[]
}

// ---------------------------------------------------------------------------
// Daily data
// ---------------------------------------------------------------------------

/** The 6 NASA-suggested indicators (SPEC F3). */
export interface Indicators {
  heartRate: number // bpm, resting, morning
  systolicBP: number // mmHg
  diastolicBP: number // mmHg
  glucose: number // mg/dL, fasting
  bodyTemp: number // °C
  sleepHours: number // last night
  mood: number // 1 … 5
}

export interface Symptoms {
  headache: boolean
  blurryNearVision: boolean // SANS sign
  rash: boolean
  dizziness: boolean
  nausea: boolean
  fatigue: boolean
}

export interface Countermeasures {
  thighCuffHours: number
  resistanceExercise: boolean
}

export interface DailyRecord {
  day: number
  indicators: Indicators
  symptoms: Symptoms
  /** Exercise minutes on this day. */
  exerciseMinutes: number
  countermeasures: Countermeasures
  /** Radiation dose received on this day, mSv. */
  radiationDose: number
  /** Hidden body state from the physiology models (src/sim/) for this day. */
  model: ModelState
  /** 'sim' = generated by the model, 'checkin' = confirmed/edited by the astronaut. */
  source: 'sim' | 'checkin'
}

/**
 * Body state that sensors can't read directly each morning, produced by the
 * physiology models (SPEC.md §7). The engine uses it for trends + forecasts.
 */
export interface ModelState {
  hipBoneDensity: number // g/cm²
  boneLossPercent: number // % lost since pre-flight
  strengthIndex: number // % of pre-flight leg strength
  sansScore: number // 0 … 100 headward fluid-shift load index (model index)
  sleepDebtHours: number // rolling 14-night sleep debt, hours
  cardioDeconditioning: number // 0 (fit) … 1 (fully deconditioned)
  orthostaticRisk: number // 0 … 1 index: risk of fainting on standing at landing
  insulinResistance: number // 0 … 1 index
  stress: number // 0 … 1 index (isolation + sleep debt)
  immuneStress: number // 0 … 1 index (stress + sleep debt + spaceflight)
  cumulativeDoseMSv: number // total radiation dose since Day 1, mSv
}

// ---------------------------------------------------------------------------
// Body map
// ---------------------------------------------------------------------------

/** Static description of a body part (SPEC F2). */
export interface BodyPartInfo {
  id: BodyPartId
  name: string
  /** Short label for the Body Map. */
  shortName: string
  /** One simple sentence. */
  whatItDoes: string
  mainRisk: string
  hazards: HazardId[]
  /** Which indicators feed this body part. */
  indicators: string[]
  /** How it is measured in space, in simple words. */
  howMeasured: string
}

/** Engine output for one body part on one day. */
export interface BodyPartStatus {
  part: BodyPartId
  status: ForecastStatus
  trend: Trend
  /** The trend in plain words, e.g. "Sleep debt rising" or "Stable". */
  trendLabel: string
  reason: string
  hazard: HazardId
  landingDayForecast: string
  escalationLevel: EscalationLevel
  /** Why this level, in simple words. */
  escalationReason: string
}

// ---------------------------------------------------------------------------
// Actions + reports
// ---------------------------------------------------------------------------

export interface Action {
  title: string
  why: string
  how: string[]
  escalationLevel: EscalationLevel
  /** Steps to follow without Earth (required for level 4). */
  offlineProtocol?: string[]
}

export type QueueState = 'queued' | 'sent' | 'replied'

export interface ReportSection {
  title: string
  lines: string[]
}

export interface ReportReply {
  from: string
  text: string
  /** Ship time the reply arrived, ISO string. */
  receivedAt: string
}

export interface EarthReport {
  id: string
  crewId: string
  type: 'daily' | 'weekly'
  /** ISO string. */
  createdAt: string
  /** "What the doctor should look at first." */
  summaryFirstLine: string
  sections: ReportSection[]
  queueState: QueueState
  reply?: ReportReply
}
