// Start screen: "Who is using this tablet?" (prototype — no password).

import type { CrewMember } from '../types'

interface Props {
  crew: CrewMember[]
  onSignIn: (crewId: string) => void
}

export function SignIn({ crew, onSignIn }: Props) {
  return (
    <main className="signin">
      <div className="signin-head">
        <p className="brand-name">Remote Doctor</p>
        <h1 className="signin-title">Who is using this tablet?</h1>
        <p className="signin-sub">You will see your own health data. Prototype: no password.</p>
      </div>
      <ul className="signin-list">
        {crew.map((c) => (
          <li key={c.id}>
            <button type="button" className="signin-button" onClick={() => onSignIn(c.id)}>
              <span className="signin-name">{c.name}</span>
              <span className="signin-role">{c.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
