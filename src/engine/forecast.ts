// Landing-day forecast for each body part (SPEC.md F4).
//
// Each body part gets:
//   trend    — improving / stable / worsening, from recent days vs the person's own normal
//   concern  — 0 fine · 1 watch · 2 act, now and projected to landing day
//   status   — Steady / Drifting / Declining / Recovering (forecast words, not colours)
//   reason + landing-day meaning, in plain words
//
// Thresholds are named constants with a source or "assumption".

import { BODY_PART_BY_ID } from '../data/bodyParts'
import * as P from '../sim/physiology'
import type { BodyPartId, ForecastStatus, HazardId, Trend } from '../types'
import { type CrewSignals, stateDaysAgo, symptomDays } from './signals'

export type Concern = 0 | 1 | 2

export interface PartForecast {
  part: BodyPartId
  hazard: HazardId
  trend: Trend
  /** The trend in plain words, e.g. "Sleep debt rising" or "Stable". */
  trendLabel: string
  status: ForecastStatus
  concernNow: Concern
  concernLanding: Concern
  reason: string
  landingDayForecast: string
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** SANS score at this share of symptom onset = "watch". Assumption. */
export const SANS_WATCH_FRACTION = 0.85
/** Change in SANS sign-days (headache + blurry) week over week that counts as a trend. Assumption. */
const SANS_SIGN_TREND_DAYS = 2

/** Sleep debt (h over 14 nights): 10 h ≈ 45 min short a night; 25 h ≈ 1.8 h short a night. Assumption, scaled from Van Dongen 2003. */
export const SLEEP_DEBT_WATCH_HOURS = 10
export const SLEEP_DEBT_HIGH_HOURS = 25
/** Change in sleep debt over a week that counts as a trend, hours. Assumption. */
const SLEEP_DEBT_TREND_HOURS = 4

/** Bone loss rate, %/month: 1.0 = low end of CSA unprotected range; 0.7 = partly protected. Assumption on 0.7. */
const BONE_RATE_HIGH = 1.0
export const BONE_RATE_WATCH = 0.7
/** Change in bone loss rate (%/month) that counts as a trend. Assumption. */
const BONE_RATE_TREND = 0.2
/** Landing-day hip bone loss, %. 6% ≈ a 6-month ISS flight with weak exercise. Assumption. */
export const BONE_LANDING_HIGH_PERCENT = 6
const BONE_LANDING_WATCH_PERCENT = 4.5

/** Strength levels, % of pre-flight. Assumption. */
const STRENGTH_LOW = 90
export const STRENGTH_WATCH = 95
export const STRENGTH_LANDING_LOW = 88
const STRENGTH_LANDING_WATCH = 93
/** Strength change over 2 weeks that counts as a trend, % points. Assumption. */
const STRENGTH_TREND = 0.5

/** Resting HR rise over personal normal, bpm (weekly mean). Assumption. */
export const HR_RISE_HIGH = 10
export const HR_RISE_WATCH = 5
/** Weekly HR change that counts as a trend, bpm. Assumption (≈2× the noise of a 7-day mean). */
const HR_TREND = 3
/** Systolic BP gap from the space-normal, mmHg (weekly mean). Assumption. */
const BP_GAP_HIGH = 15
const BP_GAP_WATCH = 10
/** Landing-day orthostatic risk index thresholds. Assumption. */
export const ORTHOSTATIC_HIGH = 0.6
const ORTHOSTATIC_WATCH = 0.45
/** Change in orthostatic index over 2 weeks that counts as a trend. Assumption. */
const ORTHOSTATIC_TREND = 0.05

/** Immune strain index thresholds. Assumption. */
const IMMUNE_HIGH = 0.75
const IMMUNE_WATCH = 0.6
/** Change in immune index over 2 weeks that counts as a trend. Assumption. */
const IMMUNE_TREND = 0.1

/** ADA: fasting glucose ≥ 100 mg/dL = above the normal range. */
export const GLUCOSE_ABOVE_NORMAL = 100
/**
 * Fasting glucose rise over personal normal, mg/dL (weekly median).
 * Within-person day-to-day CV of fasting glucose is ~5% (Ricós biological
 * variation database) ≈ 4–5 mg/dL; the reference change value for a 7-day
 * median is ≈ 7 mg/dL. 8 mg/dL = clearly beyond normal wobble. Assumption.
 */
export const GLUCOSE_RISE_WATCH = 8
/**
 * Weekly glucose change that counts as a trend, mg/dL. With ~4 mg/dL
 * day-to-day SD, the gap between two 7-day means has SD ≈ 2.1 mg/dL;
 * 5 mg/dL ≈ 2.3 SD, so noise alone rarely looks like a trend. Assumption.
 */
const GLUCOSE_TREND = 5

/** Weekly mood change that counts as a trend, points. Assumption. */
const MOOD_TREND = 0.5
/** Mood drop below personal normal (weekly mean), points. Assumption. */
const MOOD_DROP_HIGH = 1.5
export const MOOD_DROP_WATCH = 0.75
/** Stress index thresholds. Assumption. */
const STRESS_HIGH = 0.7
const STRESS_WATCH = 0.55

/** NASA-STD-3001 Vol. 1 Rev. B (2022): career effective-dose limit 600 mSv. */
export const CAREER_DOSE_LIMIT_MSV = 600
/** Extra dose over 2 weeks: 5 mSv ≈ 3 days of travel dose; 10 mSv = report to Earth. Assumption. */
export const EXTRA_DOSE_WATCH_MSV = 5
export const EXTRA_DOSE_REPORT_MSV = 10

/** Today's reading this far from normal is flagged "recheck tomorrow". Assumption. */
const RECHECK_HR_BPM = 15
const RECHECK_TEMP_C = 0.6
const RECHECK_GLUCOSE = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const r0 = (x: number) => Math.round(x)
const r1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1)
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

