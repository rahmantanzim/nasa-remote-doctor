// Simulated flight-surgeon reply (SPEC.md F7). Deterministic rules that read
// the report's facts — same report, same reply. Each line is a standard
// countermeasure or follow-up a flight surgeon would ask for.
// The reply is clearly simulated; it is not medical advice.

import type { BodyPartId, EarthReport, EscalationLevel } from '../types'

/** Fictional flight surgeon who signs the replies. Assumption (demo character). */
export const FLIGHT_SURGEON = 'Dr. Hart, Flight Surgeon'

type Rule = { part: BodyPartId; minLevel: EscalationLevel; line: (r: EarthReport) => string }

// Ordered by clinical priority (same order as the One Action tie-break).
const RULES: Rule[] = [
  {
    part: 'eyes',
    minLevel: 2,
    line: () =>
      'Eyes: agree with thigh cuffs, 4 hours a day. Please add a weekly near-vision check and an eye ultrasound this week, and send us the images at the next sync.',
  },
  {
    part: 'radiation',
    minLevel: 3,
    line: (r) =>
      `Radiation: the extra ${Math.round(r.facts.extraDoseMSv)} mSv is now in your dose record. No treatment is needed. Shelter at once for every solar event.`,
  },
  {
    part: 'heart',
    minLevel: 2,
    line: () =>
      'Heart: keep 30–45 minutes of cardio a day. We will start the fluid-loading plan (salt tablets and water) 2 days before landing.',
  },
  {
    part: 'immune',
    minLevel: 2,
    line: () =>
      'Immune: follow the fever checklist. Take your temperature morning and evening and tell us if it goes above 38.5 °C.',
  },
  {
    part: 'brain',
    minLevel: 2,
    line: () => 'Mood: we have booked a private support call for you at the next sync. You are not alone in this.',
  },
  {
    part: 'sleep',
    minLevel: 2,
    line: () => 'Sleep: protect 8 hours tonight. We have asked the planners to move one task off your day for the next 3 days.',
  },
  {
    part: 'bones',
    minLevel: 2,
    line: () => 'Bones: back to the full resistance plan, 60 minutes a day. We will review your landing-day safety plan.',
  },
  {
    part: 'muscles',
    minLevel: 2,
    line: () => 'Muscles: back to the full resistance plan, 60 minutes a day, before strength drops further.',
  },
  {
    part: 'metabolism',
    minLevel: 2,
    line: () => 'Blood sugar: please repeat the fasting finger-prick test for 3 mornings and send us the values.',
  },
]

/** The reply lines for a report (without signature). */
export function replyLines(report: EarthReport): string[] {
  const levelOf = (part: BodyPartId) => report.facts.findings.find((f) => f.part === part)?.level ?? 1
  const lines = RULES.filter((r) => levelOf(r.part) >= r.minLevel).map((r) => r.line(report))

  // Nothing at doctor level: say so first (reassurance is part of the answer).
  if (lines.length === 0) {
    const anyDrift = report.facts.findings.some((f) => f.status === 'drifting' || f.status === 'declining')
    lines.push(
      anyDrift
        ? 'Thank you. Nothing needs a doctor today. Keep following the self-care steps, and we will watch the trend with you.'
        : 'Thank you. Everything is steady. Keep your routine — it is working.',
    )
  }

  if (report.facts.oneAction.outcome === 'not-today')
    lines.push(
      `We see "${report.facts.oneAction.title}" was put off. Please try again today, and tell us what got in the way so we can help.`,
    )
  if (report.type === 'daily' && !report.facts.checkInDone)
    lines.push('Please do your morning check-in tomorrow. Your own answers help us more than sensor values alone.')

  return [`Hello ${report.crewName.split(' ').slice(-2, -1)[0] ?? report.crewName},`, ...lines]
}
