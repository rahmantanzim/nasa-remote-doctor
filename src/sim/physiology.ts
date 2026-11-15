// Physiology models (SPEC.md §7). One small, pure function per model.
//
// No noise lives here. These functions give the *expected* body state for a
// day. simulate.ts adds seeded day-to-day variation on top.
// Every rate is a named constant with its source, or "assumption".

import type { Baseline, MissionEvent } from '../types'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Average Gregorian month length, days. */
export const DAYS_PER_MONTH = 30.44

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

export const clamp01 = (x: number): number => clamp(x, 0, 1)

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x))

/** Move `prev` one day toward `target` with time constant `tauDays`. */
export function approach(prev: number, target: number, tauDays: number): number {
  return prev + (target - prev) * (1 - Math.exp(-1 / tauDays))
}

/**
 * How unloaded the body is: 1 = weightless, 0 = Earth gravity.
 * Assumption: effects scale linearly with missing gravity (0.38 g Mars → 0.62).
 * Partial-gravity dose–response is an open HRP research question.
 */
export function unloading(gravityG: number): number {
  return clamp01(1 - gravityG)
}

/** Share of the prescribed exercise done today, 0 … 1. */
export function exerciseFraction(minutes: number, targetMinutes: number): number {
  return clamp01(minutes / targetMinutes)
}

// ---------------------------------------------------------------------------
// Bone density
// ---------------------------------------------------------------------------

/** CSA infographic: weight-bearing bones lose up to ~1–1.5% per month. */
export const BONE_LOSS_MAX_PERCENT_PER_MONTH = 1.5

/**
 * Share of bone loss that a full exercise programme prevents.
 * Assumption. Direction: crews using the ARED resistance device kept much
 * more hip/spine BMD than earlier crews (Smith et al., JBMR 2012).
 */
export const BONE_EXERCISE_PROTECTION = 0.7

/** Bone loss rate today, % of current density per month. */
export function boneLossPercentPerMonth(exFrac: number, unload: number): number {
  return BONE_LOSS_MAX_PERCENT_PER_MONTH * unload * (1 - BONE_EXERCISE_PROTECTION * exFrac)
}

/** Hip bone density after one more day, g/cm². */
export function boneStep(prevDensity: number, exFrac: number, unload: number): number {
  const dailyFraction = boneLossPercentPerMonth(exFrac, unload) / 100 / DAYS_PER_MONTH
  return prevDensity * (1 - dailyFraction)
}

// ---------------------------------------------------------------------------
// Muscle strength
// ---------------------------------------------------------------------------

/**
 * Leg strength lost per day with no exercise in weightlessness, % points.
 * Assumption, tuned for demo (SPEC §7): ≈4.5%/month untreated, in line with
 * the ~20% knee-strength losses reported after long flights without good
 * countermeasures.
 */
export const MUSCLE_LOSS_PERCENT_PER_DAY = 0.15

/** Share of that loss that full exercise prevents. Assumption. */
export const MUSCLE_EXERCISE_PROTECTION = 0.85

/**
 * Daily regain toward 100% with full exercise, as a fraction of the gap.
 * Assumption: 0.5%/day of the gap (slow rebuild, weeks to months).
 */
export const MUSCLE_REGAIN_RATE = 0.005

/** Leg strength index after one more day, % of pre-flight. */
export function muscleStep(prevStrength: number, exFrac: number, unload: number): number {
  const loss = MUSCLE_LOSS_PERCENT_PER_DAY * unload * (1 - MUSCLE_EXERCISE_PROTECTION * exFrac)
  const regain = MUSCLE_REGAIN_RATE * exFrac * Math.max(0, 100 - prevStrength)
  return clamp(prevStrength - loss + regain, 0, 100)
}

// ---------------------------------------------------------------------------
// Fluid shift / SANS
// ---------------------------------------------------------------------------

/**
 * Daily rise of the headward fluid-shift load (SANS score) in weightlessness.
 * Assumption, tuned so an unprotected crew member shows signs after
 * ~4 months. NASA HRP SANS risk: optic disc oedema and near-vision changes
 * develop over months of flight.
 */
export const SANS_RISE_PER_DAY = 0.5