/** Trend from a change where "up = worse". */
function trendOf(change: number, deadband: number): Trend {
  if (change >= deadband) return 'worsening'
  if (change <= -deadband) return 'improving'
  return 'stable'
}

/**
 * For noisy daily readings: a week-over-week change only counts as a trend
 * if the reading is also meaningfully away from the person's own normal
 * (`gap` ≥ `watch`). Moving around inside your normal range is "stable".
 */
function trendAwayFromNormal(change: number, deadband: number, gap: number, watch: number): Trend {
  const t = trendOf(change, deadband)
  return t === 'worsening' && gap < watch ? 'stable' : t
}

const level = (x: number, high: number, watch: number): Concern => (x >= high ? 2 : x >= watch ? 1 : 0)
const maxConcern = (...cs: Concern[]): Concern => Math.max(...cs) as Concern

/** Forecast word from trend + concern now + concern on landing day. */
export function statusOf(trend: Trend, concernNow: Concern, concernLanding: Concern): ForecastStatus {
  if (trend === 'improving' && concernNow >= 1) return 'recovering'
  // "Declining" needs a sign today too; a bad projection alone is "Drifting".
  if ((concernLanding === 2 && (concernNow >= 1 || trend === 'worsening')) || (concernNow === 2 && trend === 'worsening'))
    return 'declining'
  if (concernLanding >= 1 || concernNow >= 1 || trend === 'worsening') return 'drifting'
  return 'steady'
}

const RECHECK_NOTE = " Today's reading is unusual. Recheck tomorrow — one day alone is not a trend."

type PartView = Omit<PartForecast, 'part' | 'hazard' | 'status' | 'trendLabel'>

/**
 * Trend in plain words, per body part: what is actually moving and which way.
 * Clearer than "holding" or "getting worse" for a tired reader.
 */
