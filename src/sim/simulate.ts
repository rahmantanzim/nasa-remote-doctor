// Runs the physiology models day by day for one crew member (SPEC.md §7).
// Output: their DailyRecord history from Day 1 to the mission's current day.

import { ENVIRONMENTS } from '../data/environments'
import type { CheckInsByDay, CrewMember, DailyRecord, Environment, Mission, ModelState, Symptoms } from '../types'
import { chance, gaussian } from './noise'
import * as P from './physiology'

// Day-to-day variation (1 SD). These describe measurement + natural
// variation around the model's expected value.
/** Resting HR varies ~2–3 bpm day to day in healthy adults. Assumption. */
const HR_SD = 2.5
/** Home BP readings vary ~4–6 mmHg day to day. Assumption. */
const SYSTOLIC_SD = 5
const DIASTOLIC_SD = 4
/**
 * Systolic and diastolic readings rise and fall together day to day
 * (correlation ~0.6–0.7 in home BP series). Independent noise would allow
 * unrealistically narrow pulse pressures. Assumption: 0.65.
 */
const BP_NOISE_CORRELATION = 0.65
/** Fasting glucose day-to-day CV ≈ 4–5% (~4 mg/dL). Assumption. */
const GLUCOSE_SD = 4
/** Morning temperature varies ~0.1–0.2 °C. Assumption. */
const TEMP_SD = 0.12
/** Night-to-night sleep varies ~0.5 h. Assumption. */
const SLEEP_SD = 0.45
/** Self-rated mood wobble, 1–5 scale points. Assumption. */
const MOOD_SD = 0.4
/** Exercise minutes vary with the daily schedule. Assumption. */
const EXERCISE_SD = 12
/** Cuff wear varies by ±~0.5 h. Assumption. */
const CUFF_SD = 0.4

/** ISS plan: ~1 h resistance + ~1 h aerobic. Counted as a resistance day at ≥ 45 min. Assumption. */
const RESISTANCE_SESSION_MINUTES = 45

/** Physical limits for generated behaviour (not health thresholds). */
const MAX_SLEEP_HOURS = 11 // assumption: longest plausible night
const MAX_EXERCISE_MINUTES = 180 // assumption: longest plausible daily session
const MAX_CUFF_HOURS = 10 // assumption: cuffs are worn part of the day only

/** Round to a step like 0.1 or 0.5 without float artefacts (36.800000000000004). */
const round = (x: number, step: number): number => Number((Math.round(x / step) * step).toFixed(2))

/** Planned behaviour on a day: "usual" habits, or "recent" ones near the current day. */
function plannedBehaviour(crew: CrewMember, day: number, currentDay: number) {
  const b = crew.behaviour
  const recent = day > currentDay - b.recentDays
  return {
    exerciseMinutes: recent ? b.recentExerciseMinutes : b.usualExerciseMinutes,
    sleepHours: recent ? b.recentSleepHours : b.usualSleepHours,
    cuffHours: b.thighCuffHoursPerDay,
  }
}

function initialState(crew: CrewMember): ModelState {
  return {
    hipBoneDensity: crew.baseline.hipBoneDensity,
    boneLossPercent: 0,
    strengthIndex: crew.baseline.strengthIndex,
    sansScore: 0,
    sleepDebtHours: 0,
    cardioDeconditioning: 0,
    orthostaticRisk: 0,
    insulinResistance: 0,
    stress: 0,
    immuneStress: 0,
    cumulativeDoseMSv: 0,
  }
}

/**
 * Simulate one crew member from Day 1 to `mission.currentDay`.
 * Deterministic: same crew (seed + behaviour), mission and check-ins → same history.
 * `environment` defaults to the mission's environment preset.
 *
 * Morning check-ins (SPEC F3) replace simulated values and drive the models:
 *   check-in on day D → last night's sleep = day D sleep;
 *                       yesterday's exercise + thigh cuffs = day D-1 behaviour;
 *                       readings + symptoms = day D record (source 'checkin').
 */
