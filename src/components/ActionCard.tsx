// One Action card (SPEC.md F5): today's single most important action for the
// crew member being viewed, with "Done" / "Not today". The choice is saved
// per crew member per day by the store (the Earth Report reads it later).

import { LEVELS } from '../data/levels'
import type { EngineResult } from '../engine'
import { canDefer } from '../engine/actions'
import { clearAction, recordAction, useActionEntry } from '../store/useAppStore'
import { missionNow } from '../store/shipClock'
import { timeOfDay } from '../engine/earthLink'
import type { CrewMember } from '../types'
import { CREW } from '../data/crew'

interface Props {
  result: EngineResult
  /** Crew member the action is for. */
  crew: CrewMember
  /** True when the signed-in user is looking at their own card. */
  isSelf: boolean
}

export function ActionCard({ result, crew, isSelf }: Props) {
  const { oneAction: action, oneActionPart: part } = result
  const day = result.signals.day
  const entry = useActionEntry(crew.id, day)
  const level = action.escalationLevel
  const attn = level >= 2 ? ` attn attn-${level}` : ''
  const record = (outcome: 'done' | 'not-today') =>
    recordAction(crew.id, day, action, part, outcome, timeOfDay(missionNow()))
  const recorder = entry && entry.recordedBy !== crew.id ? CREW.find((c) => c.id === entry.recordedBy)?.name : null

  return (
    <section className={`action-card${attn}`} aria-label="Today's One Action">
      <div className="action-card-head">
        <p className="section-label">
          Today's One Action · {isSelf ? 'for you' : `for ${crew.name}`}
        </p>
        <span className={`pill${attn}`}>
          Level {level} · {LEVELS[level].name}
        </span>
      </div>

      <h2 className="action-card-title">{action.title}</h2>
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

      {entry ? (
        <div className="action-result" role="status">
          <p>
            {entry.outcome === 'done' ? (
              <>
                <strong>Done.</strong> Logged at <span className="num">{entry.shipTime}</span> ship time
                {recorder ? ` by ${recorder}` : ''}. It will be in the Earth report.
              </>
            ) : (
              <>
                <strong>Noted: not today.</strong> Logged at <span className="num">{entry.shipTime}</span>
                {recorder ? ` by ${recorder}` : ''}. The Earth report will show it was put off.
              </>
            )}
          </p>
          <button type="button" className="button-quiet" onClick={() => clearAction(crew.id, day)}>
            Undo
          </button>
        </div>
      ) : (
        <div className="action-buttons">
          <button type="button" className="button-primary" onClick={() => record('done')}>
            Done
          </button>
          {canDefer(action) && (
            <button type="button" className="button-quiet" onClick={() => record('not-today')}>
              Not today
            </button>
          )}
        </div>
      )}
    </section>
  )
}
