// Shared display words (text only). Used by screens and Earth reports.
import type { ForecastStatus } from '../types'

export const FORECAST_WORD: Record<ForecastStatus, string> = {
  steady: 'Steady',
  drifting: 'Drifting',
  declining: 'Declining',
  recovering: 'Recovering',
}
