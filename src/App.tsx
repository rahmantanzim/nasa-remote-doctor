// Today screen layout (SPEC.md §10): top bar with crew switcher and mission
// day; Body Map in the centre; detail panel at the side (below on narrow screens).

import { useMemo } from 'react'
import { BodyMap } from './components/BodyMap'
import { BodyPartPanel } from './components/BodyPartPanel'
import { CREW } from './data/crew'
import { ENVIRONMENTS } from './data/environments'
import { LEVELS } from './data/levels'
import { MISSION } from './data/mission'
import { type EngineResult, evaluateCrew } from './engine'
import { selectCrew, selectPart, togglePart, useAppStore } from './store/useAppStore'

function App() {
  const { crewId, selectedPart } = useAppStore()
  const results = useMemo(
    () => Object.fromEntries(CREW.map((c) => [c.id, evaluateCrew(c, MISSION)])) as Record<string, EngineResult>,
    [],
  )
  const crew = CREW.find((c) => c.id === crewId) ?? CREW[0]
  const result = results[crew.id]
  const { day, landingDay, daysToLanding } = result.signals

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Remote Doctor</span>
          <span className="brand-env">{ENVIRONMENTS[MISSION.environment].name}</span>
        </div>

        <nav className="crew-switcher" aria-label="Crew member">
          {CREW.map((c) => {
            const r = results[c.id]
            return (
              <button
                key={c.id}
                type="button"
                className="crew-button"
                aria-pressed={c.id === crew.id}
                onClick={() => selectCrew(c.id)}
              >
                <span className="crew-name">{c.name}</span>
                <span className="crew-meta">
                  {c.role} ·{' '}
                  <span className={r.topLevel >= 2 ? `attn attn-${r.topLevel}` : undefined}>
                    {r.allSteady ? 'All steady' : `Needs: ${LEVELS[r.topLevel].need}`}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <p className="mission-day">
          <strong className="num">
            Day {day} / {landingDay}
          </strong>{' '}
          · <span className="num">{daysToLanding}</span> days to landing
        </p>
      </header>

      <main className="today">
        <section className="map-area" aria-label="Body map">
          <div className="map-caption">
            <span>
              <span className="ghost">Ghost Self</span> · {crew.name} on landing day (Day {landingDay}), if habits stay
              the same
            </span>
            <span>Simulated crew data</span>
          </div>
          <BodyMap crewName={crew.name} statuses={result.statuses} selectedPart={selectedPart} onSelect={togglePart} />
        </section>

        <BodyPartPanel result={result} selectedPart={selectedPart} onSelect={selectPart} />
      </main>

      <footer className="footer">Prototype for education. Not a medical device. Simulated crew data.</footer>
    </div>
  )
}

export default App
