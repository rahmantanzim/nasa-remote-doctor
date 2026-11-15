// App shell. Earth link bar always on top (SPEC.md F6).
// Not signed in → "Who is using this tablet?".
// Signed in → Today screen (SPEC.md §10): top bar, Body Map in the centre,
// One Action card + detail panel at the side (action first on narrow screens).
// Who may see whose data is decided by the store (access.ts), not here.

import { useMemo } from 'react'
import { ActionCard } from './components/ActionCard'
import { BodyMap } from './components/BodyMap'
import { EarthLinkBar } from './components/EarthLinkBar'
import { BodyPartPanel } from './components/BodyPartPanel'
import { CheckInStrip } from './components/CheckInStrip'
import { SignIn } from './components/SignIn'
import { CREW } from './data/crew'
import { ENVIRONMENTS } from './data/environments'
import { LEVELS } from './data/levels'
import { MISSION } from './data/mission'
import { type EngineResult, evaluateCrew } from './engine'
import { shipMinutesNow } from './store/shipClock'
import {
  saveCheckIn,
  selectCrew,
  selectPart,
  signIn,
  switchUser,
  togglePart,
  useCheckIns,
  useSession,
} from './store/useAppStore'
import type { CrewMember } from './types'

const DISCLAIMER = 'Prototype for education. Not a medical device. Simulated crew data.'

function App() {
  const session = useSession()
  return (
    <>
      <EarthLinkBar mission={MISSION} />
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
    </>
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
  const checkIns = useCheckIns()
  // Only the crew this user may see is ever evaluated (with their check-ins).
  const results = useMemo(
    () =>
      Object.fromEntries(
        visibleCrew.map((c) => [c.id, evaluateCrew(c, MISSION, undefined, checkIns[c.id])]),
      ) as Record<string, EngineResult>,
    [visibleCrew, checkIns],
  )
  const result = results[viewed.id]
  const { day, landingDay, daysToLanding } = result.signals
  const isSelf = viewed.id === user.id

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
              <CrewTab crew={user} label={`Me · ${user.name}`} result={results[user.id]} selected={viewed.id === user.id} />
              <span className="crew-divider" aria-hidden="true" />
              <span className="crew-group-label">Crew</span>
              {visibleCrew
                .filter((c) => c.id !== user.id)
                .map((c) => (
                  <CrewTab key={c.id} crew={c} label={c.name} result={results[c.id]} selected={viewed.id === c.id} />
                ))}
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

        <CheckInStrip
          crew={viewed}
          isSelf={isSelf}
          day={day}
          history={result.signals.history}
          existing={checkIns[viewed.id]?.[day]}
          onSave={(answers) => saveCheckIn(viewed.id, day, answers, shipMinutesNow(MISSION.shipTime))}
        />

        <ActionCard result={result} crew={viewed} isSelf={isSelf} shipTime={MISSION.shipTime} />

        <BodyPartPanel result={result} selectedPart={selectedPart} onSelect={selectPart} />
      </main>
    </>
  )
}

function CrewTab({
  crew,
  label,
  result,
  selected,
}: {
  crew: CrewMember
  label: string
  result: EngineResult
  selected: boolean
}) {
  return (
    <button type="button" className="crew-button" aria-pressed={selected} onClick={() => selectCrew(crew.id)}>
      <span className="crew-name">{label}</span>
      <span className="crew-meta">
        {crew.role} ·{' '}
        <span className={result.topLevel >= 2 ? `attn attn-${result.topLevel}` : undefined}>
          {result.allSteady ? 'All steady' : `Needs: ${LEVELS[result.topLevel].need}`}
        </span>
      </span>
    </button>
  )
}

export default App
