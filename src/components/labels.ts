// Display words for engine values (text only, no logic).
import type { ForecastStatus, Trend } from '../types'

export const FORECAST_WORD: Record<ForecastStatus, string> = {
  steady: 'Steady',
  drifting: 'Drifting',
  declining: 'Declining',
  recovering: 'Recovering',
}

export const TREND_WORD: Record<Trend, string> = {
  improving: 'getting better',
  stable: 'holding',
  worsening: 'getting worse',
}
