// Actions (SPEC.md F5): one clear action per body part, and today's ONE
// action — the highest-priority one — for the Action card.
//
// Every action uses a real countermeasure where one exists, says why in
// simple words, gives steps, and says what to do if Earth cannot answer.

import * as P from '../sim/physiology'
import type { Action, BodyPartId, BodyPartStatus, EscalationLevel, ForecastStatus } from '../types'
import { type CrewSignals, symptomDays } from './signals'

/**
 * Tie-break when two body parts have the same level and status.
 * Harms that may not fully reverse come first (SANS eye changes can last
 * after flight — NASA HRP SANS risk; radiation dose is permanent), then
 * landing-day safety (heart), then the rest. Assumption (flight-surgeon judgement).
 */
export const PRIORITY: BodyPartId[] = [
  'eyes',
  'radiation',
  'heart',
  'immune',
  'brain',
  'sleep',
  'bones',
  'muscles',
  'metabolism',
]

const STATUS_RANK: Record<ForecastStatus, number> = { declining: 3, drifting: 2, recovering: 1, steady: 0 }

const r0 = (x: number) => Math.round(x)
const r1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1)

/** Who to show at Level 2. The Crew Medical Officer cannot examine themselves. */
function medicalOfficer(s: CrewSignals): string {
  return s.crew.role === 'Crew Medical Officer' ? 'the backup medical officer' : 'your Crew Medical Officer'
}

/** Escalation steps added after the self-care steps. */
function escalationSteps(level: EscalationLevel, s: CrewSignals): string[] {
  const steps: string[] = []
  if (level >= 2) steps.push(`Show ${medicalOfficer(s)} today.`)
  if (level >= 3) steps.push('This goes in the Earth report. The flight surgeon will answer after the next sync.')
  return steps
}

type Builder = (s: CrewSignals, status: BodyPartStatus) => Omit<Action, 'escalationLevel'>

const eyes: Builder = (s, st) => {
  const hours = P.THIGH_CUFF_FULL_HOURS
  const blurry = symptomDays(s, 'blurryNearVision')
  const headache = symptomDays(s, 'headache')
  const why =
    blurry > 0
      ? `You had blurry near vision on ${blurry} of the last 14 days and headaches on ${headache} ${headache === 1 ? 'day' : 'days'}. In space, fluid moves toward your head and can press on your eyes (SANS). Thigh cuffs hold fluid in your legs.`
      : 'In space, fluid moves toward your head and can press on your eyes (SANS). Thigh cuffs hold fluid in your legs and keep it away from your eyes.'
  return {
    title: st.escalationLevel >= 2 ? `Wear thigh cuffs for ${hours} hours today` : 'Keep wearing your thigh cuffs',
    why,
    how: [
      'Put on both thigh cuffs after breakfast.',
      `Keep them on for ${hours} hours. Take them off if your legs tingle or go numb.`,
      'Read the near-vision card at arm’s length. Note if it is blurry.',
      ...escalationSteps(st.escalationLevel, s),
    ],
    offlineProtocol: [
      `Keep wearing cuffs ${hours} hours every day until Earth replies.`,
      'The medical officer does the eye check (near-vision card, and eye ultrasound if trained) and logs it.',
      'If your vision gets suddenly worse or you see a dark spot: treat it as urgent and tell the commander now.',
    ],
  }
}

