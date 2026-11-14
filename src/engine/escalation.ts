// Escalation level for each body part (SPEC.md F5).
//
//   1 Self-care · 2 Crew Medical Officer · 3 Flight Surgeon (queued) · 4 Urgent protocol
//
// Rules always use context: the person's own normal, multi-day windows, and
// combinations of signs. No single reading can raise a level on its own.
// Expected space changes (warmer body, lower blood pressure) are built into
// the person's "space normal" in signals.ts, so they never count as problems.
//
// One deliberate exception: a solar particle event happening TODAY is
// Level 4. That is a measured radiation exposure, not a noisy body reading,
// and sheltering cannot wait for a trend.

import * as P from '../sim/physiology'
import type { BodyPartId, BodyPartStatus, EscalationLevel } from '../types'
import {
  BONE_LANDING_HIGH_PERCENT,
  CAREER_DOSE_LIMIT_MSV,
  EXTRA_DOSE_REPORT_MSV,
  EXTRA_DOSE_WATCH_MSV,
  GLUCOSE_ABOVE_NORMAL,
  HR_RISE_HIGH,
  ORTHOSTATIC_HIGH,
  SLEEP_DEBT_HIGH_HOURS,
  STRENGTH_LANDING_LOW,
  forecastAll,
} from './forecast'
import { type CrewSignals, stateDaysAgo, symptomDays } from './signals'

export interface Escalation {
  level: EscalationLevel
  reason: string
}

// ---------------------------------------------------------------------------
// Thresholds (all assumptions unless noted)
// ---------------------------------------------------------------------------

/** Exercise below this share of target for a whole week = "not exercising". Assumption. */
const LOW_EXERCISE_FRACTION = 0.5
/** Sleep debt where severe restriction needs Earth input on the schedule, hours. Assumption. */
const SLEEP_DEBT_SEVERE_HOURS = P.SLEEP_DEBT_FULL_LOAD_HOURS
/** Bone loss on landing day that needs the flight surgeon's landing plan, %. Assumption. */
const BONE_LANDING_REPORT_PERCENT = 8
/** Strength on landing day that needs the flight surgeon's landing plan, %. Assumption. */
const STRENGTH_LANDING_REPORT = 82
/** Resting HR rise (weekly mean) that needs Earth, bpm. Assumption. */
const HR_RISE_REPORT = 15
/** ADA: fasting glucose ≥ 126 mg/dL = diabetes range. */
const GLUCOSE_DIABETES_RANGE = 126
/** Immune strain index for the "viral reactivation" pattern. Assumption. */
const IMMUNE_STRAIN_HIGH = 0.7
/** Stress index that, with low mood, needs a CMO talk. Assumption. */
const STRESS_HIGH = 0.7
/** Extra dose today that means a solar event is happening now, mSv. Assumption (~3 days of travel dose in one day). */
const ACTIVE_EVENT_MSV = EXTRA_DOSE_WATCH_MSV

const SELF_CARE: Escalation = { level: 1, reason: 'You can handle this yourself. Follow the steps.' }

const lowExercise = (s: CrewSignals) =>
  s.recent.exerciseMinutes < LOW_EXERCISE_FRACTION * s.crew.baseline.exerciseTargetMinutes

// ---------------------------------------------------------------------------
// Rules per body part (checked from highest level down)
// ---------------------------------------------------------------------------

function eyes(s: CrewSignals): Escalation {
  const blurry = symptomDays(s, 'blurryNearVision')
  const headache = symptomDays(s, 'headache')
  const cuffsInUse = s.recent.thighCuffHours >= 0.75 * P.THIGH_CUFF_FULL_HOURS
  if (s.symptomsRecent.blurryNearVision >= 2 && s.symptomsPrior.blurryNearVision >= 2 && cuffsInUse)
    return {
      level: 3,
      reason: 'Blurry near vision for 2 weeks in a row, even with thigh cuffs. The flight surgeon should review an eye scan.',
    }
  if ((blurry >= 2 && headache >= 2) || blurry >= 3)
    return {
      level: 2,
      reason: `Two SANS signs together over 2 weeks (blurry near vision ${blurry} days, headache ${headache} days). A crewmate should check your eyes today.`,
    }
  return SELF_CARE
}

function sleep(s: CrewSignals): Escalation {
  const debt = s.now.sleepDebtHours
  const fatigue = symptomDays(s, 'fatigue')
  const headache = symptomDays(s, 'headache')
  if (debt >= SLEEP_DEBT_SEVERE_HOURS && debt - stateDaysAgo(s, 14).sleepDebtHours > 10 && fatigue >= 5)
    return {
      level: 3,
      reason: 'Severe sleep debt, still growing, with daily tiredness. Earth may need to change the work schedule.',
    }
  if (debt >= SLEEP_DEBT_HIGH_HOURS && (fatigue >= 3 || headache >= 3 || s.lowMoodDaysRecent >= 2))
    return {
      level: 2,
      reason: `Large sleep debt (${Math.round(debt)} h) plus tiredness or headaches on several days. Ask a crewmate to help protect your sleep.`,
    }
  return SELF_CARE
}

function bones(s: CrewSignals): Escalation {
  const landing = s.landing.boneLossPercent
  if (landing >= BONE_LANDING_REPORT_PERCENT)
    return { level: 3, reason: 'Large bone loss expected by landing. The flight surgeon plans landing-day safety.' }
  if (landing >= BONE_LANDING_HIGH_PERCENT && lowExercise(s))
    return { level: 2, reason: 'Little exercise all week and bone loss is heading high for landing. Plan exercise with a crewmate.' }
  return SELF_CARE
}

