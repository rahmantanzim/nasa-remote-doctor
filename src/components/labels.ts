// Display words for engine values (text only, no logic).
import type { ForecastStatus } from '../types'

export const FORECAST_WORD: Record<ForecastStatus, string> = {
  steady: 'Steady',
  drifting: 'Drifting',
  declining: 'Declining',
  recovering: 'Recovering',
}
