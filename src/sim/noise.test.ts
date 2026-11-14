import { describe, expect, it } from 'vitest'
import { chance, gaussian, uniform } from './noise'

describe('seeded noise', () => {
  it('same inputs give the same number', () => {
    expect(uniform(42, 10, 'hr')).toBe(uniform(42, 10, 'hr'))
    expect(gaussian(42, 10, 'hr')).toBe(gaussian(42, 10, 'hr'))
  })

  it('different seed, day or channel gives a different number', () => {
    const a = uniform(42, 10, 'hr')
    expect(uniform(43, 10, 'hr')).not.toBe(a)
    expect(uniform(42, 11, 'hr')).not.toBe(a)
    expect(uniform(42, 10, 'bp')).not.toBe(a)
  })

  it('uniform stays in (0, 1) with mean ≈ 0.5; gaussian has mean ≈ 0, SD ≈ 1', () => {
    const N = 20_000
    let su = 0
    let sg = 0
    let sg2 = 0
    for (let d = 0; d < N; d++) {
      const u = uniform(7, d, 'test')
      expect(u).toBeGreaterThan(0)
      expect(u).toBeLessThan(1)
      su += u
      const g = gaussian(7, d, 'test')
      sg += g
      sg2 += g * g
    }
    expect(su / N).toBeCloseTo(0.5, 1)
    expect(sg / N).toBeCloseTo(0, 1)
    expect(Math.sqrt(sg2 / N - (sg / N) ** 2)).toBeCloseTo(1, 1)
  })

  it('chance(p) is true about p of the time', () => {
    let hits = 0
    for (let d = 0; d < 10_000; d++) if (chance(3, d, 'c', 0.2)) hits++
    expect(hits / 10_000).toBeCloseTo(0.2, 1)
  })
})
