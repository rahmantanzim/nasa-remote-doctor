// Morning check-in number fields (SPEC.md F3): labels, units, +/- step sizes
// and input limits. Limits are the widest values the form accepts — they stop
// typing mistakes, they are NOT health thresholds (the engine judges health).

export type CheckInNumberKey =
  | 'systolicBP'
  | 'diastolicBP'
  | 'heartRate'
  | 'glucose'
  | 'bodyTemp'
  | 'sleepHours'
  | 'exerciseMinutesYesterday'
  | 'thighCuffHoursYesterday'

export interface CheckInNumberField {
  key: CheckInNumberKey
  label: string
  unit: string
  /** Amount one +/- tap changes the value. */
  step: number
  min: number
  max: number
  decimals: number
}

export const CHECK_IN_NUMBER_FIELDS: readonly CheckInNumberField[] = [
  // BP cuff readings in whole mmHg; 2 mmHg steps = typical cuff resolution. Limits: assumption (any reading a cuff can show).
  { key: 'systolicBP', label: 'Blood pressure (top number)', unit: 'mmHg', step: 2, min: 60, max: 240, decimals: 0 },
  { key: 'diastolicBP', label: 'Blood pressure (bottom number)', unit: 'mmHg', step: 2, min: 30, max: 150, decimals: 0 },
  // Resting heart rate, bpm. Limits: assumption (wider than any resting value).
  { key: 'heartRate', label: 'Resting heart rate', unit: 'bpm', step: 1, min: 30, max: 200, decimals: 0 },
  // Finger-prick fasting glucose, mg/dL. Limits: typical glucose meter range (~20–600). Assumption.
  { key: 'glucose', label: 'Blood sugar (before breakfast)', unit: 'mg/dL', step: 1, min: 20, max: 600, decimals: 0 },
  // Thermometer reads to 0.1 °C. Limits: assumption (clinical thermometer range).
  { key: 'bodyTemp', label: 'Body temperature', unit: '°C', step: 0.1, min: 34, max: 42, decimals: 1 },
  // Sleep in quarter hours. Limits: assumption.
  { key: 'sleepHours', label: 'Sleep last night', unit: 'h', step: 0.25, min: 0, max: 14, decimals: 2 },
  // Exercise in 5-minute steps. Limits: assumption (more than the 2 h ISS plan allowed).
  { key: 'exerciseMinutesYesterday', label: 'Exercise yesterday', unit: 'min', step: 5, min: 0, max: 300, decimals: 0 },
  // Thigh cuffs in half hours. Limits: assumption (cuffs are worn part of the day).
  { key: 'thighCuffHoursYesterday', label: 'Thigh cuffs yesterday', unit: 'h', step: 0.5, min: 0, max: 12, decimals: 1 },
]

export const CHECK_IN_FIELD_BY_KEY = Object.fromEntries(CHECK_IN_NUMBER_FIELDS.map((f) => [f.key, f])) as Record<
  CheckInNumberKey,
  CheckInNumberField
>

/** Mood tap, 1–5. Words: plain English, assumption. */
export const MOOD_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'OK',
  4: 'Good',
  5: 'Very good',
}

/** Symptom toggles. SANS signs first (space-specific), then the rest. */
export const SANS_SYMPTOMS = [
  { key: 'headache', label: 'Headache' },
  { key: 'blurryNearVision', label: 'Blurry near vision' },
] as const

export const OTHER_SYMPTOMS = [
  { key: 'rash', label: 'Rash' },
  { key: 'dizziness', label: 'Dizziness' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'fatigue', label: 'Very tired' },
] as const
