// "How to measure" mini-guides (SPEC.md F8). NASA HRP: do not assume
// astronauts know everything — each guide gives 3–4 simple steps, why it
// matters in space, and when to escalate.
//
// Escalation text matches the engine rules (src/engine/escalation.ts) so the
// guide and the app never disagree. Clinical cut-offs quoted here:
//   BP: 140 mmHg top number = high (AHA stage 2); below 90 = low. Assumption for "tell someone".
//   Fasting glucose: ≥ 100 mg/dL above normal, ≥ 126 diabetes range (ADA).
//   Fever: 38.5 °C "act now" line — matches the fever checklist in actions.ts. Assumption.

import type { BodyPartId } from '../types'
import type { CheckInNumberKey } from './checkInFields'

export interface Guide {
  title: string
  /** 3–4 simple steps. */
  steps: string[]
  /** Why it matters in space. */
  why: string
  /** When to escalate. */
  escalate: string
}

export type IndicatorGuideId =
  | 'bloodPressure'
  | 'heartRate'
  | 'glucose'
  | 'bodyTemp'
  | 'sleepHours'
  | 'mood'
  | 'headAndEyes'
  | 'otherSymptoms'
  | 'exercise'
  | 'thighCuffs'

export const INDICATOR_GUIDES: Record<IndicatorGuideId, Guide> = {
  bloodPressure: {
    title: 'Blood pressure',
    steps: [
      'Sit still for 5 minutes, back supported, feet in the foot loops.',
      'Put the cuff on your bare upper arm, at the level of your heart.',
      'Do not talk or move while it measures.',
      'Enter both numbers: top and bottom.',
    ],
    why: 'In space, fluid moves toward your head and blood pressure is usually a little lower than on Earth (about 8 points). A change from your own normal matters more than one number.',
    escalate:
      'Tell the medical officer if the top number is above 140 or below 90 on two mornings in a row, or if you feel dizzy or have a bad headache.',
  },
  heartRate: {
    title: 'Resting heart rate',
    steps: [
      'Measure before you get out of your sleeping bag.',
      'Rest quietly for 1 minute first.',
      'Read the wrist sensor, or count your pulse for 30 seconds and double it.',
    ],
    why: 'A resting heart rate that creeps up over days can mean your heart is getting less fit, poor sleep, or illness.',
    escalate:
      'Tell the medical officer if it stays 10 or more beats above your normal for a week. Chest pain, a racing heart that does not slow, or fainting: act now.',
  },
  glucose: {
    title: 'Blood sugar (fasting)',
    steps: [
      'Test before you eat or drink anything except water.',
      'Clean the fingertip and let it dry.',
      'Prick the side of the fingertip and touch the drop to the test strip.',
      'Enter the number.',
    ],
    why: 'With less movement in space, the body can use sugar less well (insulin resistance). Blood sugar can creep up slowly.',
    escalate:
      'Repeat the test if it is 100 or more. Tell the medical officer if it is 100 or more for 2 weeks, or 126 or more twice.',
  },
  bodyTemp: {
    title: 'Body temperature',
    steps: [
      'Measure in the morning, before exercise or a hot drink.',
      'Put the thermometer under your tongue and close your mouth.',
      'Wait for the beep, then enter the number.',
    ],
    why: 'In space the body runs a little warmer than on Earth. The app expects this — it only looks for a rise above your space normal.',
    escalate:
      'Recheck in the evening if it is high. Tell the medical officer if it is above your space normal on 2 of 3 days with other signs, or above 38.5 °C at any time.',
  },
  sleepHours: {
    title: 'Sleep last night',
    steps: [
      'Count from when you fell asleep, not when you got into the sleep station.',
      'Do not count time awake in the night.',
      'Round to the nearest quarter hour.',
    ],
    why: 'Noise, light and busy schedules make sleep short in space. Lost sleep adds up and affects mood, headaches and mistakes.',
    escalate:
      'Ask the commander for help with the schedule if you sleep under 6 hours for several nights. Tell the medical officer if you cannot sleep even when you have time.',
  },
  mood: {
    title: 'Mood',
    steps: [
      'Take one slow breath and ask: how do I really feel today?',
      'Tap the number that fits best. There is no wrong answer.',
      'Answer honestly — "fine" is not always fine.',
    ],
    why: 'Months in a small space far from home wear people down. A slow drop is easy to miss without a daily check.',
    escalate:
      'Talk to a crewmate you trust if your mood is low for several days. If you have thoughts of harming yourself, tell the commander or medical officer now.',
  },
  headAndEyes: {
    title: 'Headache and blurry near vision',
    steps: [
      'Hold the near-vision card at arm’s length in normal light.',
      'Read the smallest line you can, one eye at a time.',
      'Note any headache, especially one you wake up with.',
    ],
    why: 'In weightlessness, fluid moves toward the head and can press on the eyes (SANS). Blurry near vision and headaches can be early signs.',
    escalate:
      'Tell the medical officer if blurry vision and headaches happen on several days. Sudden vision loss or a dark spot: treat as urgent.',
  },
  otherSymptoms: {
    title: 'Rash, dizziness, nausea, tiredness',
    steps: [
      'Look at your skin for any new rash.',
      'Notice dizziness when you turn your head quickly.',
      'Notice nausea, or tiredness that sleep does not fix.',
    ],
    why: 'The immune system is weaker in space. A rash can mean a sleeping virus is waking up. Tiredness often comes from lost sleep.',
    escalate:
      'Show a rash that spreads, blisters or comes with fever to the medical officer the same day.',
  },
  exercise: {
    title: 'Exercise yesterday',
    steps: [
      'Count resistance exercise (squats, deadlifts) and cardio (bike, treadmill).',
      'Count only time spent exercising, not setting up.',
      'Check the exercise device log if you are not sure.',
    ],
    why: 'Without gravity, bones and muscles lose strength fast. Daily exercise (about 2 hours on the ISS) is the main protection.',
    escalate: 'Tell the commander if you cannot fit exercise into your day for 3 days in a row.',
  },
  thighCuffs: {
    title: 'Thigh cuffs yesterday',
    steps: [
      'Count the hours you wore both cuffs yesterday.',
      'Count only time with both cuffs on.',
      'Round to the nearest half hour.',
    ],
    why: 'Thigh cuffs hold some fluid in your legs, so less moves toward your head and eyes.',
    escalate: 'Take them off and tell the medical officer if your legs tingle, go numb or change colour.',
  },
}

