// Morning check-in (SPEC.md F3): full-screen overlay, about 30 seconds.
// Numbers are pre-filled from today's sensors — confirm or adjust with big
// +/- buttons. Mood is one tap. Symptoms are on/off buttons.

import { useEffect, useRef, useState } from 'react'
import {
  CHECK_IN_NUMBER_FIELDS,
  type CheckInNumberField,
  MOOD_LABELS,
  OTHER_SYMPTOMS,
  SANS_SYMPTOMS,
} from '../data/checkInFields'
import {
  type CheckInAnswers,
  clampCheckInValue,
  formatCheckInValue,
  getCheckInValue,
  setCheckInValue,
  setMood,
  stepCheckInValue,
} from '../engine/checkIn'
import { GUIDE_FOR_FIELD, INDICATOR_GUIDES } from '../data/guides'
import type { Symptoms } from '../types'
import { GuideLink } from './Guide'

interface Props {
  day: number
  initial: CheckInAnswers
  /** True when editing a saved check-in. */
  editing: boolean
  onSave: (answers: CheckInAnswers) => void
  onClose: () => void
}

export function CheckIn({ day, initial, editing, onSave, onClose }: Props) {
  const [answers, setAnswers] = useState<CheckInAnswers>(initial)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus the dialog on open; focus returns to the opener on close. Page behind does not scroll.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      opener?.focus()
    }
  }, [])

  const toggle = (key: keyof Symptoms) =>
    setAnswers((a) => ({ ...a, symptoms: { ...a.symptoms, [key]: !a.symptoms[key] } }))

  return (
    <div className="overlay" role="presentation">
      <div
        className="checkin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <header className="checkin-head">
          <div>
            <h2 id="checkin-title" className="checkin-title">
              Morning check-in
            </h2>
            <p className="panel-sub">
              Day {day}. The numbers come from today's sensors — check them and adjust if needed.
            </p>
          </div>
          <button type="button" className="back-button" onClick={onClose}>
            Close
          </button>
        </header>

        <section aria-labelledby="ci-numbers">
          <h3 id="ci-numbers" className="section-label">
            Readings
          </h3>
          <div className="stepper-grid">
            {CHECK_IN_NUMBER_FIELDS.map((f) => (
              <Stepper
                key={f.key}
                field={f}
                value={getCheckInValue(answers, f.key)}
                onChange={(v) => setAnswers((a) => setCheckInValue(a, f.key, v))}
                onStep={(dir) =>
                  setAnswers((a) => setCheckInValue(a, f.key, stepCheckInValue(f.key, getCheckInValue(a, f.key), dir)))
                }
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="ci-mood">
          <div className="section-head">
            <h3 id="ci-mood" className="section-label">
              How is your mood?
            </h3>
            <GuideLink guide={INDICATOR_GUIDES.mood} />
          </div>
          <div className="mood-row" role="radiogroup" aria-labelledby="ci-mood">
            {([1, 2, 3, 4, 5] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={answers.indicators.mood === m}
                className="choice"
                onClick={() => setAnswers((a) => setMood(a, m))}
              >
                <span className="num">{m}</span>
                <span className="choice-word">{MOOD_LABELS[m]}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="ci-eyes">
          <div className="section-head">
            <h3 id="ci-eyes" className="section-label">
              Head and eyes (signs of fluid shift)
            </h3>
            <GuideLink guide={INDICATOR_GUIDES.headAndEyes} />
          </div>
          <div className="toggle-row">
            {SANS_SYMPTOMS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="choice"
                aria-pressed={answers.symptoms[s.key]}
                onClick={() => toggle(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="ci-other">
          <div className="section-head">
            <h3 id="ci-other" className="section-label">
              Anything else today?
            </h3>
            <GuideLink guide={INDICATOR_GUIDES.otherSymptoms} />
          </div>
          <div className="toggle-row">
            {OTHER_SYMPTOMS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="choice"
                aria-pressed={answers.symptoms[s.key]}
                onClick={() => toggle(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <footer className="checkin-foot">
          <button type="button" className="button-primary" onClick={() => onSave(answers)}>
            {editing ? 'Save changes' : 'Save check-in'}
          </button>
          <button type="button" className="button-quiet" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  )
}

function Stepper({
  field,
  value,
  onChange,
  onStep,
}: {
  field: CheckInNumberField
  value: number
  onChange: (v: number) => void
  onStep: (dir: 1 | -1) => void
}) {
  // Typing is optional; the draft is committed (and kept in limits) on blur.
  const [draft, setDraft] = useState<string | null>(null)
  const id = `ci-${field.key}`
  const shown = formatCheckInValue(field.key, value)
  return (
    <div className="stepper">
      <div className="section-head">
        <label htmlFor={id} className="stepper-label">
          {field.label}
        </label>
        <GuideLink guide={INDICATOR_GUIDES[GUIDE_FOR_FIELD[field.key]]} />
      </div>
      <div className="stepper-controls">
        <button type="button" className="step-button" aria-label={`Lower ${field.label}`} onClick={() => onStep(-1)}>
          −
        </button>
        <span className="stepper-value">
          <input
            id={id}
            className="num"
            inputMode="decimal"
            value={draft ?? shown}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== null) {
                const v = Number(draft.replace(',', '.'))
                if (Number.isFinite(v)) onChange(clampCheckInValue(field.key, v))
                setDraft(null)
              }
            }}
          />
          <span className="stepper-unit">{field.unit}</span>
        </span>
        <button type="button" className="step-button" aria-label={`Raise ${field.label}`} onClick={() => onStep(1)}>
          +
        </button>
      </div>
    </div>
  )
}
