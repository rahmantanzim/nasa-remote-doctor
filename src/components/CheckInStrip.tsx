// "Morning check-in" button / status on the main screen, and the overlay.
// The astronaut checks in for themself; the Crew Medical Officer sees a
// crewmate's check-in status (read-only).

import { useCallback, useState } from 'react'
import { type CheckInAnswers, checkInDefaults } from '../engine/checkIn'
import type { CheckIn as CheckInRecord, CrewMember, DailyRecord } from '../types'
import { CheckIn } from './CheckIn'

interface Props {
  crew: CrewMember
  isSelf: boolean
  day: number
  /** Simulated history: today's record gives the pre-filled values. */
  history: DailyRecord[]
  existing: CheckInRecord | undefined
  onSave: (answers: CheckInAnswers) => void
}

export function CheckInStrip({ crew, isSelf, day, history, existing, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  if (!isSelf) {
    return (
      <p className="checkin-strip is-readonly" role="status">
        {existing
          ? `${crew.name}: check-in done at ${existing.savedAt} ship time.`
          : `${crew.name}: no check-in yet today. Simulated sensor values are shown.`}
      </p>
    )
  }

  return (
    <div className="checkin-strip">
      {existing ? (
        <>
          <p role="status">
            <strong>Check-in done at {existing.savedAt}.</strong> Thank you.
          </p>
          <button type="button" className="button-quiet" onClick={() => setOpen(true)}>
            Edit check-in
          </button>
        </>
      ) : (
        <>
          <p>About 30 seconds. Your body map and action update right away.</p>
          <button type="button" className="button-primary" onClick={() => setOpen(true)}>
            Morning check-in
          </button>
        </>
      )}
      {open && (
        <CheckIn
          day={day}
          initial={checkInDefaults(history, day, existing)}
          editing={!!existing}
          onSave={(answers) => {
            onSave(answers)
            setOpen(false)
          }}
          onClose={close}
        />
      )}
    </div>
  )
}
