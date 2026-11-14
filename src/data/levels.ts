import type { EscalationLevel } from '../types'

// Escalation level names and meanings. Source: SPEC.md F5 table.
export const LEVELS: Record<EscalationLevel, { name: string; meaning: string }> = {
  1: { name: 'Self-care', meaning: 'Handle it yourself. Follow the steps.' },
  2: { name: 'Crew Medical Officer', meaning: 'Show a crewmate today.' },
  3: { name: 'Flight Surgeon', meaning: 'Added to the Earth report. The answer comes later.' },
  4: { name: 'Urgent protocol', meaning: 'Act now. Do not wait for Earth.' },
}
