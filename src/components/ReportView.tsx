// Earth Report view (SPEC.md F7): build today's (or this week's) report from
// local data, add it to the Earth queue, follow it to Earth and back, and
// read the flight surgeon's reply. Report logic lives in src/reports/.

import { useMemo, useState } from 'react'
import { CREW } from '../data/crew'
import { formatCountdown, formatMissionTime, linkState, timeOfDay } from '../engine/earthLink'
import type { EngineResult } from '../engine'
import { buildReport } from '../reports/buildReport'
import { nextDemoEvent, queueStatus, sentAt } from '../reports/earthQueue'
import { jumpMissionClockTo, missionNow, useMissionNow } from '../store/shipClock'
import { queueReport, resetDemo, useActionLog } from '../store/useAppStore'
import type { CheckInsByDay, CrewMember, EarthReport, Mission } from '../types'

interface Props {
  crew: CrewMember
  isSelf: boolean
  result: EngineResult
  checkIns: CheckInsByDay
  mission: Mission
  /** Reports the signed-in user may see. */
  reports: EarthReport[]
}

const nameOf = (id: string) => CREW.find((c) => c.id === id)?.name ?? id

export function ReportView({ crew, isSelf, result, checkIns, mission, reports }: Props) {
  const [type, setType] = useState<EarthReport['type']>('daily')
  const actionLog = useActionLog()
  const actions = useMemo(() => Object.values(actionLog).filter((a) => a.crewId === crew.id), [actionLog, crew.id])
  // Preview is rebuilt when the data changes; the time is taken when it is queued.
  const preview = useMemo(
    () => buildReport({ crew, type, result, checkIns, actions, mission, now: missionNow() }, nameOf),
    [crew, type, result, checkIns, actions, mission],
  )

  const [queuedNote, setQueuedNote] = useState<string | null>(null)
  const addToQueue = () => {
    const report = buildReport({ crew, type, result, checkIns, actions, mission, now: missionNow() }, nameOf)
    queueReport(report)
    setQueuedNote(`Added to the Earth queue. It leaves at ${formatMissionTime(sentAt(report))}.`)
  }

  return (
    <main className="report-view">
      <section className="report-compose" aria-labelledby="compose-title">
        <div className="report-compose-head">
          <h2 id="compose-title" className="panel-title">
            Earth Report · {isSelf ? 'you' : crew.name}
          </h2>
          <div className="segmented" role="radiogroup" aria-label="Report type">
            {(['daily', 'weekly'] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}>
                {t === 'daily' ? 'Today' : 'This week'}
              </button>
            ))}
          </div>
        </div>
        <p className="panel-sub">
          Built on the ship from your own data. It waits in the queue and goes to Earth at the next sync window.
        </p>

        <ReportDocument report={preview} />

        <div className="report-actions">
          <button type="button" className="button-primary" onClick={addToQueue}>
            Add to Earth queue
          </button>
          <button type="button" className="button-quiet" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
        {queuedNote && (
          <p className="panel-sub" role="status">
            {queuedNote}
          </p>
        )}
      </section>

      <section className="report-queue" aria-labelledby="queue-title">
        <h2 id="queue-title" className="panel-title">
          Earth queue
        </h2>
        <QueueList reports={reports} />
        <DemoControls mission={mission} reports={reports} />
      </section>
    </main>
  )
}

/** The report itself — also what gets printed. */
function ReportDocument({ report }: { report: EarthReport }) {
  return (
    <article className="report-doc print-area" aria-label="Report preview">
      <header className="report-doc-head">
        <p className="section-label">
          {report.type === 'daily' ? 'Daily' : 'Weekly'} Earth Report · Day {report.day}
        </p>
        <h3 className="report-doc-title">{report.crewName}</h3>
      </header>
      <div className="report-first">
        <p className="section-label">What the doctor should look at first</p>
        <p className="report-first-line">{report.summaryFirstLine}</p>
      </div>
      {report.sections.map((s) => (
        <section key={s.title} className="report-section">
          <h4>{s.title}</h4>
          <ul>
            {s.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="report-foot">Prototype for education. Not a medical device. Simulated crew data.</p>
    </article>
  )
}

function QueueList({ reports }: { reports: EarthReport[] }) {
  const now = useMissionNow()
  if (reports.length === 0) return <p className="panel-sub">No reports yet. Add today's report to the queue.</p>
  const newestFirst = [...reports].sort((a, b) => b.queuedAt - a.queuedAt)
  return (
    <ol className="queue-list">
      {newestFirst.map((r) => {
        const q = queueStatus(r, now)
        return (
          <li key={r.id} className={`queue-item is-${q.state}`}>
            <p className="queue-title">
              {r.type === 'daily' ? 'Daily' : 'Weekly'} report · {r.crewName} · Day {r.day}
            </p>
            <p className="queue-status" role="status">
              {q.state === 'queued' &&
                `Waiting on the ship · sends at ${formatMissionTime(q.sentAt)} (in ${formatCountdown(q.sentAt - now)})`}
              {q.state === 'sent' &&
                `Sent at ${formatMissionTime(q.sentAt)} · reply due ${formatMissionTime(q.replyAt)} (in ${formatCountdown(q.replyAt - now)})`}
              {q.state === 'replied' && `Reply received at ${formatMissionTime(q.replyAt)}`}
            </p>
            {q.reply && (
              <div className="reply">
                {q.reply.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="reply-from">— {q.reply.from}</p>
                <p className="reply-note">Simulated reply for the demo.</p>
              </div>
            )}
            <details className="queue-details">
              <summary>What was sent</summary>
              <ReportDocument report={r} />
            </details>
          </li>
        )
      })}
    </ol>
  )
}

/** Clearly separated demo controls (for presentations). */
function DemoControls({ mission, reports }: { mission: Mission; reports: EarthReport[] }) {
  const now = useMissionNow()
  const link = linkState(mission.syncWindows, timeOfDay(now))
  const next = nextDemoEvent(reports, now, now + link.minutesUntilNext)
  return (
    <aside className="demo-controls" aria-label="Demo controls">
      <p className="section-label">Demo controls · for presentations</p>
      <p className="panel-sub">Moves the ship clock forward so you do not have to wait for the real time.</p>
      <div className="report-actions">
        <button type="button" className="button-quiet" onClick={() => jumpMissionClockTo(next.at)}>
          {next.kind === 'reply'
            ? `Demo: jump to reply arrival (${formatMissionTime(next.at)})`
            : `Demo: jump to next sync window (${formatMissionTime(next.at)})`}
        </button>
        <button
          type="button"
          className="button-quiet"
          onClick={() => {
            if (window.confirm('Clear all demo data (check-ins, actions, reports) and reset the clock?')) resetDemo()
          }}
        >
          Reset demo
        </button>
      </div>
    </aside>
  )
}