const radiation: Builder = (s, st) => {
  const extra = s.extraDoseMSv
  const days = extra / s.backgroundDoseMSvPerDay
  if (st.escalationLevel === 4)
    return {
      title: 'Go to the storm shelter now',
      why: `The radiation monitor shows a solar particle event: about ${r0(s.extraDoseTodayMSv)} mSv extra today. The shelter walls (water and supplies) block most of the particles.`,
      how: [
        'Stop what you are doing and go to the storm shelter.',
        'Take your personal dosimeter with you.',
        'Stay until the ship radiation monitor says the event is over.',
        'Write down when you went in and came out.',
      ],
      offlineProtocol: [
        'Do not wait for Earth. Shelter first.',
        'The commander decides when it is safe to leave.',
        'Tell the medical officer if you feel sick or vomit in the next 2 days.',
      ],
    }
  if (st.escalationLevel >= 2)
    return {
      title: 'Send your radiation dose to the flight surgeon',
      why: `You got about ${r0(extra)} mSv extra during the solar event${s.extraDoseDay ? ` on Day ${s.extraDoseDay}` : ''} — like ${r0(days)} days of normal travel dose. That is far below the level that makes people sick (about 1,000 mSv), but it adds to your lifetime cancer risk.`,
      how: [
        'Read your personal dosimeter and confirm the number.',
        'Write down where you were during the event and for how long.',
        'Go over the shelter plan with the crew so everyone shelters next time.',
        ...escalationSteps(st.escalationLevel, s),
      ],
      offlineProtocol: [
        'No treatment is needed now.',
        'Shelter at once for any new solar event.',
        'Tell the medical officer about nausea, vomiting or red skin — very unlikely at this dose.',
      ],
    }
  return {
    title: 'Keep your dosimeter on',
    why: 'Radiation is building at the normal rate for this trip. Your dosimeter keeps your record correct.',
    how: ['Wear your dosimeter all day.', 'Know the way to the storm shelter.'],
    offlineProtocol: ['If the solar-event alarm sounds, go to the shelter at once.'],
  }
}

const heart: Builder = (s, st) => {
  const rise = r0(s.recent.heartRate - s.expected.heartRate)
  return {
    title: 'Do your cardio session and drink enough water',
    why:
      rise >= 5
        ? `Your resting heart rate is up about ${rise} beats from your normal. Your heart is getting less fit, which can make you faint when you stand up on landing day.`
        : 'Cardio exercise keeps your heart ready for gravity on landing day.',
    how: [
      'Do 30–45 minutes on the bike or treadmill today.',
      'Drink water through the day.',
      'Tomorrow, take your resting heart rate before you get up.',
      ...escalationSteps(st.escalationLevel, s),
    ],
    offlineProtocol: [
      'If you have chest pain, a racing heart that does not slow, or you faint: stop, tell the crew, and follow the medical checklist now.',
      'Before landing, follow the fluid-loading plan (salt tablets and water) to help you stand.',
    ],
  }
}

const immune: Builder = (s, st) => {
  if (s.feverDays >= 2)
    return {
      title: 'Recheck your temperature tonight and rest',
      why: `Your temperature has been above your space normal on ${s.feverDays} of the last 3 days, with other signs. This may be an infection.`,
      how: [
        'Take your temperature again this evening.',
        'Rest and drink fluids.',
        'Wash your hands often and wipe shared surfaces.',
        ...escalationSteps(st.escalationLevel, s),
      ],
      offlineProtocol: [
        'The medical officer follows the fever checklist and the onboard medical kit.',
        'If temperature goes above 38.5 °C or breathing gets hard: treat as urgent.',
      ],
    }
  return {
    title: 'Protect your defences: sleep, wash hands, check your skin',
    why: 'In space the immune system is weaker. Poor sleep and stress make it weaker still, and sleeping viruses can wake up (often as a rash).',
    how: [
      'Protect your sleep tonight.',
      'Wash your hands before eating.',
      'Look at your skin. Note any new rash in the check-in.',
      ...escalationSteps(st.escalationLevel, s),
    ],
    offlineProtocol: ['If a rash spreads, blisters, or comes with fever: show the medical officer the same day.'],
  }
}

const brain: Builder = (s, st) => ({
  title: 'Take 30 minutes for yourself today',
  why: `Your mood has been about ${r1(s.recent.mood)} out of 5 this week (your normal: ${s.crew.baseline.mood}). Months in a small space and little sleep wear people down. Short breaks help.`,
  how: [
    'Record a message for family or friends.',
    'Talk with a crewmate about something other than work.',
    'Do something you enjoy: music, a book, a window view.',
    ...escalationSteps(st.escalationLevel, s),
  ],
  offlineProtocol: [
    'You do not need Earth for this. Talk to a crewmate you trust.',
    'If you have thoughts of harming yourself, tell the commander or medical officer now.',
  ],
})

const sleep: Builder = (s, st) => {
  const need = s.crew.baseline.sleepNeedHours
  const debt = s.now.sleepDebtHours
  return {
    title: `Protect ${need} hours of sleep tonight`,
    why: `You are about ${r0(debt)} hours short of sleep over 2 weeks — like missing ${r1(debt / need)} full nights. Being this tired raises the chance of mistakes, headaches and low mood.`,
    how: [
      'Block your sleep time on the schedule. No work in the sleep station.',
      'Dim lights and screens 1 hour before bed.',
      'Use earplugs and the eye mask.',
      ...(st.escalationLevel >= 2 ? ['Ask the commander to move one task off your day.'] : []),
      ...escalationSteps(st.escalationLevel, s),
    ],
    offlineProtocol: [
      'You do not need Earth to approve rest. The commander can move tasks that are not critical.',
      'Do not take sleep medicine without the medical officer.',
    ],
  }
}

