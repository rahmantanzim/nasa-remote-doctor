import type { BodyPartId, BodyPartInfo, HazardId } from '../types'

// NASA HRP's 5 hazards. Source: https://www.nasa.gov/hrp/hazards
export const HAZARDS: Record<HazardId, { name: string; short: string }> = {
  radiation: {
    name: 'Space radiation',
    short: 'Particles from the Sun and deep space pass through the body.',
  },
  isolation: {
    name: 'Isolation and confinement',
    short: 'Small crew, small space, long time away from home.',
  },
  distance: {
    name: 'Distance from Earth',
    short: 'Help and supplies are far away; messages arrive late.',
  },
  gravity: {
    name: 'Gravity fields',
    short: 'Weightlessness and partial gravity change fluids, bones and muscles.',
  },
  environment: {
    name: 'Hostile / closed environments',
    short: 'Recycled air and water, microbes, noise and light inside the ship.',
  },
}

// The 9 body parts on the Ghost Self (SPEC.md F2). Text only, no numbers.
// Hazard links: SPEC.md F2 table. Risks: NASA HRP risks (nasa.gov/hrp/risks).
export const BODY_PARTS: BodyPartInfo[] = [
  {
    id: 'brain',
    shortName: 'Brain / mind',
    name: 'Brain / mind',
    whatItDoes: 'Thinks, feels and keeps you focused on the mission.',
    mainRisk: 'Low mood, stress and motion sickness.',
    hazards: ['isolation', 'gravity'],
    indicators: ['mood', 'stress', 'symptoms'],
    howMeasured: 'A daily mood tap in the check-in, plus symptoms like nausea.',
  },
  {
    id: 'eyes',
    shortName: 'Eyes',
    name: 'Eyes',
    whatItDoes: 'Let you see — near vision matters for reading and fine work.',
    mainRisk: 'SANS: fluid moves toward the head and can change the eye.',
    hazards: ['gravity'],
    indicators: ['headache', 'blurryNearVision', 'weeklyEyeCheck'],
    howMeasured: 'Daily headache and near-vision questions, and a weekly eye check.',
  },
  {
    id: 'heart',
    shortName: 'Heart',
    name: 'Heart & vessels',
    whatItDoes: 'Pumps blood to every part of the body.',
    mainRisk: 'Vessels stiffen; you may feel faint when standing on landing day.',
    hazards: ['gravity', 'radiation'],
    indicators: ['heartRate', 'systolicBP', 'diastolicBP'],
    howMeasured: 'Morning resting heart rate and a blood-pressure cuff.',
  },
  {
    id: 'immune',
    shortName: 'Immune',
    name: 'Blood / immune',
    whatItDoes: 'Carries oxygen and fights germs.',
    mainRisk: 'Anemia, weaker immunity, and sleeping viruses waking up.',
    hazards: ['environment', 'isolation'],
    indicators: ['bodyTemp', 'rash', 'fatigue'],
    howMeasured: 'Body temperature and symptoms like rash or tiredness.',
  },
  {
    id: 'muscles',
    shortName: 'Muscles',
    name: 'Muscles',
    whatItDoes: 'Move you and hold you up against gravity.',
    mainRisk: 'Muscle mass and strength loss.',
    hazards: ['gravity'],
    indicators: ['exerciseMinutes', 'strengthTest'],
    howMeasured: 'Exercise minutes logged, plus a regular strength test on the exercise device.',
  },
  {
    id: 'bones',
    shortName: 'Bones',
    name: 'Bones',
    whatItDoes: 'Hold up your body and protect your organs.',
    mainRisk: 'Bone density loss, higher fracture risk.',
    hazards: ['gravity'],
    indicators: ['exerciseMinutes', 'missionDay'],
    howMeasured: 'Estimated from exercise and mission day (no bone scanner on board).',
  },
  {
    id: 'sleep',
    shortName: 'Sleep',
    name: 'Sleep (whole body)',
    whatItDoes: 'Repairs the body and resets the mind each night.',
    mainRisk: 'Too little sleep and body-clock drift.',
    hazards: ['isolation', 'environment'],
    indicators: ['sleepHours', 'sleepQuality'],
    howMeasured: 'Sleep hours and how rested you feel, in the morning check-in.',
  },
  {
    id: 'metabolism',
    shortName: 'Metabolism',
    name: 'Metabolism',
    whatItDoes: 'Turns food into energy.',
    mainRisk: 'Insulin resistance — blood sugar creeps up.',
    hazards: ['gravity'],
    indicators: ['glucose'],
    howMeasured: 'A finger-prick fasting blood sugar reading (mg/dL).',
  },
  {
    id: 'radiation',
    shortName: 'Radiation',
    name: 'Radiation (whole body)',
    whatItDoes: 'Not an organ — the total dose your whole body has received.',
    mainRisk: 'Higher lifetime cancer risk and cataracts.',
    hazards: ['radiation'],
    indicators: ['cumulativeDose'],
    howMeasured: 'Personal dosimeter plus the ship radiation monitor (mSv).',
  },
]

export const BODY_PART_BY_ID: Record<BodyPartId, BodyPartInfo> = Object.fromEntries(
  BODY_PARTS.map((p) => [p.id, p]),
) as Record<BodyPartId, BodyPartInfo>
