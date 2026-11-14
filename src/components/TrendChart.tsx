// Small trend chart (SPEC.md F2 item 5): one key value from Day 1 to landing
// day. Solid line = what happened, dashed line = forecast if habits stay the
// same, grey band + thin dashed line = your normal. Change over time, not decoration.

import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendSeries } from '../engine/series'

interface Props {
  series: TrendSeries
}

const SERIES_NAMES: Record<string, string> = {
  value: 'You',
  forecast: 'Forecast',
  normal: 'Your normal',
}

export function TrendChart({ series }: Props) {
  const { currentDay, landingDay, decimals, unit } = series
  const data = series.points.map((p) => ({ ...p, band: [p.low, p.high] as [number, number] }))
  const now = series.points.find((p) => p.day === currentDay)
  const end = series.points.find((p) => p.day === landingDay)
  const fmt = (v: number) => v.toFixed(decimals)
  const tickLabel = (d: number) => (d === landingDay ? 'Landing' : d === currentDay ? 'Today' : `Day ${d}`)
  const summary =
    `${series.label}: now ${now?.value != null ? fmt(now.value) : '—'} ${unit}` +
    (end?.forecast != null ? `, forecast on landing day ${fmt(end.forecast)} ${unit}.` : '.')

  return (
    <figure className="trend" aria-label={summary}>
      <figcaption className="trend-head">
        <span>{series.label}</span>
        {now?.value != null && (
          <span className="num">
            {fmt(now.value)} {unit}
          </span>
        )}
      </figcaption>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 30, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, landingDay]}
              ticks={[1, currentDay, landingDay]}
              tickFormatter={tickLabel}
              tickLine={false}
            />
            <YAxis domain={['auto', 'auto']} width={44} tickLine={false} tickFormatter={fmt} tickCount={4} />
            <Area dataKey="band" className="band" stroke="none" isAnimationActive={false} activeDot={false} />
            <Line
              dataKey="normal"
              className="line-normal"
              dot={false}
              activeDot={false}
              strokeWidth={1}
              strokeDasharray="2 4"
              isAnimationActive={false}
            />
            <ReferenceLine x={currentDay} className="today-line" strokeDasharray="1 3" />
            <Line
              dataKey="value"
              className="line-value"
              type="monotone"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="forecast"
              className="line-forecast"
              type="monotone"
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls={false}
              isAnimationActive={false}
            />
            <Tooltip
              cursor={{ stroke: 'var(--line)' }}
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
              labelFormatter={(d) => tickLabel(Number(d))}
              formatter={(v, name) => {
                const key = String(name)
                if (key === 'band' && Array.isArray(v))
                  return [`${fmt(Number(v[0]))}–${fmt(Number(v[1]))} ${unit}`, series.bandLabel]
                return [`${fmt(Number(v))} ${unit}`, SERIES_NAMES[key] ?? key]
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="trend-legend" aria-hidden="true">
        <span>
          <span className="legend-line" />
          You
        </span>
        <span>
          <span className="legend-line dashed" />
          Forecast
        </span>
        <span>
          <span className="legend-band" />
          {series.bandLabel}
        </span>
        <span>
          <span className="legend-line dotted" />
          Your normal
        </span>
      </div>
    </figure>
  )
}