export const TREND_LABELS: Record<BodyPartId, Record<Exclude<Trend, 'stable'>, string>> = {
  brain: { worsening: 'Mood falling', improving: 'Mood rising' },
  eyes: { worsening: 'Eye signs rising', improving: 'Eye signs easing' },
  heart: { worsening: 'Heart rate rising', improving: 'Heart rate settling' },
  immune: { worsening: 'Immune strain rising', improving: 'Immune strain easing' },
  muscles: { worsening: 'Strength falling', improving: 'Strength rising' },
  bones: { worsening: 'Bone loss speeding up', improving: 'Bone loss slowing' },
  sleep: { worsening: 'Sleep debt rising', improving: 'Sleep debt falling' },
  metabolism: { worsening: 'Blood sugar rising', improving: 'Blood sugar falling' },
  radiation: { worsening: 'Extra dose received', improving: 'Dose back to normal rate' },
}

export function trendLabel(part: BodyPartId, trend: Trend): string {
  return trend === 'stable' ? 'Stable' : TREND_LABELS[part][trend]
}

// ---------------------------------------------------------------------------
// Body parts
// ---------------------------------------------------------------------------

function eyes(s: CrewSignals): PartView {
  const onset = P.SANS_SYMPTOM_ONSET
  const blurry = symptomDays(s, 'blurryNearVision')
  const headache = symptomDays(s, 'headache')
  const signsRecent = s.symptomsRecent.blurryNearVision + s.symptomsRecent.headache
  const signsPrior = s.symptomsPrior.blurryNearVision + s.symptomsPrior.headache
  const loadRising = s.now.sansScore >= SANS_WATCH_FRACTION * onset && s.now.sansScore > stateDaysAgo(s, 7).sansScore
  let trend = trendOf(signsRecent - signsPrior, SANS_SIGN_TREND_DAYS)
  if (trend === 'stable' && loadRising) trend = 'worsening'

  const concernNow: Concern =
    blurry >= 2 ? 2 : blurry >= 1 || headache >= 3 || s.now.sansScore >= SANS_WATCH_FRACTION * onset ? 1 : 0
  const concernLanding = level(s.landing.sansScore, onset, SANS_WATCH_FRACTION * onset)

  const cuffs = s.recent.thighCuffHours
  const cuffNote =
    cuffs < 0.5 ? ' You have not been wearing thigh cuffs.' : ` Thigh cuffs (about ${r1(cuffs)} h a day) are helping.`
  const reason =
    blurry > 0
      ? `Blurry near vision on ${blurry} of the last 14 days, and headaches on ${days(headache)}. These are early signs of fluid pressing on the eyes (SANS).${cuffNote}`
      : concernNow >= 1 || concernLanding >= 1
        ? `No blurry vision yet, but the fluid shift toward your head is slowly building.${cuffNote}`
        : `No eye symptoms. Fluid shift toward the head is under control.${cuffs >= 0.5 ? cuffNote : ''}`

  const landingDayForecast = [
    'Your eyes should be fine on landing day.',
    'Your eyes may start to show strain near landing day.',
    'If nothing changes, eye symptoms are likely by landing day. Some eye changes can last after the mission.',
  ][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function sleep(s: CrewSignals): PartView {
  const need = s.crew.baseline.sleepNeedHours
  const debt = s.now.sleepDebtHours
  const trend = trendOf(debt - stateDaysAgo(s, 7).sleepDebtHours, SLEEP_DEBT_TREND_HOURS)
  const concernNow = level(debt, SLEEP_DEBT_HIGH_HOURS, SLEEP_DEBT_WATCH_HOURS)
  const concernLanding = level(s.landing.sleepDebtHours, SLEEP_DEBT_HIGH_HOURS, SLEEP_DEBT_WATCH_HOURS)
  const nights = debt / need
  const reason =
    `You slept about ${r1(s.recent.sleepHours)} h a night this week (you need ${need} h). ` +
    (debt < 1
      ? 'You have no sleep debt.'
      : `Sleep debt over 2 weeks: ${r0(debt)} hours${nights >= 1 ? ` — like missing ${r1(nights)} full nights` : ''}.`)
  const landingDayForecast = [
    'You should land rested.',
    'You would land somewhat tired.',
    'If this continues, you land very tired. Landing day needs you alert.',
  ][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function bones(s: CrewSignals): PartView {
  const ratePerMonth = (from: number, to: number) =>
    ((stateDaysAgo(s, to).boneLossPercent - stateDaysAgo(s, from).boneLossPercent) / (from - to)) * P.DAYS_PER_MONTH
  const rateNow = ratePerMonth(14, 0)
  const ratePrior = ratePerMonth(28, 14)
  const trend = trendOf(rateNow - ratePrior, BONE_RATE_TREND)
  const concernNow = level(rateNow, BONE_RATE_HIGH, BONE_RATE_WATCH)
  const concernLanding = level(s.landing.boneLossPercent, BONE_LANDING_HIGH_PERCENT, BONE_LANDING_WATCH_PERCENT)
  const target = s.crew.baseline.exerciseTargetMinutes
  const reason = `Exercise this week: about ${r0(s.recent.exerciseMinutes)} min a day (target ${target}). Bone loss is about ${r1(rateNow)}% a month right now.`
  const landingDayForecast =
    `You would land with about ${r1(s.landing.boneLossPercent)}% less hip bone. ` +
    [
      'That is normal for a long flight with good exercise.',
      'Fracture risk is a little higher on landing day.',
      'Fracture risk is higher on landing day — take care when you first walk.',
    ][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function muscles(s: CrewSignals): PartView {
  const strength = s.now.strengthIndex
  const change = strength - stateDaysAgo(s, 14).strengthIndex
  const trend = trendOf(-change, STRENGTH_TREND)
  const concernNow: Concern = strength < STRENGTH_LOW ? 2 : strength < STRENGTH_WATCH || change <= -2 * STRENGTH_TREND ? 1 : 0
  const concernLanding: Concern =
    s.landing.strengthIndex < STRENGTH_LANDING_LOW ? 2 : s.landing.strengthIndex < STRENGTH_LANDING_WATCH ? 1 : 0
  const target = s.crew.baseline.exerciseTargetMinutes
  const reason =
    `Leg strength is about ${r0(strength)}% of your pre-flight level. ` +
    `Exercise this week: about ${r0(s.recent.exerciseMinutes)} min a day (target ${target}).`
  const landingDayForecast =
    `On landing day you would have about ${r0(s.landing.strengthIndex)}% of your strength. ` +
    ['Enough to walk and work safely.', 'Standing and walking will feel hard at first.', 'You may need help to stand and walk at first.'][
      concernLanding
    ]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function heart(s: CrewSignals): PartView {
  const hrRise = s.recent.heartRate - s.expected.heartRate
  const bpGap = Math.abs(s.recent.systolicBP - s.expected.systolicBP)
  const orthoChange = s.now.orthostaticRisk - stateDaysAgo(s, 14).orthostaticRisk
  let trend = trendAwayFromNormal(s.recent.heartRate - s.prior.heartRate, HR_TREND, hrRise, HR_RISE_WATCH)
  if (trend !== 'worsening' && orthoChange >= ORTHOSTATIC_TREND) trend = 'worsening'
  const concernNow = maxConcern(level(hrRise, HR_RISE_HIGH, HR_RISE_WATCH), level(bpGap, BP_GAP_HIGH, BP_GAP_WATCH))
  const concernLanding = level(s.landing.orthostaticRisk, ORTHOSTATIC_HIGH, ORTHOSTATIC_WATCH)

  const bpText =
    bpGap < BP_GAP_WATCH
      ? 'Blood pressure is normal for space (a little lower than on Earth is expected).'
      : 'Blood pressure is away from your normal for space.'
  const recheck = s.today.indicators.heartRate >= s.expected.heartRate + RECHECK_HR_BPM && hrRise < HR_RISE_HIGH
  const reason =
    `Resting heart rate this week: about ${r0(s.recent.heartRate)} bpm (your normal: ${s.expected.heartRate}). ${bpText}` +
    (recheck ? RECHECK_NOTE : '')
  const landingDayForecast = [
    'Your heart should handle landing well.',
    'You may feel dizzy when you first stand up on landing day.',
    'High chance of feeling faint when you first stand up on landing day.',
  ][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function immune(s: CrewSignals): PartView {
  const rash = symptomDays(s, 'rash')
  const fatigue = symptomDays(s, 'fatigue')
  const signsChange =
    s.symptomsRecent.rash + s.symptomsRecent.fatigue - (s.symptomsPrior.rash + s.symptomsPrior.fatigue)
  let trend = trendOf(signsChange, 2)
  if (trend === 'stable') trend = trendOf(s.now.immuneStress - stateDaysAgo(s, 14).immuneStress, IMMUNE_TREND)
  const concernNow: Concern =
    s.feverDays >= 2 || rash >= 2 ? 2 : s.now.immuneStress >= IMMUNE_WATCH || rash >= 1 || fatigue >= 3 ? 1 : 0
  const concernLanding = level(s.landing.immuneStress, IMMUNE_HIGH, IMMUNE_WATCH)

  const tempText =
    s.feverDays >= 2
      ? `Temperature has been above your space normal on ${s.feverDays} of the last 3 days.`
      : `Temperature ${r1(s.recent.bodyTemp)} °C is normal for you in space (the body runs a little warmer up here).`
  const signs = [rash > 0 ? `rash on ${days(rash)}` : '', fatigue > 0 ? `tiredness on ${days(fatigue)}` : '']
    .filter(Boolean)
    .join(' and ')
  const recheck =
    s.today.indicators.bodyTemp >= s.expected.bodyTemp + RECHECK_TEMP_C && s.feverDays < 2 ? RECHECK_NOTE : ''
  const stressText = s.now.immuneStress >= IMMUNE_WATCH ? ' Poor sleep and stress are weakening your defences.' : ''
  const reason = `${tempText}${signs ? ` In the last 2 weeks: ${signs}.` : ''}${stressText}${recheck}`
  const landingDayForecast = [
    'Your defences should be in good shape for landing.',
    'Your defences may be a bit weak on landing day.',
    'Your defences may be weak on landing day — higher chance of catching something.',
  ][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function metabolism(s: CrewSignals): PartView {
  const base = s.expected.glucose
  const rise = s.recent.glucose - base
  const trend = trendAwayFromNormal(s.recent.glucose - s.prior.glucose, GLUCOSE_TREND, rise, GLUCOSE_RISE_WATCH)
  const concernNow: Concern =
    s.recent.glucose >= GLUCOSE_ABOVE_NORMAL && rise >= GLUCOSE_RISE_WATCH ? 2 : rise >= GLUCOSE_RISE_WATCH ? 1 : 0
  const landingGlucose = P.glucoseMean(
    s.crew.baseline.fastingGlucose,
    s.landing.insulinResistance,
    P.sleepLoad(s.landing.sleepDebtHours),
  )
  const concernLanding: Concern =
    landingGlucose >= GLUCOSE_ABOVE_NORMAL ? 2 : landingGlucose - base >= GLUCOSE_RISE_WATCH ? 1 : 0
  const recheck = s.today.indicators.glucose >= base + RECHECK_GLUCOSE && concernNow < 2 ? RECHECK_NOTE : ''
  const reason =
    `Fasting blood sugar this week: about ${r0(s.recent.glucose)} mg/dL (your normal: ${base}).` +
    (rise >= GLUCOSE_RISE_WATCH ? ' Less exercise and less sleep make the body use sugar less well.' : '') +
    recheck
  const landingDayForecast =
    `Expected on landing day: about ${r0(landingGlucose)} mg/dL. ` +
    ['Normal for you.', 'A little high for you.', 'Above the normal range.'][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function brain(s: CrewSignals): PartView {
  const baseMood = s.crew.baseline.mood
  const drop = baseMood - s.recent.mood
  const trend = trendAwayFromNormal(s.prior.mood - s.recent.mood, MOOD_TREND, drop, MOOD_DROP_WATCH)
  const concernNow = maxConcern(
    s.lowMoodDaysRecent >= 3 ? 2 : 0,
    level(drop, MOOD_DROP_HIGH, MOOD_DROP_WATCH),
    s.now.stress >= STRESS_HIGH ? 1 : 0,
  )
  const concernLanding = level(s.landing.stress, STRESS_HIGH, STRESS_WATCH)
  const fraction = s.day / s.landingDay
  const thirdQuarter = fraction >= 0.5 && fraction <= 0.8
  const reason =
    `Mood this week: about ${r1(s.recent.mood)} out of 5 (your normal: ${baseMood}).` +
    (s.now.stress >= STRESS_WATCH ? ' Little sleep and months in a small space add stress.' : '') +
    (thirdQuarter && drop >= MOOD_DROP_WATCH / 2 ? ' Many crews feel a dip at this stage of a long mission. It usually lifts.' : '')
  const landingDayForecast = [
    'Mood usually lifts as landing gets closer.',
    'Stress may stay high up to landing day.',
    'If sleep does not improve, stress stays high on landing day, when you need to be sharp.',
  ][concernLanding]
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

function radiation(s: CrewSignals): PartView {
  const extra = s.extraDoseMSv
  const trend: Trend = extra >= EXTRA_DOSE_WATCH_MSV ? 'worsening' : 'stable'
  const concernNow = level(extra, EXTRA_DOSE_REPORT_MSV, EXTRA_DOSE_WATCH_MSV)
  const landingDose = s.landing.cumulativeDoseMSv
  const fraction = landingDose / CAREER_DOSE_LIMIT_MSV
  const concernLanding = level(fraction, 1, 0.8)
  const when = s.extraDoseDay === null ? '' : s.extraDoseDay === s.day ? ' today' : ` on Day ${s.extraDoseDay}`
  const eventText =
    extra >= EXTRA_DOSE_WATCH_MSV
      ? ` You got about ${r0(extra)} mSv extra from the solar event${when}.`
      : extra > 0
        ? ` The solar event${when} added only about ${r0(extra)} mSv — the shelter worked.`
        : ' Dose is building at the normal rate for this trip.'
  const reason = `Total dose so far: ${r0(s.now.cumulativeDoseMSv)} mSv.${eventText}`
  const landingDayForecast = `You would land with about ${r0(landingDose)} mSv — ${r0(fraction * 100)}% of NASA's career limit (600 mSv).`
  return { trend, concernNow, concernLanding, reason, landingDayForecast }
}

const FORECASTERS: Record<BodyPartId, (s: CrewSignals) => PartView> = {
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

/** Forecast one body part. */
export function forecastPart(part: BodyPartId, s: CrewSignals): PartForecast {
  const view = FORECASTERS[part](s)
  return {
    part,
    // Primary hazard = first listed for the body part (SPEC.md F2 table).
    hazard: BODY_PART_BY_ID[part].hazards[0],
    status: statusOf(view.trend, view.concernNow, view.concernLanding),
    trendLabel: trendLabel(part, view.trend),
    ...view,
  }
}

export const BODY_PART_ORDER = Object.keys(FORECASTERS) as BodyPartId[]

/** Forecast all 9 body parts. */
export function forecastAll(s: CrewSignals): PartForecast[] {
  return BODY_PART_ORDER.map((part) => forecastPart(part, s))
}