export function simulateCrew(
  crew: CrewMember,
  mission: Mission,
  environment: Environment = ENVIRONMENTS[mission.environment],
  checkIns: CheckInsByDay = {},
): DailyRecord[] {
  const { seed, baseline } = crew
  const unload = P.unloading(environment.gravityG)
  const records: DailyRecord[] = []
  const nights: number[] = []
  let state = initialState(crew)

  for (let day = 1; day <= mission.currentDay; day++) {
    const n = (channel: string) => gaussian(seed, day, channel)
    const plan = plannedBehaviour(crew, day, mission.currentDay)

    const checkIn = checkIns[day]
    // Tomorrow's check-in reports what was done today (exercise, cuffs).
    const nextCheckIn = checkIns[day + 1]

    // Behaviour actually done today (check-in answer, else plan + schedule variation).
    const exerciseMinutes =
      nextCheckIn?.exerciseMinutesYesterday ??
      Math.round(P.clamp(plan.exerciseMinutes + EXERCISE_SD * n('exercise'), 0, MAX_EXERCISE_MINUTES))
    const sleepHours =
      checkIn?.indicators.sleepHours ??
      round(P.clamp(plan.sleepHours + SLEEP_SD * n('sleep'), 0, MAX_SLEEP_HOURS), 0.1)
    const thighCuffHours =
      nextCheckIn?.thighCuffHoursYesterday ??
      (plan.cuffHours > 0 ? round(P.clamp(plan.cuffHours + CUFF_SD * n('cuff'), 0, MAX_CUFF_HOURS), 0.5) : 0)
    nights.push(sleepHours)

    // Models.
    const exFrac = P.exerciseFraction(exerciseMinutes, baseline.exerciseTargetMinutes)
    const sleepDebtHours = P.sleepDebt(nights, baseline.sleepNeedHours)
    const sleepLoad = P.sleepLoad(sleepDebtHours)
    const stress = P.stressLevel(P.isolationLoad(day, mission.landingDay), sleepLoad)
    const hipBoneDensity = P.boneStep(state.hipBoneDensity, exFrac, unload)
    const strengthIndex = P.muscleStep(state.strengthIndex, exFrac, unload)
    const sansScore = P.sansStep(state.sansScore, thighCuffHours, unload)
    const cardioDeconditioning = P.cardioStep(state.cardioDeconditioning, exFrac, unload)
    const insulinResistance = P.insulinResistanceStep(state.insulinResistance, exFrac, unload)
    const immuneStress = P.immuneStress(stress, sleepLoad, unload)
    const radiationDose =
      environment.radiationMSvPerDay * (1 + P.DAILY_DOSE_VARIATION_SD * n('dose')) +
      P.eventDose(day, mission.events, crew.behaviour.shelteredDuringSPE)

    state = {
      hipBoneDensity,
      boneLossPercent: (1 - hipBoneDensity / baseline.hipBoneDensity) * 100,
      strengthIndex,
      sansScore,
      sleepDebtHours,
      cardioDeconditioning,
      orthostaticRisk: P.orthostaticRisk(cardioDeconditioning, day, unload),
      insulinResistance,
      stress,
      immuneStress,
      cumulativeDoseMSv: state.cumulativeDoseMSv + radiationDose,
    }

    // Morning indicators = model mean + day-to-day variation.
    const zSys = n('sys')
    const zDia = BP_NOISE_CORRELATION * zSys + Math.sqrt(1 - BP_NOISE_CORRELATION ** 2) * n('dia')
    const heart = P.heartMeans(baseline, { deconditioning: cardioDeconditioning, sleepLoad, stress, day, unload })
    const simulated = {
      heartRate: Math.round(heart.heartRate + HR_SD * n('hr')),
      systolicBP: Math.round(heart.systolicBP + SYSTOLIC_SD * zSys),
      diastolicBP: Math.round(heart.diastolicBP + DIASTOLIC_SD * zDia),
      glucose: Math.round(P.glucoseMean(baseline.fastingGlucose, insulinResistance, sleepLoad) + GLUCOSE_SD * n('glucose')),
      bodyTemp: round(P.bodyTempMean(baseline.bodyTemp, day, unload, immuneStress) + TEMP_SD * n('temp'), 0.1),
      sleepHours,
      mood: P.clamp(Math.round(P.moodMean(baseline.mood, stress) + MOOD_SD * n('mood')), 1, 5),
    }

    const indicators = checkIn ? { ...checkIn.indicators } : simulated

    const odds = P.symptomProbabilities({ sansScore, sleepLoad, immuneStress, day, unload })
    const simulatedSymptoms: Symptoms = {
      headache: chance(seed, day, 'sx:headache', odds.headache),
      blurryNearVision: chance(seed, day, 'sx:blurry', odds.blurryNearVision),
      rash: chance(seed, day, 'sx:rash', odds.rash),
      dizziness: chance(seed, day, 'sx:dizziness', odds.dizziness),
      nausea: chance(seed, day, 'sx:nausea', odds.nausea),
      fatigue: chance(seed, day, 'sx:fatigue', odds.fatigue),
    }
    const symptoms = checkIn ? { ...checkIn.symptoms } : simulatedSymptoms

    records.push({
      day,
      indicators,
      symptoms,
      exerciseMinutes,
      countermeasures: {
        thighCuffHours,
        resistanceExercise: exerciseMinutes >= RESISTANCE_SESSION_MINUTES,
      },
      radiationDose,
      model: { ...state },
      source: checkIn ? 'checkin' : 'sim',
    })
  }

  return records
}