/** Which guide each check-in number field opens. */
export const GUIDE_FOR_FIELD: Record<CheckInNumberKey, IndicatorGuideId> = {
  systolicBP: 'bloodPressure',
  diastolicBP: 'bloodPressure',
  heartRate: 'heartRate',
  glucose: 'glucose',
  bodyTemp: 'bodyTemp',
  sleepHours: 'sleepHours',
  exerciseMinutesYesterday: 'exercise',
  thighCuffHoursYesterday: 'thighCuffs',
}

/** Body-part guides: how this part is checked in space. */
export const BODY_PART_GUIDES: Record<BodyPartId, Guide> = {
  brain: {
    title: 'Brain and mind',
    steps: [
      'Tap your mood every morning in the check-in.',
      'Notice if small things bother you more than usual.',
      'In the first days of a mission, note any motion sickness.',
    ],
    why: INDICATOR_GUIDES.mood.why,
    escalate: INDICATOR_GUIDES.mood.escalate,
  },
  eyes: { ...INDICATOR_GUIDES.headAndEyes, title: 'Eyes' },
  heart: {
    title: 'Heart and blood vessels',
    steps: [
      'Measure resting heart rate before you get up.',
      'Measure blood pressure sitting, at the same time each day.',
      'Note dizziness when you move quickly.',
    ],
    why: 'In space the heart works less and can become less fit. On landing day this can make you feel faint when you stand up.',
    escalate: INDICATOR_GUIDES.heartRate.escalate,
  },
  immune: {
    title: 'Blood and immune system',
    steps: [
      'Take your temperature each morning.',
      'Check your skin for new rashes.',
      'Note tiredness that sleep does not fix.',
    ],
    why: INDICATOR_GUIDES.otherSymptoms.why,
    escalate: INDICATOR_GUIDES.bodyTemp.escalate,
  },
  muscles: {
    title: 'Muscles',
    steps: [
      'Log your exercise minutes every day.',
      'Do the strength test on the exercise device as planned.',
      'Note if loads feel much heavier than last week.',
    ],
    why: 'Leg and back muscles shrink without gravity. You need them to stand and walk on landing day.',
    escalate: 'Tell the medical officer if strength drops fast, or if muscle pain does not go away.',
  },
  bones: {
    title: 'Bones',
    steps: [
      'There is no bone scanner on board: the app estimates bone loss from your exercise and mission days.',
      'Log your exercise minutes every day.',
      'Do the full resistance session — heavy load protects bone.',
    ],
    why: 'Bones lose up to 1–1.5% a month in weightlessness. Lost bone takes years to rebuild after landing.',
    escalate: 'Tell the medical officer about any sudden bone pain, and before landing if your forecast shows high fracture risk.',
  },
  sleep: { ...INDICATOR_GUIDES.sleepHours, title: 'Sleep' },
  metabolism: { ...INDICATOR_GUIDES.glucose, title: 'Metabolism (blood sugar)' },
  radiation: {
    title: 'Radiation dose',
    steps: [
      'Wear your personal dosimeter all the time.',
      'Check the ship radiation monitor reading each day.',
      'If the solar-event alarm sounds, go to the storm shelter at once.',
    ],
    why: 'Space radiation passes through the ship and your body and raises lifetime cancer risk. On the ISS, about 30% of the dose comes from neutrons (CSA).',
    escalate: 'Solar-event alarm: shelter first, do not wait for Earth. Tell the medical officer about nausea or red skin after an event.',
  },
}
