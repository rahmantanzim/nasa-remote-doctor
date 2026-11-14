// App shell. Not signed in → "Who is using this tablet?".
// Signed in → Today screen (SPEC.md §10): top bar, Body Map in the centre,
// detail panel at the side (below on narrow screens).
// Who may see whose data is decided by the store (access.ts), not here.

import { useMemo } from 'react'
import { BodyMap } from './components/BodyMap'
import { BodyPartPanel } from './components/BodyPartPanel'
import { SignIn } from './components/SignIn'
import { CREW } from './data/crew'
import { ENVIRONMENTS } from './data/environments'
import { LEVELS } from './data/levels'
import { MISSION } from './data/mission'
import { type EngineResult, evaluateCrew } from './engine'
import { selectCrew, selectPart, signIn, switchUser, togglePart, useSession } from './store/useAppStore'
import type { CrewMember } from './types'

const DISCLAIMER = 'Prototype for education. Not a medical device. Simulated crew data.'

function App() {
  const session = useSession()
  return (
    <div className="app">
      {session.signedIn ? (
        <Today
          user={session.user}
          isCrewMedicalOfficer={session.viewMode === 'crew-medical-officer'}
          visibleCrew={session.visibleCrew}
          viewed={session.viewed}
          selectedPart={session.selectedPart}
        />
      ) : (
        <SignIn crew={CREW} onSignIn={signIn} />
      )}
      <footer className="footer">{DISCLAIMER}</footer>
    </div>
  )
}

interface TodayProps {
  user: CrewMember
  isCrewMedicalOfficer: boolean
  visibleCrew: CrewMember[]
  viewed: CrewMember
  selectedPart: Parameters<typeof selectPart>[0]
}

function Today({ user, isCrewMedicalOfficer, visibleCrew, viewed, selectedPart }: TodayProps) {
  // Only the crew this user may see is ever evaluated.
  const results = useMemo(
    () => Object.fromEntries(visibleCrew.map((c) => [c.id, evaluateCrew(c, MISSION)])) as Record<string, EngineResult>,
    [visibleCrew],
  )
  const result = results[viewed.id]
  const { day, landingDay, daysToLanding } = result.signals

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Remote Doctor</span>
          <span className="brand-env">{ENVIRONMENTS[MISSION.environment].name}</span>
        </div>

        {isCrewMedicalOfficer && (
          <nav className="crew-overview" aria-label="Crew Medical Officer view">
            <span className="crew-overview-label">Crew Medical Officer view</span>
            <div className="crew-switcher">
              {visibleCrew.map((c) => {
                const r = results[c.id]
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="crew-button"
                    aria-pressed={c.id === viewed.id}
                    onClick={() => selectCrew(c.id)}
                  >
                    <span className="crew-name">
                      {c.name}
                      {c.id === user.id ? ' (you)' : ''}
                    </span>
                    <span className="crew-meta">
                      {c.role} ·{' '}
                      <span className={r.topLevel >= 2 ? `attn attn-${r.topLevel}` : undefined}>
                        {r.allSteady ? 'All steady' : `Needs: ${LEVELS[r.topLevel].need}`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}

        <div className="topbar-right">
          <p className="mission-day">
            <strong className="num">
              Day {day} / {landingDay}
            </strong>{' '}
            · <span className="num">{daysToLanding}</span> days to landing
          </p>
          <p className="signed-in">
            Signed in as <strong>{user.name}</strong> ·{' '}
            <button type="button" className="link-button" onClick={switchUser}>
              Switch user
            </button>
          </p>
        </div>
      </header>

      <main className="today">
        <section className="map-area" aria-label="Body map">
          <div className="map-caption">
            <span>
              <span className="ghost">Ghost Self</span> · {viewed.id === user.id ? 'You' : viewed.name} on landing day
              (Day {landingDay}), if habits stay the same
            </span>
            <span>Simulated crew data</span>
          </div>
          <BodyMap crewName={viewed.name} statuses={result.statuses} selectedPart={selectedPart} onSelect={togglePart} />
        </section>

        <BodyPartPanel result={result} selectedPart={selectedPart} onSelect={selectPart} />
      </main>
    </>
  )
}

export default App
