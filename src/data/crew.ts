import type { CrewMember } from '../types'

// The 3 fictional crew members (SPEC.md F1). Simulated crew data.
//
// Baselines are each person's own "normal". Individual numbers are
// assumptions, chosen inside healthy adult ranges from the sources noted.

// ISS crews exercise about 2 hours per day (aerobic + resistance).
// Source: NASA ISS exercise countermeasures (≈2 h/day). Used as everyone's target.
const EXERCISE_TARGET_MINUTES = 120

// SPEC.md F1/§7: personal sleep need ≈ 8 h.
const SLEEP_NEED_HOURS = 8

export const CREW: CrewMember[] = [
  {
    id: 'okafor',
    name: 'Cmdr. Maya Okafor',
    role: 'Commander',
    baseline: {
      // Fit adult resting HR range ~50–70 bpm. Value: assumption.
      restingHeartRate: 58,
      // Normal adult BP < 120/80 mmHg (AHA). Values: assumption.
      systolicBP: 114,
      diastolicBP: 72,
      // Normal fasting glucose 70–99 mg/dL (ADA). Value: assumption.
      fastingGlucose: 88,
      // Normal oral temperature ~36.5–37.0 °C. Value: assumption.
      bodyTemp: 36.7,
      sleepNeedHours: SLEEP_NEED_HOURS,
      // Self-rated 1–5; 4 = "good". Assumption.
      mood: 4,
      exerciseTargetMinutes: EXERCISE_TARGET_MINUTES,
      // Healthy adult hip areal BMD ~0.9–1.1 g/cm². Value: assumption.
      hipBoneDensity: 0.98,
      // Pre-flight strength defines 100%. By definition.
      strengthIndex: 100,
    },
    behaviour: {
      // Followed the plan for most of the mission. Assumption.
      usualExerciseMinutes: 110,
      // Skipping exercise recently — main demo story (SPEC F1). Assumption.
      recentExerciseMinutes: 35,
      // "Recently" = last 12 days. Assumption, tuned for demo.
      recentDays: 12,
      // Earlier in the mission: a bit short of need, like most ISS crews.
      // Assumption.
      usualSleepHours: 6.9,
      // Sleep debt: ISS crews average ~6 h/night (Barger et al., Lancet
      // Neurology 2014). 5.6 h = worse than average. Assumption.
      recentSleepHours: 5.6,
      // Not using thigh cuffs → SANS signs develop. Assumption (demo story).
      thighCuffHoursPerDay: 0,
      // Sheltered during the SPE. Assumption.
      shelteredDuringSPE: true,
    },
    // Fixed seed for deterministic noise. Arbitrary constant.
    seed: 140_101,
    demoStory:
      'Skipping exercise, building sleep debt, and showing early SANS signs (headache, blurry near vision).',
  },
  {
    id: 'tremblay',
    name: 'Dr. Lucas Tremblay',
    role: 'Crew Medical Officer',
    baseline: {
      restingHeartRate: 62, // assumption (fit adult range ~50–70 bpm)
      systolicBP: 118, // assumption (normal < 120 mmHg, AHA)
      diastolicBP: 76, // assumption (normal < 80 mmHg, AHA)
      fastingGlucose: 92, // assumption (normal 70–99 mg/dL, ADA)
      bodyTemp: 36.6, // assumption (normal ~36.5–37.0 °C)
      sleepNeedHours: SLEEP_NEED_HOURS,
      mood: 4, // assumption
      exerciseTargetMinutes: EXERCISE_TARGET_MINUTES,
      hipBoneDensity: 1.04, // assumption (healthy adult ~0.9–1.1 g/cm²)
      strengthIndex: 100, // by definition
    },
    behaviour: {
      usualExerciseMinutes: 115, // assumption: near target
      recentExerciseMinutes: 110, // assumption: still near target
      recentDays: 12, // assumption, same window as crewmates
      usualSleepHours: 6.8, // assumption: a bit under need, typical of ISS
      recentSleepHours: 6.6, // assumption: a bit under need, typical of ISS
      thighCuffHoursPerDay: 2, // assumption: some cuff use
      // Outside the storm shelter during the SPE (securing medical stores)
      // → higher dose. Assumption (demo story, SPEC F1).
      shelteredDuringSPE: false,
    },
    seed: 140_202, // arbitrary constant
    demoStory:
      'Received a higher radiation dose after a simulated solar particle event.',
  },
  {
    id: 'ito',
    name: 'Sam Ito',
    role: 'Flight Engineer',
    baseline: {
      restingHeartRate: 54, // assumption (fit adult range ~50–70 bpm)
      systolicBP: 112, // assumption (normal < 120 mmHg, AHA)
      diastolicBP: 70, // assumption (normal < 80 mmHg, AHA)
      fastingGlucose: 85, // assumption (normal 70–99 mg/dL, ADA)
      bodyTemp: 36.8, // assumption (normal ~36.5–37.0 °C)
      sleepNeedHours: SLEEP_NEED_HOURS,
      mood: 4, // assumption
      exerciseTargetMinutes: EXERCISE_TARGET_MINUTES,
      hipBoneDensity: 1.01, // assumption (healthy adult ~0.9–1.1 g/cm²)
      strengthIndex: 100, // by definition
    },
    behaviour: {
      usualExerciseMinutes: 120, // assumption: meets target
      recentExerciseMinutes: 120, // assumption: meets target
      recentDays: 12, // assumption, same window as crewmates
      usualSleepHours: 7.6, // assumption: close to need
      recentSleepHours: 7.6, // assumption: close to need
      thighCuffHoursPerDay: 4, // assumption: follows SANS countermeasure plan
      shelteredDuringSPE: true, // assumption
    },
    seed: 140_303, // arbitrary constant
    demoStory: 'Stable. Shows what "doing well" looks like.',
  },
]