/** Slow daily clearance of the load, fraction of score. Assumption. */
export const SANS_CLEARANCE_PER_DAY = 0.002

/**
 * Max reduction of the daily rise from thigh cuffs, at THIGH_CUFF_FULL_HOURS.
 * Assumption. Source idea: NASA HRP Thigh Cuff study — venoconstrictive cuffs
 * keep fluid in the legs and reduce headward shift.
 */
export const THIGH_CUFF_MAX_EFFECT = 0.6
/** Cuff hours per day that give the full effect. Assumption. */
export const THIGH_CUFF_FULL_HOURS = 4

/** SANS score after one more day, 0 … 100. */
export function sansStep(prevScore: number, cuffHours: number, unload: number): number {
  const cuffEffect = THIGH_CUFF_MAX_EFFECT * clamp01(cuffHours / THIGH_CUFF_FULL_HOURS)
  const rise = SANS_RISE_PER_DAY * unload * (1 - cuffEffect)
  return clamp(prevScore + rise - SANS_CLEARANCE_PER_DAY * prevScore, 0, 100)
}

/** SANS score where near-vision symptoms become likely. Assumption. */
export const SANS_SYMPTOM_ONSET = 56
/** How sharply symptoms switch on around the onset, score points. Assumption. */
export const SANS_SYMPTOM_SPREAD = 2.5
/** Max daily chance of noticing blurry near vision. Assumption. */
export const SANS_BLURRY_MAX_PROBABILITY = 0.7
/** Max daily chance of a SANS-related headache. Assumption. */
export const SANS_HEADACHE_MAX_PROBABILITY = 0.5

/** 0 … 1: how strongly the SANS score is producing symptoms. */
export function sansSymptomLevel(sansScore: number): number {
  return sigmoid((sansScore - SANS_SYMPTOM_ONSET) / SANS_SYMPTOM_SPREAD)
}

// ---------------------------------------------------------------------------
// Sleep debt
// ---------------------------------------------------------------------------

/**
 * Sleep debt counts the last 14 nights. Van Dongen et al., Sleep 2003:
 * deficits from chronic restriction add up almost linearly over 14 days.
 */
export const SLEEP_DEBT_WINDOW_NIGHTS = 14

/**
 * Debt treated as "fully loaded" for mood, heart and immune effects, hours.
 * Van Dongen 2003: 14 nights of 6 h (≈28 h debt) impaired people about as much
 * as 1–2 nights of total sleep loss. 35 h = a bit beyond that. Assumption.
 */
export const SLEEP_DEBT_FULL_LOAD_HOURS = 35

/** Rolling sleep debt from recent nights (oldest first), hours, ≥ 0. */
export function sleepDebt(recentNightsHours: number[], needHours: number): number {
  const window = recentNightsHours.slice(-SLEEP_DEBT_WINDOW_NIGHTS)
  const debt = window.reduce((sum, h) => sum + (needHours - h), 0)
  return Math.max(0, debt)
}

/** 0 … 1: how heavy the sleep debt is. */
export function sleepLoad(debtHours: number): number {
  return clamp01(debtHours / SLEEP_DEBT_FULL_LOAD_HOURS)
}

// ---------------------------------------------------------------------------
// Mood / stress
// ---------------------------------------------------------------------------

/** Steady isolation load reached after months away. Assumption. */
export const ISOLATION_LOAD_MAX = 0.4
/** How fast isolation load builds, days. Assumption. */
export const ISOLATION_TAU_DAYS = 60
/**
 * "Third-quarter phenomenon": morale tends to dip just past mission midpoint
 * (Bechtel & Berning 1991, Antarctic and analogue crews; still debated).
 * Peak at 62.5% of the mission, width 10% of the mission. Assumption.
 */
export const THIRD_QUARTER_AMPLITUDE = 0.25
export const THIRD_QUARTER_PEAK = 0.625
export const THIRD_QUARTER_WIDTH = 0.1
/** Weights of isolation vs sleep debt in stress. Assumption. */
export const STRESS_ISOLATION_WEIGHT = 0.35
export const STRESS_SLEEP_WEIGHT = 0.65
/** Mood points (1–5 scale) lost at full stress. Assumption. */
export const MOOD_DROP_AT_FULL_STRESS = 1.5

