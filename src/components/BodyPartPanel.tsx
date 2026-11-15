// Detail panel for the selected body part (SPEC.md F2), or a ranked list of
// all 9 parts when nothing is selected. Reads engine output only.

import { BODY_PART_BY_ID, HAZARDS } from '../data/bodyParts'
import { LEVELS } from '../data/levels'
import type { EngineResult } from '../engine'
import type { BodyPartId, EscalationLevel } from '../types'
import { FORECAST_WORD } from '../data/words'
import { TrendChart } from './TrendChart'

/** Amber attention class for Level 2+ (empty for Level 1). */
const attnClass = (level: EscalationLevel) => (level >= 2 ? ` attn attn-${level}` : '')

interface Props {
  result: EngineResult
  selectedPart: BodyPartId | null
  onSelect: (part: BodyPartId | null) => void
}

export function BodyPartPanel({ result, selectedPart, onSelect }: Props) {
  return (
    <aside className="panel" aria-live="polite">
      {selectedPart ? (
        <PartDetail result={result} part={selectedPart} onBack={() => onSelect(null)} />
      ) : (
        <Overview result={result} onSelect={onSelect} />
      )}
    </aside>
  )
}

function Overview({ result, onSelect }: { result: EngineResult; onSelect: (p: BodyPartId) => void }) {
  return (
    <>
      <div>
        <h2 className="panel-title">Body overview</h2>
        <p className="panel-sub">Most important first. Tap a body part for details.</p>
      </div>
      <ol className="ranked">
        {result.ranked.map((s) => {
          return (
            <li key={s.part}>
              <button type="button" className={`ranked-item${attnClass(s.escalationLevel)}`} onClick={() => onSelect(s.part)}>
                <span className="ranked-name">{BODY_PART_BY_ID[s.part].name}</span>
                <span className="ranked-level">
                  Level {s.escalationLevel}
                  <br />
                  {LEVELS[s.escalationLevel].name}
                </span>
                <span className="ranked-status">
                  {FORECAST_WORD[s.status]} · {s.trendLabel}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function PartDetail({ result, part, onBack }: { result: EngineResult; part: BodyPartId; onBack: () => void }) {
  const info = BODY_PART_BY_ID[part]
  const status = result.statuses.find((s) => s.part === part)
  if (!status) return null
  const action = result.actions[part]
  const level = LEVELS[status.escalationLevel]
  const hazard = HAZARDS[status.hazard]

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{info.name}</h2>
          <p className="panel-sub">{info.whatItDoes}</p>
        </div>
        <button type="button" className="back-button" onClick={onBack} aria-label="Back to all body parts">
          All parts
        </button>
      </div>

      <div className="status-row">
        <span className="pill forecast">
          <strong>{FORECAST_WORD[status.status]}</strong> · {status.trendLabel}
        </span>
        <span className={`pill${attnClass(status.escalationLevel)}`}>
          Level {status.escalationLevel} · {level.name}
        </span>
      </div>

      <section>
        <p className="reason">{status.reason}</p>
        <p className="level-reason">{status.escalationReason}</p>
      </section>

{part === result.oneActionPart ? (
        <section className={`action${attnClass(status.escalationLevel)}`} aria-label="What to do">
          <p className="section-label">What to do</p>
          <p>
            This is today's One Action: <strong>{action.title}</strong>. See the One Action card for the steps.
          </p>
        </section>
      ) : (
              <section className={`action${attnClass(status.escalationLevel)}`} aria-label="What to do">
          <p className="section-label">What to do</p>
          <h3 className="action-title">{action.title}</h3>
          <p className="action-why">{action.why}</p>
          <ol className="steps">
            {action.how.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {action.offlineProtocol && action.offlineProtocol.length > 0 && (
            <div className="offline">
              <strong>If Earth cannot answer</strong>
              <ul>
                {action.offlineProtocol.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <p className="section-label">Landing day</p>
        <p>{status.landingDayForecast}</p>
      </section>

      <TrendChart series={result.series[part]} />

      <dl className="facts">
        <div>
          <dt>Hazard</dt>
          <dd>
            {hazard.name} — {hazard.short}
          </dd>
        </div>
        <div>
          <dt>How it is measured in space</dt>
          <dd>{info.howMeasured}</dd>
        </div>
      </dl>
    </>
  )
}