function muscles(s: CrewSignals): Escalation {
  const landing = s.landing.strengthIndex
  if (landing < STRENGTH_LANDING_REPORT)
    return { level: 3, reason: 'Big strength loss expected by landing. The flight surgeon plans help for landing day.' }
  if (landing < STRENGTH_LANDING_LOW && lowExercise(s))
    return { level: 2, reason: 'Little exercise all week and strength is heading low for landing. Plan exercise with a crewmate.' }
  return SELF_CARE
}

function heart(s: CrewSignals): Escalation {
  const hrRise = s.recent.heartRate - s.expected.heartRate
  const dizzy = symptomDays(s, 'dizziness')
  if (hrRise >= HR_RISE_REPORT && dizzy >= 2)
    return { level: 3, reason: 'Resting heart rate well above your normal all week, with dizziness. The flight surgeon should review.' }
  if (hrRise >= HR_RISE_HIGH && (dizzy >= 2 || s.landing.orthostaticRisk >= ORTHOSTATIC_HIGH))
    return {
      level: 2,
      reason: 'Resting heart rate up all week and a high fainting risk for landing. A crewmate should check your heart rate and blood pressure.',
    }
  return SELF_CARE
}

function immune(s: CrewSignals): Escalation {
  const rash = symptomDays(s, 'rash')
  const fatigue = symptomDays(s, 'fatigue')
  if (s.feverDays >= 3 && s.feverWindowHasOtherSign)
    return { level: 3, reason: 'Temperature above your space normal 3 days in a row, with other signs. The flight surgeon should review.' }
  if (s.feverDays >= 2 && s.feverWindowHasOtherSign)
    return { level: 2, reason: 'Temperature above your space normal on 2 of 3 days, with other signs. This may be an infection.' }
  if (rash >= 2 && (fatigue >= 3 || s.now.immuneStress >= IMMUNE_STRAIN_HIGH))
    return {
      level: 2,
      reason: 'Rash on several days while run down. A sleeping virus may be waking up. A crewmate should look at it.',
    }
  return SELF_CARE
}

function metabolism(s: CrewSignals): Escalation {
  if (s.recent.glucose >= GLUCOSE_DIABETES_RANGE && s.prior.glucose >= GLUCOSE_DIABETES_RANGE)
    return { level: 3, reason: 'Fasting blood sugar in the diabetes range for 2 weeks. The flight surgeon should review.' }
  if (
    s.recent.glucose >= GLUCOSE_ABOVE_NORMAL &&
    s.prior.glucose >= GLUCOSE_ABOVE_NORMAL &&
    s.recent.glucose - s.expected.glucose >= 10
  )
    return { level: 2, reason: 'Fasting blood sugar above normal for 2 weeks. A crewmate should repeat the test with you.' }
  return SELF_CARE
}

function brain(s: CrewSignals): Escalation {
  if (s.lowMoodDaysRecent >= 5 && s.lowMoodDaysPrior >= 3)
    return { level: 3, reason: 'Low mood most days for 2 weeks. A private support call with Earth is booked at the next sync.' }
  if (s.lowMoodDaysRecent >= 3 && (s.now.sleepDebtHours >= SLEEP_DEBT_HIGH_HOURS || s.now.stress >= STRESS_HIGH))
    return { level: 2, reason: 'Low mood on several days, with high stress or sleep debt. Have a private talk with a crewmate.' }
  return SELF_CARE
}

function radiation(s: CrewSignals): Escalation {
  if (s.extraDoseTodayMSv >= ACTIVE_EVENT_MSV)
    return { level: 4, reason: 'A solar particle event is happening now. Shelter first — do not wait for Earth.' }
  const landingFraction = s.landing.cumulativeDoseMSv / CAREER_DOSE_LIMIT_MSV
  if (s.extraDoseMSv >= EXTRA_DOSE_REPORT_MSV || landingFraction >= 1)
    return {
      level: 3,
      reason: `Extra dose of about ${Math.round(s.extraDoseMSv)} mSv from the solar event. It goes in your dose record for the flight surgeon.`,
    }
  if (s.extraDoseMSv >= EXTRA_DOSE_WATCH_MSV || landingFraction >= 0.8)
    return { level: 2, reason: 'Some extra radiation dose. The medical officer logs it.' }
  return SELF_CARE
}

const RULES: Record<BodyPartId, (s: CrewSignals) => Escalation> = {
  brain,
  eyes,
  heart,
  immune,
  muscles,
  bones,
  sleep,
  metabolism,
  radiation,
}

export function escalate(part: BodyPartId, s: CrewSignals): Escalation {
  return RULES[part](s)
}

/** Forecast + escalation for all 9 body parts. */
export function assessBodyParts(s: CrewSignals): BodyPartStatus[] {
  return forecastAll(s).map((f) => {
    const e = escalate(f.part, s)
    return {
      part: f.part,
      status: f.status,
      trend: f.trend,
      trendLabel: f.trendLabel,
      reason: f.reason,
      hazard: f.hazard,
      landingDayForecast: f.landingDayForecast,
      escalationLevel: e.level,
      escalationReason: e.reason,
    }
  })
}