/** 0 … 1: isolation and confinement load on this mission day. */
export function isolationLoad(day: number, landingDay: number): number {
  const ramp = ISOLATION_LOAD_MAX * (1 - Math.exp(-day / ISOLATION_TAU_DAYS))
  const z = (day / landingDay - THIRD_QUARTER_PEAK) / THIRD_QUARTER_WIDTH
  const thirdQuarter = THIRD_QUARTER_AMPLITUDE * Math.exp(-(z * z) / 2)
  return clamp01(ramp + thirdQuarter)
}

/** 0 … 1 stress index. NASA HRP behavioural-health risk: isolation + poor sleep. */
export function stressLevel(isolation: number, sleepLoadValue: number): number {
  return clamp01(STRESS_ISOLATION_WEIGHT * isolation + STRESS_SLEEP_WEIGHT * sleepLoadValue)
}

/** Expected self-rated mood (1 … 5) before day-to-day variation. */
export function moodMean(baselineMood: number, stress: number): number {
  return baselineMood - MOOD_DROP_AT_FULL_STRESS * stress
}

// ---------------------------------------------------------------------------
// Heart & vessels
// ---------------------------------------------------------------------------

/** Cardiovascular deconditioning builds/fades over ~3 weeks. Assumption. */
export const CARDIO_TAU_DAYS = 21
/** Share of deconditioning that full exercise prevents. Assumption. */
export const CARDIO_EXERCISE_PROTECTION = 0.85
/** Resting HR rise at full deconditioning, bpm. Assumption. */
export const HR_RISE_AT_FULL_DECONDITIONING = 10
/** Resting HR rise at full sleep load, bpm. Assumption (sleep loss raises HR). */
export const HR_RISE_AT_FULL_SLEEP_LOAD = 4
/** Resting HR rise at full stress, bpm. Assumption. */
export const HR_RISE_AT_FULL_STRESS = 3
/**
 * In-flight BP drop after fluid redistribution. Norsk et al., J Physiol 2015:
 * 24-h mean arterial pressure on the ISS ≈ 8 mmHg lower than on the ground.
 * Split systolic 8 / diastolic 5: assumption.
 */
export const BP_MICROGRAVITY_DROP_SYSTOLIC = 8
export const BP_MICROGRAVITY_DROP_DIASTOLIC = 5
/** Days for BP to settle after launch. Assumption. */
export const BP_ADAPTATION_TAU_DAYS = 7
/** BP rise at full sleep load, mmHg. Assumption (sleep restriction raises BP). */
export const BP_RISE_AT_FULL_SLEEP_LOAD_SYSTOLIC = 5
export const BP_RISE_AT_FULL_SLEEP_LOAD_DIASTOLIC = 3
/**
 * Landing-day orthostatic risk index. NASA HRP cardiovascular risk:
 * many long-duration crew feel faint on standing after landing; worse with
 * deconditioning. Weights are assumptions.
 */
export const ORTHOSTATIC_FROM_TIME = 0.25
export const ORTHOSTATIC_TIME_TAU_DAYS = 30
export const ORTHOSTATIC_FROM_DECONDITIONING = 0.6

/** Deconditioning index after one more day, 0 … 1. */
export function cardioStep(prev: number, exFrac: number, unload: number): number {
  const target = unload * (1 - CARDIO_EXERCISE_PROTECTION * exFrac)
  return clamp01(approach(prev, target, CARDIO_TAU_DAYS))
}

/** 0 … 1 risk index of fainting on standing if landing happened now. */
export function orthostaticRisk(deconditioning: number, day: number, unload: number): number {
  const time = ORTHOSTATIC_FROM_TIME * (1 - Math.exp(-day / ORTHOSTATIC_TIME_TAU_DAYS))
  return clamp01(unload * time + ORTHOSTATIC_FROM_DECONDITIONING * deconditioning)
}

