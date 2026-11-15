// "What if, from today to landing…" (SPEC.md F10). Three sliders change the
// habits used for the landing projection; the Ghost Self, forecast words and
// chart forecasts update live. Clearly a simulation, not real data.

import { WHAT_IF_CONTROLS } from '../data/whatIf'
import type { Habits } from '../engine/signals'

interface Props {
  /** This week's real habits (the starting point). */
  real: Habits
  /** Current what-if habits, or null when showing real habits. */
  value: Habits | null
  onChange: (h: Habits) => void
  onReset: () => void
}

const show = (v: number, step: number) => (step < 1 ? String(Number(v.toFixed(2))) : String(Math.round(v)))

export function WhatIf({ real, value, onChange, onReset }: Props) {
  const habits = value ?? real
  return (
    <section className={`what-if${value ? ' is-active' : ''}`} aria-labelledby="whatif-title">
      <div className="section-head">
        <h2 id="whatif-title" className="section-label">
          What if, from today to landing…
        </h2>
        <span className="what-if-tag">{value ? 'Simulation — not real data' : 'Showing your real habits'}</span>
      </div>
      {WHAT_IF_CONTROLS.map((c) => {
        const id = `whatif-${c.key}`
        return (
          <div key={c.key} className="slider">
            <label htmlFor={id} className="slider-label">
              {c.label}
              <span className="num">
                {show(habits[c.key], c.step)} {c.unit}
              </span>
            </label>
            <input
              id={id}
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={habits[c.key]}
              aria-valuetext={`${show(habits[c.key], c.step)} ${c.unit}`}
              onChange={(e) => onChange({ ...habits, [c.key]: Number(e.target.value) })}
            />
            <span className="slider-real">
              Real: {show(real[c.key], c.step)} {c.unit}
            </span>
          </div>
        )
      })}
      <button type="button" className="button-quiet" onClick={onReset} disabled={!value}>
        Reset to my real habits
      </button>
    </section>
  )
}
