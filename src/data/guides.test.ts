import { describe, expect, it } from 'vitest'
import { BODY_PARTS } from './bodyParts'
import { CHECK_IN_NUMBER_FIELDS } from './checkInFields'
import { BODY_PART_GUIDES, GUIDE_FOR_FIELD, type Guide, INDICATOR_GUIDES } from './guides'

const complete = (g: Guide | undefined, tag: string) => {
  expect(g, tag).toBeDefined()
  if (!g) return
  expect(g.title.length, tag).toBeGreaterThan(2)
  expect(g.steps.length, tag).toBeGreaterThanOrEqual(3)
  expect(g.steps.length, tag).toBeLessThanOrEqual(4)
  expect(g.why.length, tag).toBeGreaterThan(20)
  expect(g.escalate.length, tag).toBeGreaterThan(20)
}

describe('"How to measure" guides (SPEC F8)', () => {
  it('every check-in number field has a guide', () => {
    for (const f of CHECK_IN_NUMBER_FIELDS) complete(INDICATOR_GUIDES[GUIDE_FOR_FIELD[f.key]], f.key)
  })

  it('mood and both symptom groups have guides', () => {
    for (const id of ['mood', 'headAndEyes', 'otherSymptoms'] as const) complete(INDICATOR_GUIDES[id], id)
  })

  it('every body part has a guide', () => {
    for (const p of BODY_PARTS) complete(BODY_PART_GUIDES[p.id], p.id)
  })
})