/** Expected morning HR and BP before day-to-day variation. */
export function heartMeans(
  baseline: Baseline,
  s: { deconditioning: number; sleepLoad: number; stress: number; day: number; unload: number },
): { heartRate: number; systolicBP: number; diastolicBP: number } {
  const settled = s.unload * (1 - Math.exp(-s.day / BP_ADAPTATION_TAU_DAYS))
  return {
    heartRate:
      baseline.restingHeartRate +
      HR_RISE_AT_FULL_DECONDITIONING * s.deconditioning +
      HR_RISE_AT_FULL_SLEEP_LOAD * s.sleepLoad +
      HR_RISE_AT_FULL_STRESS * s.stress,
    systolicBP:
      baseline.systolicBP -
      BP_MICROGRAVITY_DROP_SYSTOLIC * settled +
      BP_RISE_AT_FULL_SLEEP_LOAD_SYSTOLIC * s.sleepLoad,
    diastolicBP:
      baseline.diastolicBP -
      BP_MICROGRAVITY_DROP_DIASTOLIC * settled +
      BP_RISE_AT_FULL_SLEEP_LOAD_DIASTOLIC * s.sleepLoad,
  }
}

// ---------------------------------------------------------------------------
// Immune
// ---------------------------------------------------------------------------

/**
 * Baseline immune strain from spaceflight itself. Crucian et al., Front.
 * Immunol. 2018: immune dysregulation persists through long flights.
 * Weights are assumptions.
 */
export const IMMUNE_FROM_SPACEFLIGHT = 0.2
export const IMMUNE_FROM_STRESS = 0.4
export const IMMUNE_FROM_SLEEP = 0.4

/** Daily symptom chances. Base rates are assumptions. */
export const RASH_BASE_PROBABILITY = 0.005
/** Extra rash chance at full immune stress (rashes/hypersensitivity are among
 *  the most common ISS medical events — Crucian 2016). Assumption. */
export const RASH_AT_FULL_IMMUNE_STRESS = 0.08
export const FATIGUE_BASE_PROBABILITY = 0.03
export const FATIGUE_AT_FULL_SLEEP_LOAD = 0.6

/**
 * "Space fever": resting core temperature rose ~1 °C over 2.5 months on the
 * ISS (Stahn et al., Sci Rep 2017). Check-in uses a mouth/skin thermometer,
 * which reads less of that rise — modelled as 0.3 °C. Assumption.
 */
export const SPACE_TEMP_RISE_C = 0.3
export const SPACE_TEMP_TAU_DAYS = 30
/** Extra temperature at full immune stress, °C. Assumption (low-grade). */
export const TEMP_RISE_AT_FULL_IMMUNE_STRESS = 0.15

/** 0 … 1 immune strain index. */
export function immuneStress(stress: number, sleepLoadValue: number, unload: number): number {
  return clamp01(
    IMMUNE_FROM_SPACEFLIGHT * unload + IMMUNE_FROM_STRESS * stress + IMMUNE_FROM_SLEEP * sleepLoadValue,
  )
}

/** Expected body temperature before day-to-day variation, °C. */
export function bodyTempMean(baselineTemp: number, day: number, unload: number, immune: number): number {
  const adaptation = SPACE_TEMP_RISE_C * unload * (1 - Math.exp(-day / SPACE_TEMP_TAU_DAYS))
  return baselineTemp + adaptation + TEMP_RISE_AT_FULL_IMMUNE_STRESS * immune
}

// ---------------------------------------------------------------------------
// Metabolism
// ---------------------------------------------------------------------------

/** Insulin resistance builds within days of inactivity (bed-rest studies). Assumption: ~10 days. */
export const INSULIN_RESISTANCE_TAU_DAYS = 10
/** Share of insulin resistance that full exercise prevents. Assumption. */
export const INSULIN_EXERCISE_PROTECTION = 0.85
/** Fasting glucose rise at full insulin resistance, mg/dL. Assumption (modest, bed-rest scale). */
export const GLUCOSE_RISE_AT_FULL_RESISTANCE = 8
/** Fasting glucose rise at full sleep load, mg/dL. Assumption (Spiegel et al., Lancet 1999: sleep debt impairs glucose tolerance). */
export const GLUCOSE_RISE_AT_FULL_SLEEP_LOAD = 3

/** Insulin resistance after one more day, 0 … 1. CSA infographic: insulin resistance. */
export function insulinResistanceStep(prev: number, exFrac: number, unload: number): number {
  const target = unload * (1 - INSULIN_EXERCISE_PROTECTION * exFrac)
  return clamp01(approach(prev, target, INSULIN_RESISTANCE_TAU_DAYS))
}