const strengthTraining =
  (part: 'bones' | 'muscles'): Builder =>
  (s, st) => {
    const target = s.crew.baseline.exerciseTargetMinutes
    const why =
      part === 'bones'
        ? `You exercised about ${r0(s.recent.exerciseMinutes)} min a day this week (target ${target}). Without load, bones lose up to 1.5% a month. Heavy resistance exercise slows the loss.`
        : `You exercised about ${r0(s.recent.exerciseMinutes)} min a day this week (target ${target}). Leg muscles shrink without load. Resistance exercise keeps them strong for landing.`
    return {
      title: 'Do your resistance exercise today',
      why,
      how: [
        'Do 60 minutes on the resistance machine: squats, deadlifts, heel raises.',
        `Add cardio to reach ${target} minutes in total.`,
        'Log the minutes in tomorrow’s check-in.',
        ...escalationSteps(st.escalationLevel, s),
      ],
      offlineProtocol: [
        'If you have a sudden sharp pain in a bone or joint, stop and tell the medical officer.',
        'Ask the commander to protect your exercise time on the schedule.',
      ],
    }
  }

const metabolism: Builder = (s, st) => ({
  title: 'Exercise today and choose lower-sugar meals',
  why: `Your fasting blood sugar was about ${r0(s.recent.glucose)} mg/dL this week (your normal: ${s.expected.glucose}). Less exercise makes the body use sugar less well.`,
  how: [
    'Do your full exercise session.',
    'Choose meals with less sugar and more protein.',
    'Do a fasting finger-prick test tomorrow morning.',
    ...escalationSteps(st.escalationLevel, s),
  ],
  offlineProtocol: ['If you feel very thirsty, pee a lot, or feel confused: tell the medical officer now.'],
})

const BUILDERS: Record<BodyPartId, Builder> = {
  brain,
  eyes,
  heart,
  immune,
  muscles: strengthTraining('muscles'),
  bones: strengthTraining('bones'),
  sleep,
  metabolism,
  radiation,
}

/** The action for one body part (shown in its detail panel). */
export function actionFor(status: BodyPartStatus, s: CrewSignals): Action {
  return { ...BUILDERS[status.part](s, status), escalationLevel: status.escalationLevel }
}

/** When every body part is steady at Level 1: keep doing what works. */
function keepRoutine(s: CrewSignals): Action {
  const cuffs = s.recent.thighCuffHours
  return {
    title: 'Keep your routine today',
    why: `All 9 body areas are steady. Your exercise (about ${r0(s.recent.exerciseMinutes)} min a day), sleep (about ${r1(s.recent.sleepHours)} h)${cuffs >= 0.5 ? ' and thigh cuffs' : ''} are working.`,
    how: [
      'Do your full exercise session.',
      'Keep your sleep time protected.',
      ...(cuffs >= 0.5 ? ['Wear your thigh cuffs as planned.'] : []),
      'Do tomorrow’s morning check-in.',
    ],
    escalationLevel: 1,
    offlineProtocol: ['Nothing needs Earth today.'],
  }
}

/** Sort body parts: highest level, then worst status, then PRIORITY order. */
export function rankStatuses(statuses: BodyPartStatus[]): BodyPartStatus[] {
  return [...statuses].sort(
    (a, b) =>
      b.escalationLevel - a.escalationLevel ||
      STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
      PRIORITY.indexOf(a.part) - PRIORITY.indexOf(b.part),
  )
}

/** Today's ONE action, and the body part it comes from (null = keep routine). */
export function chooseOneAction(
  statuses: BodyPartStatus[],
  s: CrewSignals,
): { action: Action; part: BodyPartId | null } {
  const top = rankStatuses(statuses)[0]
  if (!top || (top.escalationLevel === 1 && top.status === 'steady')) return { action: keepRoutine(s), part: null }
  return { action: actionFor(top, s), part: top.part }
}

