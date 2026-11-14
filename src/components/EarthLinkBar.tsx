// Earth link bar (SPEC.md F6), always visible at the top:
// ship clock · one-way delay · link open/closed · next sync window + countdown.
// All timing logic lives in engine/earthLink.ts; this only displays it.

import { formatCountdown, formatDelay, formatShipTime, linkState } from '../engine/earthLink'
import { useShipMinutes } from '../store/shipClock'
import type { Mission } from '../types'

interface Props {
  mission: Mission
}

export function EarthLinkBar({ mission }: Props) {
  const now = useShipMinutes(mission.shipTime)
  const link = linkState(mission.syncWindows, now)
  const delay = formatDelay(mission.delayMinutes)

  return (
    <div className={`earth-link${link.open ? ' is-open' : ''}`} role="region" aria-label="Earth link">
      <div className="earth-link-inner">
        <span className="link-item">
          <span className="link-key">Ship</span> <span className="num">{formatShipTime(now)}</span>
        </span>
        <span className="link-item">
          <span className="link-key">Earth</span>{' '}
          <span className="num">{delay}</span>
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
      </div>
    </div>
  )
}
