// Small trend chart (SPEC.md F2 item 5): one key value over mission days,
// with the person's normal as a band. Shows change over time — not decoration.

import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendSeries } from '../engine/series'

interface Props {
  series: TrendSeries
}

export function TrendChart({ series }: Props) {
  const data = series.points.map((p) => ({ day: p.day, value: p.value, band: [p.low, p.high] as [number, number] }))
  const last = series.points[series.points.length - 1]
  const lastDay = last?.day ?? 1
  const ticks = [1, Math.round(lastDay / 2), lastDay]
  const fmt = (v: number) => v.toFixed(series.decimals)
  const tooltipLabel = `${series.label} over mission days, now ${last ? fmt(last.value) : '—'} ${series.unit}.`

  return (
    <figure className="trend" aria-label={tooltipLabel}>
      <figcaption className="trend-head">
        <span>{series.label}</span>
        {last && (
          <span className="num">
            {fmt(last.value)} {series.unit}
          </span>
        )}
      </figcaption>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="day" type="number" domain={[1, lastDay]} ticks={ticks} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              width={44}
              tickLine={false}
              tickFormatter={(v: number) => fmt(v)}
              tickCount={4}
            />
            <Area dataKey="band" stroke="none" isAnimationActive={false} activeDot={false} />
            <Line dataKey="value" dot={false} strokeWidth={2} stroke="currentColor" isAnimationActive={false} />
            <Tooltip
              cursor={{ stroke: 'var(--line)' }}
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(v, name) =>
                name === 'band' && Array.isArray(v)
                  ? [`${fmt(Number(v[0]))}–${fmt(Number(v[1]))} ${series.unit}`, series.bandLabel]
                  : [`${fmt(Number(v))} ${series.unit}`, 'Value']
              }
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
          <span className="legend-band" />
          {series.bandLabel}
        </span>
      </div>
    </figure>
  )
}
