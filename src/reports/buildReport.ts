// Earth Report builder (SPEC.md F7). Daily and weekly reports, built only
// from local data (engine result, check-ins, One Action log). No network.
//
// The top line answers "What should the doctor look at first?". Then:
// open escalations (Level 3+ first), forecast per body part, check-in
// answers, One Action done / not today, and radiation dose.

import { BODY_PART_BY_ID } from '../data/bodyParts'
import { CHECK_IN_FIELD_BY_KEY, MOOD_LABELS, OTHER_SYMPTOMS, SANS_SYMPTOMS } from '../data/checkInFields'
import { LEVELS } from '../data/levels'
import { FORECAST_WORD } from '../data/words'
import { formatCheckInValue } from '../engine/checkIn'
import { CAREER_DOSE_LIMIT_MSV } from '../engine/forecast'
import type { EngineResult } from '../engine'
import type {
  ActionLogEntry,
  CheckIn,
  CheckInsByDay,
  CrewMember,
  DailyRecord,
  EarthReport,
  Mission,
  ReportSection,
  Symptoms,
} from '../types'

/** A weekly report covers the last 7 mission days. Source: SPEC.md F7 ("weekly"). */
export const WEEK_DAYS = 7

export interface ReportInput {
  crew: CrewMember
  type: EarthReport['type']
  result: EngineResult
  checkIns: CheckInsByDay
  /** This crew member's One Action log entries (any days). */
  actions: ActionLogEntry[]
  mission: Pick<Mission, 'delayMinutes' | 'syncWindows'>
  /** Mission time now (minutes since Day 1, 00:00). */
  now: number
}

const r0 = (x: number) => Math.round(x)
const pct = (dose: number) => r0((dose / CAREER_DOSE_LIMIT_MSV) * 100)
const levelText = (level: 1 | 2 | 3 | 4) => `Level ${level} · ${LEVELS[level].name}`

const SYMPTOM_LABELS = [...SANS_SYMPTOMS, ...OTHER_SYMPTOMS]

function symptomList(s: Symptoms): string {
  const on = SYMPTOM_LABELS.filter((x) => s[x.key]).map((x) => x.label.toLowerCase())
  return on.length > 0 ? on.join(', ') : 'none'
}

/** The first sentence of a longer text. */
function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text)
  return m ? m[1] : text
}

// ---------------------------------------------------------------------------
// Top line
// ---------------------------------------------------------------------------

