// Hand-made front-view body outline for the Body Map (SVG geometry only).
// Coordinates are in a 520 × 640 viewBox; the body is centred on x = 260.

import type { BodyPartId } from '../types'

export const VIEW_W = 520
export const VIEW_H = 640
const CX = VIEW_W / 2

type Pt = readonly [number, number]

/** Right half of the outline, from the neck down to the crotch. Mirrored for the left. */
const RIGHT_HALF: Pt[] = [
  [274, 112], // neck, under the head
  [276, 136],
  [300, 146], // shoulder slope
  [326, 156],
  [340, 178], // shoulder
  [344, 216], // upper arm, outside
  [348, 264], // elbow
  [352, 312],
  [354, 350], // wrist
  [358, 372], // hand
  [353, 394],
  [344, 391],
  [340, 360],
  [336, 312], // forearm, inside
  [330, 262],
  [323, 214],
  [315, 192], // armpit
  [312, 236], // chest side
  [305, 282], // waist
  [314, 328], // hip
  [318, 382], // thigh, outside
  [312, 446], // knee
  [314, 502], // calf
  [302, 572], // ankle
  [314, 595], // foot
  [304, 606],
  [280, 603],
  [282, 574],
  [284, 502], // calf, inside
  [282, 446],
  [276, 392],
  [263, 348], // crotch
]

const mirror = ([x, y]: Pt): Pt => [2 * CX - x, y]

/** Closed Catmull–Rom spline through the points, as cubic Bézier SVG path data. */
function smoothClosedPath(points: Pt[]): string {
  const n = points.length
  const at = (i: number) => points[(i + n) % n]
  const f = (v: number) => v.toFixed(1)
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return `${d} Z`
}

/** Full body outline (torso, arms, legs). */
export const BODY_PATH = smoothClosedPath([...RIGHT_HALF, ...[...RIGHT_HALF].reverse().map(mirror)])

/** Head. */
export const HEAD = { cx: CX, cy: 72, rx: 34, ry: 40 }

/** Where each body part's label sits and where its leader line points. */
export interface PartPlacement {
  side: 'left' | 'right'
  /** Label centre height, viewBox units. */
  labelY: number
  /** Point on the body the leader line ends at. */
  anchor: Pt
}

export const LABEL_LEFT_X = 8
export const LABEL_RIGHT_X = 372
export const LABEL_W = 140

export const PLACEMENT: Record<BodyPartId, PartPlacement> = {
  brain: { side: 'left', labelY: 46, anchor: [238, 56] },
  eyes: { side: 'left', labelY: 112, anchor: [244, 84] },
  immune: { side: 'left', labelY: 196, anchor: [228, 196] },
  metabolism: { side: 'left', labelY: 286, anchor: [240, 282] },
  sleep: { side: 'left', labelY: 470, anchor: [196, 470] },
  radiation: { side: 'right', labelY: 46, anchor: [306, 34] },
  heart: { side: 'right', labelY: 204, anchor: [286, 206] },
  muscles: { side: 'right', labelY: 390, anchor: [300, 396] },
  bones: { side: 'right', labelY: 512, anchor: [287, 512] },
}

/**
 * Where the Level 2+ attention ring sits on the figure: the centre of the
 * organ, or a point on the aura/halo for the whole-body layers.
 */
export const MARKER: Record<BodyPartId, Pt> = {
  brain: [260, 52],
  eyes: [260, 84],
  heart: [277, 206],
  immune: [260, 128],
  metabolism: [260, 282],
  muscles: [287, 400],
  bones: [260, 330],
  sleep: [196, 470],
  radiation: [306, 34],
}

/** Radiation halo: the outline scaled out around the body centre. */
export const HALO_TRANSFORM = `translate(${CX} 320) scale(1.09 1.05) translate(${-CX} -320)`
