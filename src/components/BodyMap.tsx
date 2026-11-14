// Body Map — the "Ghost Self" (SPEC.md F2).
// The astronaut projected to landing day. Each body part glows by how much
// attention it needs, and always carries a text label (never colour alone).
// The labels are the keyboard/screen-reader controls; the SVG shapes are
// the same targets for mouse and touch.

import { type ReactNode, useState } from 'react'
import { BODY_PART_BY_ID } from '../data/bodyParts'
import { LEVELS } from '../data/levels'
import type { BodyPartId, BodyPartStatus } from '../types'
import {
  BODY_PATH,
  HALO_TRANSFORM,
  HEAD,
  LABEL_LEFT_X,
  LABEL_RIGHT_X,
  LABEL_W,
  PLACEMENT,
  VIEW_H,
  VIEW_W,
} from './bodyShape'
import { FORECAST_WORD, TREND_WORD } from './labels'

interface Props {
  crewName: string
  statuses: BodyPartStatus[]
  selectedPart: BodyPartId | null
  onSelect: (part: BodyPartId) => void
}

type Tone = 'calm' | 'watch' | 'alert'

/** Visual weight: Level 2+ draws the eye; drifting/declining at Level 1 is "watch". */
function toneOf(s: BodyPartStatus): Tone {
  if (s.escalationLevel >= 2) return 'alert'
  if (s.status === 'drifting' || s.status === 'declining') return 'watch'
  return 'calm'
}

/** The organ shapes. Each is drawn twice: blurred glow + crisp shape. */
function partShape(part: BodyPartId): ReactNode {
  switch (part) {
    case 'brain':
      return <ellipse cx={260} cy={58} rx={25} ry={20} />
    case 'eyes':
      return (
        <>
          <ellipse cx={247} cy={84} rx={7} ry={3.6} />
          <ellipse cx={273} cy={84} rx={7} ry={3.6} />
        </>
      )
    case 'heart':
      return <path d="M276 222 C262 210 260 196 269 193 C273 192 276 195 277 198 C278 195 281 192 285 193 C294 196 291 210 276 222 Z" />
    case 'immune':
      return (
        <>
          {[
            [247, 128],
            [273, 128],
            [228, 196],
            [292, 196],
            [242, 338],
            [278, 338],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} />
          ))}
        </>
      )
    case 'metabolism':
      return <ellipse cx={260} cy={282} rx={25} ry={16} />
    case 'muscles':
      return (
        <>
          <ellipse cx={233} cy={400} rx={15} ry={42} />
          <ellipse cx={287} cy={400} rx={15} ry={42} />
          <ellipse cx={186} cy={232} rx={7} ry={30} />
          <ellipse cx={334} cy={232} rx={7} ry={30} />
        </>
      )
    case 'bones':
      return (
        <>
          <ellipse cx={260} cy={330} rx={38} ry={11} />
          <rect x={232} y={466} width={6} height={100} rx={3} />
          <rect x={282} y={466} width={6} height={100} rx={3} />
        </>
      )
    case 'sleep':
      return <path d={BODY_PATH} />
    case 'radiation':
      return (
        <g transform={HALO_TRANSFORM}>
          <path d={BODY_PATH} />
          <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx + 6} ry={HEAD.ry + 6} />
        </g>
      )
  }
}

/** Larger invisible pointer targets for small organs. */
function hitShape(part: BodyPartId): ReactNode {
  switch (part) {
    case 'brain':
      return <ellipse cx={260} cy={56} rx={32} ry={24} />
    case 'eyes':
      return <rect x={232} y={74} width={56} height={20} rx={8} />
    case 'heart':
      return <circle cx={277} cy={206} r={22} />
    case 'immune':
      return (
        <>
          <rect x={236} y={118} width={48} height={20} rx={8} />
          <circle cx={228} cy={196} r={14} />
          <circle cx={292} cy={196} r={14} />
          <rect x={232} y={328} width={56} height={20} rx={8} />
        </>
      )
    case 'metabolism':
      return <ellipse cx={260} cy={282} rx={34} ry={24} />
    default:
      return partShape(part)
  }
}

// Draw order: whole-body layers at the back, organs on top.
const DRAW_ORDER: BodyPartId[] = [
  'sleep',
  'radiation',
  'bones',
  'muscles',
  'metabolism',
  'immune',
  'heart',
  'brain',
  'eyes',
]

