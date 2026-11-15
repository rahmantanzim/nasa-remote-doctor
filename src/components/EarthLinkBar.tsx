// Earth link bar (SPEC.md F6), always visible at the top:
// ship clock · one-way delay · link open/closed · next sync window + countdown
// · reports waiting / replies received. Timing logic lives in
// engine/earthLink.ts and reports/earthQueue.ts; this only displays it.

import { formatCountdown, formatDelay, formatShipTime, linkState, timeOfDay } from '../engine/earthLink'
import { summarize } from '../reports/earthQueue'
import { useMissionNow } from '../store/shipClock'
import type { EarthReport, Mission } from '../types'

interface Props {
  mission: Mission
  /** Reports the signed-in user may see (empty when nobody is signed in). */
  reports: EarthReport[]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function EarthLinkBar({ mission, reports }: Props) {
  const now = useMissionNow()
  const link = linkState(mission.syncWindows, timeOfDay(now))
  const delay = formatDelay(mission.delayMinutes)
  const queue = summarize(reports, now)

  return (
    <div className={`earth-link${link.open ? ' is-open' : ''}`} role="region" aria-label="Earth link">
      <div className="earth-link-inner">
        <span className="link-item">
          <span className="link-key">Ship</span> <span className="num">{formatShipTime(timeOfDay(now))}</span>
        </span>
        <span className="link-item">
          <span className="link-key">Earth</span> <span className="num">{delay}</span>
          {mission.delayMinutes > 0 ? ' one-way' : ''}
        </span>
        <span className="link-item link-status">
          <span className="link-dot" aria-hidden="true" />
          {link.open ? 'Link open' : 'Link closed'}
        </span>
        {link.open && link.closesAt !== null && link.minutesUntilClose !== null ? (
          <span className="link-item">
            Closes <span className="num">{formatShipTime(link.closesAt)}</span> (in{' '}
            <span className="num">{formatCountdown(link.minutesUntilClose)}</span>)
          </span>
        ) : (
          <span className="link-item">
            Next sync <span className="num">{formatShipTime(link.nextStart)}</span> (in{' '}
            <span className="num">{formatCountdown(link.minutesUntilNext)}</span>)
          </span>
        )}
        {queue.waiting > 0 && <span className="link-item link-queue">{plural(queue.waiting, 'report')} waiting</span>}
        {queue.sent > 0 && <span className="link-item link-queue">{plural(queue.sent, 'report')} on the way</span>}
        {queue.replied > 0 && (
          <span className="link-item link-reply" role="status">
            {queue.replied === 1 ? 'Reply received' : `${queue.replied} replies received`}
          </span>
        )}
      </div>
    </div>
  )
}
