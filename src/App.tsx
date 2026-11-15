// App shell. Earth link bar always on top (SPEC.md F6).
// Not signed in → "Who is using this tablet?".
// Signed in → top bar (view toggle, crew tabs for the CMO, mission day) and
//   Today:        Body Map + check-in + One Action + detail panel (SPEC §10)
//   Earth Report: report preview, Earth queue, replies (SPEC F7).
// Who may see whose data is decided by the store (access.ts), not here.

import { useMemo } from 'react'
import { ActionCard } from './components/ActionCard'
import { BodyMap } from './components/BodyMap'
import { BodyPartPanel } from './components/BodyPartPanel'
import { CheckInStrip } from './components/CheckInStrip'
import { EarthLinkBar } from './components/EarthLinkBar'
import { ReportView } from './components/ReportView'
import { SignIn } from './components/SignIn'
import { CREW } from './data/crew'
import { ENVIRONMENTS } from './data/environments'
import { LEVELS } from './data/levels'
import { MISSION } from './data/mission'
import { type EngineResult, evaluateCrew } from './engine'
import { timeOfDay } from './engine/earthLink'
import { useOfflineReady } from './offline'
import { missionNow, useMissionDay } from './store/shipClock'
import {
  type AppView,
  saveCheckIn,
  selectCrew,
  selectPart,
  setView,
  signIn,
  switchUser,
  togglePart,
  useCheckIns,
  useSession,
  useView,
  useVisibleReports,
} from './store/useAppStore'
import type { CrewMember, EarthReport, Mission } from './types'

const DISCLAIMER = 'Prototype for education. Not a medical device. Simulated crew data.'

function App() {
  const session = useSession()
  const offlineReady = useOfflineReady()
  const reports = useVisibleReports()
  const day = useMissionDay()
  // The mission follows the ship clock's day (capped at landing day).
  const mission = useMemo<Mission>(() => ({ ...MISSION, currentDay: Math.min(day, MISSION.landingDay) }), [day])

  return (
    <>
      <EarthLinkBar mission={mission} reports={reports} />
      <div className="app">
        {session.signedIn ? (
          <Main
            user={session.user}
            isCrewMedicalOfficer={session.viewMode === 'crew-medical-officer'}
            visibleCrew={session.visibleCrew}
            viewed={session.viewed}
            selectedPart={session.selectedPart}
            mission={mission}
            reports={reports}
          />
        ) : (
          <SignIn crew={CREW} onSignIn={signIn} />
        )}
        <footer className="footer">
          {DISCLAIMER}
          {offlineReady && <span className="offline-ready"> · Works offline</span>}
        </footer>
      </div>
    </>
  )
}

interface MainProps {
  user: CrewMember
  isCrewMedicalOfficer: boolean
  visibleCrew: CrewMember[]
  viewed: CrewMember
  selectedPart: Parameters<typeof selectPart>[0]
  mission: Mission
  reports: EarthReport[]
}

const VIEWS: { id: AppView; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'report', label: 'Earth Report' },
]

function Main({ user, isCrewMedicalOfficer, visibleCrew, viewed, selectedPart, mission, reports }: MainProps) {
  const view = useView()
  const checkIns = useCheckIns()
  // Only the crew this user may see is ever evaluated (with their check-ins).
  const results = useMemo(
    () =>
      Object.fromEntries(
        visibleCrew.map((c) => [c.id, evaluateCrew(c, mission, undefined, checkIns[c.id])]),
      ) as Record<string, EngineResult>,
    [visibleCrew, checkIns, mission],
  )
  const result = results[viewed.id]
  const { day, landingDay, daysToLanding } = result.signals
  const isSelf = viewed.id === user.id

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Remote Doctor</span>
          <span className="brand-env">{ENVIRONMENTS[mission.environment].name}</span>
        </div>

        <div className="segmented view-toggle" role="radiogroup" aria-label="View">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="radio" aria-checked={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
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

      {view === 'report' ? (
        <ReportView
          crew={viewed}
          isSelf={isSelf}
          result={result}
          checkIns={checkIns[viewed.id] ?? {}}
          mission={mission}
          reports={reports}
        />
      ) : (
        <main className="today">
          <section className="map-area" aria-label="Body map">
            <div className="map-caption">
              <span>
                <span className="ghost">Ghost Self</span> · {isSelf ? 'You' : viewed.name} on landing day (Day{' '}
                {landingDay}), if habits stay the same
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
            onSave={(answers) => saveCheckIn(viewed.id, day, answers, timeOfDay(missionNow()))}
          />

          <ActionCard result={result} crew={viewed} isSelf={isSelf} />

          <BodyPartPanel result={result} selectedPart={selectedPart} onSelect={selectPart} />
        </main>
      )}
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