/** Expected fasting glucose before day-to-day variation, mg/dL. */
export function glucoseMean(baselineGlucose: number, resistance: number, sleepLoadValue: number): number {
  return (
    baselineGlucose +
    GLUCOSE_RISE_AT_FULL_RESISTANCE * resistance +
    GLUCOSE_RISE_AT_FULL_SLEEP_LOAD * sleepLoadValue
  )
}

// ---------------------------------------------------------------------------
// Radiation
// ---------------------------------------------------------------------------

/** CSA "Monitoring radiation": ~30% of ISS crew dose is from neutrons. */
export const NEUTRON_FRACTION = 0.3

/** Galactic-ray dose varies little day to day: SD as a fraction of rate. Assumption. */
export const DAILY_DOSE_VARIATION_SD = 0.03

/**
 * Extra dose today from mission events (e.g. a solar particle event), mSv.
 * Event doses are given for open deep space; `exposure` scales them for the
 * environment (Environment.solarEventExposure).
 */
export function eventDose(day: number, events: MissionEvent[], sheltered: boolean, exposure = 1): number {
  return (
    exposure *
    events
      .filter((e) => e.day === day)
      .reduce((sum, e) => sum + (sheltered ? e.doseShelteredMSv : e.doseUnshelteredMSv), 0)
  )
}

// ---------------------------------------------------------------------------
// Early mission: space motion sickness
// ---------------------------------------------------------------------------

/**
 * Space motion sickness hits most new flyers in the first 2–3 days
 * (NASA: ~60–70% of crew). Daily chances on day 1, fading over SMS_TAU_DAYS.
 * Values: assumption.
 */
export const SMS_NAUSEA_DAY1_PROBABILITY = 0.6
export const SMS_DIZZINESS_DAY1_PROBABILITY = 0.5
export const SMS_HEADACHE_DAY1_PROBABILITY = 0.4
export const SMS_TAU_DAYS = 1.5
/** Later-mission base rates. Assumption. */
export const NAUSEA_BASE_PROBABILITY = 0.01
export const DIZZINESS_BASE_PROBABILITY = 0.01
/** Headaches are common in flight (Vein et al., Cephalalgia 2009). Base: assumption. */
export const HEADACHE_BASE_PROBABILITY = 0.03
/** Extra headache chance at full sleep load. Assumption. */
export const HEADACHE_AT_FULL_SLEEP_LOAD = 0.2

/** 0 … 1: how strong space motion sickness is on this day (1 on Day 1). */
export function motionSicknessLevel(day: number, unload: number): number {
  return unload * Math.exp(-(day - 1) / SMS_TAU_DAYS)
}

/** Daily chance of each symptom from the current body state. */
export function symptomProbabilities(s: {
  sansScore: number
  sleepLoad: number
  immuneStress: number
  day: number
  unload: number
}): Record<'headache' | 'blurryNearVision' | 'rash' | 'dizziness' | 'nausea' | 'fatigue', number> {
  const sans = sansSymptomLevel(s.sansScore)
  const sms = motionSicknessLevel(s.day, s.unload)
  return {
    headache: clamp01(
      HEADACHE_BASE_PROBABILITY +
        SANS_HEADACHE_MAX_PROBABILITY * sans +
        HEADACHE_AT_FULL_SLEEP_LOAD * s.sleepLoad ** 2 +
        SMS_HEADACHE_DAY1_PROBABILITY * sms,
    ),
    blurryNearVision: SANS_BLURRY_MAX_PROBABILITY * sans,
    rash: clamp01(RASH_BASE_PROBABILITY + RASH_AT_FULL_IMMUNE_STRESS * s.immuneStress ** 2),
    dizziness: clamp01(DIZZINESS_BASE_PROBABILITY + SMS_DIZZINESS_DAY1_PROBABILITY * sms),
    nausea: clamp01(NAUSEA_BASE_PROBABILITY + SMS_NAUSEA_DAY1_PROBABILITY * sms),
    fatigue: clamp01(FATIGUE_BASE_PROBABILITY + FATIGUE_AT_FULL_SLEEP_LOAD * s.sleepLoad ** 2),
  }
}
