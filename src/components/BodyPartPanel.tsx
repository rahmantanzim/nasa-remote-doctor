// Detail panel for the selected body part (SPEC.md F2), or a ranked list of
// all 9 parts when nothing is selected. Reads engine output only.

import { BODY_PART_BY_ID, HAZARDS } from '../data/bodyParts'
import { LEVELS } from '../data/levels'
import type { EngineResult } from '../engine'
import type { BodyPartId } from '../types'
import { FORECAST_WORD, TREND_WORD } from './labels'
import { TrendChart } from './TrendChart'

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
          const high = s.escalationLevel >= 2
          return (
            <li key={s.part}>
              <button type="button" className={`ranked-item${high ? ' level-high' : ''}`} onClick={() => onSelect(s.part)}>
                <span className="ranked-name">{BODY_PART_BY_ID[s.part].name}</span>
                <span className="ranked-level">
                  Level {s.escalationLevel}
                  <br />
                  {LEVELS[s.escalationLevel].name}
                </span>
                <span className="ranked-status">
                  {FORECAST_WORD[s.status]} · {TREND_WORD[s.trend]}
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
  const high = status.escalationLevel >= 2
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
          <strong>{FORECAST_WORD[status.status]}</strong> · {TREND_WORD[status.trend]}
        </span>
        <span className={`pill${high ? ' level-high' : ''}`}>
          Level {status.escalationLevel} · {level.name}
        </span>
      </div>

      <section>
        <p className="reason">{status.reason}</p>
        <p className="level-reason">{status.escalationReason}</p>
      </section>

      <section className={`action${high ? ' level-high' : ''}`} aria-label="What to do">
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
