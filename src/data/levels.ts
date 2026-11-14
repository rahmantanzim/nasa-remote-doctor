import type { EscalationLevel } from '../types'

// Escalation level names and meanings. Source: SPEC.md F5 table.
// `need` is the short "what this person needs" phrase for the crew tabs.
export const LEVELS: Record<EscalationLevel, { name: string; meaning: string; need: string }> = {
  1: { name: 'Self-care', meaning: 'Handle it yourself. Follow the steps.', need: 'self-care' },
  2: { name: 'Crew Medical Officer', meaning: 'Show a crewmate today.', need: 'show medical officer' },
  3: { name: 'Flight Surgeon', meaning: 'Added to the Earth report. The answer comes later.', need: 'Earth report' },
  4: { name: 'Urgent protocol', meaning: 'Act now. Do not wait for Earth.', need: 'urgent protocol now' },
}
