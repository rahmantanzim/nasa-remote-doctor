// Seeded, stateless noise for the simulation (SPEC.md #7). No Math.random().
//
// Every draw is a pure function of (seed, day, channel). It keeps no state,
// so adding a new model or channel never changes the numbers that existing
// channels already produce. Same seed = same crew history, on every machine.

/** murmur3 32-bit finalizer: spreads input bits evenly across the output. */
function mix32(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** FNV-1a 32-bit string hash. */
function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const TWO_POW_32 = 4294967296

/** Uniform number in the open interval (0, 1). */
export function uniform(seed: number, day: number, channel: string): number {
  let h = mix32(seed ^ 0x9e3779b9)
  h = mix32(h ^ Math.imul(day + 1, 0x27d4eb2d))
  h = mix32(h ^ hashString(channel))
  return (h + 0.5) / TWO_POW_32
}

/** Standard normal number (mean 0, SD 1), via Box–Muller. */
export function gaussian(seed: number, day: number, channel: string): number {
  const u1 = uniform(seed, day, `${channel}#1`)
  const u2 = uniform(seed, day, `${channel}#2`)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/** True with probability p (0 … 1). */
export function chance(seed: number, day: number, channel: string, p: number): boolean {
  return uniform(seed, day, channel) < p
}