export function summaryLine(result: EngineResult): string {
  if (result.allSteady) return 'All steady. Nothing needs a doctor today.'
  const open = result.ranked.filter((s) => s.escalationLevel >= 2)
  if (open.length === 0) {
    const top = result.ranked[0]
    return `Nothing urgent. Watch: ${BODY_PART_BY_ID[top.part].name} (${FORECAST_WORD[top.status].toLowerCase()}), handled by self-care.`
  }
  const [first, ...rest] = open
  const more = rest.length > 0 ? ` Also at Level 2 or higher: ${rest.map((s) => BODY_PART_BY_ID[s.part].name).join(', ')}.` : ''
  return `${BODY_PART_BY_ID[first.part].name} (Level ${first.escalationLevel}): ${firstSentence(first.escalationReason)}${more}`
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function escalationsSection(result: EngineResult): ReportSection {
  const open = result.ranked.filter((s) => s.escalationLevel >= 2)
  return {
    title: 'Open escalations',
    lines:
      open.length === 0
        ? ['None. Every body area is at Level 1 (self-care).']
        : open.map((s) => `${levelText(s.escalationLevel)} — ${BODY_PART_BY_ID[s.part].name}: ${s.escalationReason}`),
  }
}

function forecastSection(result: EngineResult): ReportSection {
  return {
    title: 'Forecast by body part',
    lines: result.ranked.map(
      (s) =>
        `${BODY_PART_BY_ID[s.part].name}: ${FORECAST_WORD[s.status]}, ${s.trendLabel.toLowerCase()} (Level ${s.escalationLevel}). Landing day: ${s.landingDayForecast}`,
    ),
  }
}

function readingsLine(r: DailyRecord['indicators']): string {
  const f = (k: keyof typeof CHECK_IN_FIELD_BY_KEY, v: number) => `${formatCheckInValue(k, v)} ${CHECK_IN_FIELD_BY_KEY[k].unit}`
  return [
    `Blood pressure ${r.systolicBP}/${r.diastolicBP} mmHg`,
    `heart rate ${f('heartRate', r.heartRate)}`,
    `blood sugar ${f('glucose', r.glucose)}`,
    `temperature ${f('bodyTemp', r.bodyTemp)}`,
    `sleep ${f('sleepHours', r.sleepHours)}`,
    `mood ${r.mood}/5 (${MOOD_LABELS[r.mood as 1 | 2 | 3 | 4 | 5] ?? '—'})`,
  ].join(' · ')
}

function dailyCheckInSection(day: number, checkIn: CheckIn | undefined, today: DailyRecord): ReportSection {
  if (!checkIn) {
    return {
      title: 'Morning check-in',
      lines: [
        'No check-in today. These are the sensor values (simulated):',
        readingsLine(today.indicators),
        `Symptoms: ${symptomList(today.symptoms)}.`,
      ],
    }
  }
  return {
    title: 'Morning check-in',
    lines: [
      `Done at ${checkIn.savedAt} ship time (Day ${day}).`,
      readingsLine(checkIn.indicators),
      `Symptoms: ${symptomList(checkIn.symptoms)}.`,
      `Yesterday: exercise ${checkIn.exerciseMinutesYesterday} min, thigh cuffs ${formatCheckInValue('thighCuffHoursYesterday', checkIn.thighCuffHoursYesterday)} h.`,
    ],
  }
}

function weeklyCheckInSection(days: number[], checkIns: CheckInsByDay, history: DailyRecord[]): ReportSection {
  const done = days.filter((d) => checkIns[d])
  const symptomDays = days
    .map((d) => {
      const rec = history.find((r) => r.day === d)
      const sx = checkIns[d]?.symptoms ?? rec?.symptoms
      return sx && symptomList(sx) !== 'none' ? `Day ${d}: ${symptomList(sx)}` : null
    })
    .filter((x): x is string => x !== null)
  return {
    title: 'Check-ins this week',
    lines: [
      `Check-ins done: ${done.length} of ${days.length} days.`,
      ...(symptomDays.length > 0 ? ['Days with symptoms:', ...symptomDays] : ['No symptoms this week.']),
    ],
  }
}

function outcomeText(e: ActionLogEntry | undefined, crew: CrewMember, recordedByName: (id: string) => string): string {
  if (!e) return 'no answer yet'
  const by = e.recordedBy !== crew.id ? ` by ${recordedByName(e.recordedBy)}` : ''
  return e.outcome === 'done' ? `done at ${e.shipTime}${by}` : `not today (noted at ${e.shipTime}${by})`
}

function actionsSection(input: ReportInput, days: number[], recordedByName: (id: string) => string): ReportSection {
  const { crew, result, actions } = input
  const byDay = new Map(actions.filter((a) => a.crewId === crew.id).map((a) => [a.day, a]))
  if (input.type === 'daily') {
    const day = result.signals.day
    return {
      title: 'One Action',
      lines: [
        `Today: "${result.oneAction.title}" (${levelText(result.oneAction.escalationLevel)}) — ${outcomeText(byDay.get(day), crew, recordedByName)}.`,
      ],
    }
  }
  const entries = days.map((d) => byDay.get(d))
  const done = entries.filter((e) => e?.outcome === 'done').length
  const notToday = entries.filter((e) => e?.outcome === 'not-today').length
  return {
    title: 'One Action this week',
    lines: [
      `Done ${done} · Not today ${notToday} · No answer ${days.length - done - notToday}.`,
      ...days
        .map((d) => {
          const e = byDay.get(d)
          return e ? `Day ${d}: "${e.actionTitle}" — ${outcomeText(e, crew, recordedByName)}.` : null
        })
        .filter((x): x is string => x !== null),
    ],
  }
}

function radiationSection(result: EngineResult): ReportSection {
  const s = result.signals
  const lines = [
    `Total dose: ${r0(s.now.cumulativeDoseMSv)} mSv — ${pct(s.now.cumulativeDoseMSv)}% of NASA's ${CAREER_DOSE_LIMIT_MSV} mSv career limit.`,
  ]
  if (s.extraDoseMSv > 0)
    lines.push(
      `Extra dose in the last 2 weeks: ${r0(s.extraDoseMSv)} mSv${s.extraDoseDay ? ` (solar event, Day ${s.extraDoseDay})` : ''}.`,
    )
  lines.push(
    `Expected on landing day: ${r0(s.landing.cumulativeDoseMSv)} mSv (${pct(s.landing.cumulativeDoseMSv)}% of the limit).`,
  )
  return { title: 'Radiation', lines }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/** Build a daily or weekly Earth report for one crew member. */
export function buildReport(input: ReportInput, recordedByName: (id: string) => string): EarthReport {
  const { crew, type, result, checkIns, mission, now } = input
  const s = result.signals
  const day = s.day
  const firstDay = type === 'weekly' ? Math.max(1, day - WEEK_DAYS + 1) : day
  const days = Array.from({ length: day - firstDay + 1 }, (_, i) => firstDay + i)
  const todaysAction = input.actions.find((a) => a.crewId === crew.id && a.day === day)

  const sections: ReportSection[] = [
    escalationsSection(result),
    forecastSection(result),
    type === 'daily' ? dailyCheckInSection(day, checkIns[day], s.today) : weeklyCheckInSection(days, checkIns, s.history),
    actionsSection(input, days, recordedByName),
    radiationSection(result),
  ]

  return {
    id: `${crew.id}-${type}-day${day}-t${r0(now)}`,
    crewId: crew.id,
    crewName: crew.name,
    type,
    day,
    queuedAt: now,
    summaryFirstLine: `${type === 'weekly' ? `This week (Days ${firstDay}–${day}): ` : ''}${summaryLine(result)}`,
    sections,
    facts: {
      findings: result.statuses.map((st) => ({ part: st.part, level: st.escalationLevel, status: st.status })),
      oneAction: {
        title: result.oneAction.title,
        part: result.oneActionPart,
        outcome: todaysAction?.outcome ?? null,
      },
      checkInDone: !!checkIns[day],
      extraDoseMSv: s.extraDoseMSv,
      cumulativeDoseMSv: s.now.cumulativeDoseMSv,
    },
    link: { delayMinutes: mission.delayMinutes, syncWindows: mission.syncWindows.map((w) => ({ ...w })) },
  }
}