function chipLabel(s: BodyPartStatus): string {
  const info = BODY_PART_BY_ID[s.part]
  return `${info.name}: ${FORECAST_WORD[s.status]}, ${TREND_WORD[s.trend]}. Level ${s.escalationLevel}, ${LEVELS[s.escalationLevel].name}. Show details.`
}

export function BodyMap({ crewName, statuses, selectedPart, onSelect }: Props) {
  const [hover, setHover] = useState<BodyPartId | null>(null)
  const byPart = Object.fromEntries(statuses.map((s) => [s.part, s])) as Record<BodyPartId, BodyPartStatus>
  const isActive = (p: BodyPartId) => p === selectedPart || p === hover

  return (
    <div className="bodymap">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Body map for ${crewName}, projected to landing day. Use the labels to open each body part.`}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="aura" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Leader lines from labels to the body */}
        {DRAW_ORDER.map((part) => {
          const { side, labelY, anchor } = PLACEMENT[part]
          const x0 = side === 'left' ? LABEL_LEFT_X + LABEL_W + 2 : LABEL_RIGHT_X - 2
          const active = isActive(part)
          return (
            <g key={`leader-${part}`} aria-hidden="true">
              <path
                className={`leader${active ? ' is-active' : ''}`}
                d={`M${x0} ${labelY} L${(x0 + anchor[0]) / 2} ${labelY} L${anchor[0]} ${anchor[1]}`}
              />
              <circle className={`leader-dot${active ? ' is-active' : ''}`} cx={anchor[0]} cy={anchor[1]} r={2.2} />
            </g>
          )
        })}

        {DRAW_ORDER.filter((p) => p === 'sleep' || p === 'radiation').map((part) => (
          <Region key={part} part={part} status={byPart[part]} active={isActive(part)} onSelect={onSelect} onHover={setHover} />
        ))}

        <path className="body-outline" d={BODY_PATH} />
        <ellipse className="body-outline" cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />

        {DRAW_ORDER.filter((p) => p !== 'sleep' && p !== 'radiation').map((part) => (
          <Region key={part} part={part} status={byPart[part]} active={isActive(part)} onSelect={onSelect} onHover={setHover} />
        ))}
      </svg>

      <ul className="chips">
        {statuses.map((s) => {
          const { side, labelY } = PLACEMENT[s.part]
          const tone = toneOf(s)
          return (
            <li key={s.part}>
              <button
                type="button"
                className={`chip side-${side} tone-${tone}${hover === s.part ? ' is-hover' : ''}`}
                style={{
                  left: `${((side === 'left' ? LABEL_LEFT_X : LABEL_RIGHT_X) / VIEW_W) * 100}%`,
                  top: `${(labelY / VIEW_H) * 100}%`,
                }}
                aria-pressed={selectedPart === s.part}
                aria-label={chipLabel(s)}
                onClick={() => onSelect(s.part)}
                onMouseEnter={() => setHover(s.part)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.part)}
                onBlur={() => setHover(null)}
              >
                <span className="chip-name">{BODY_PART_BY_ID[s.part].shortName}</span>
                <span className="chip-status">
                  {FORECAST_WORD[s.status]}
                  {s.escalationLevel >= 2 ? ` · Level ${s.escalationLevel}` : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Region({
  part,
  status,
  active,
  onSelect,
  onHover,
}: {
  part: BodyPartId
  status: BodyPartStatus
  active: boolean
  onSelect: (p: BodyPartId) => void
  onHover: (p: BodyPartId | null) => void
}) {
  const layer = part === 'sleep' || part === 'radiation' ? ` layer-${part}` : ''
  return (
    // Pointer target only; the matching label button is the keyboard control.
    <g
      className={`region tone-${toneOf(status)}${layer}${active ? ' is-active' : ''}`}
      aria-hidden="true"
      onClick={() => onSelect(part)}
      onMouseEnter={() => onHover(part)}
      onMouseLeave={() => onHover(null)}
    >
      <g className="region-glow">{partShape(part)}</g>
      <g className="region-shape">{partShape(part)}</g>
      <g className="region-hit">{hitShape(part)}</g>
    </g>
  )
}
