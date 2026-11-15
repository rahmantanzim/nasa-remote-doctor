// "How to measure" link + dialog (SPEC.md F8). Content: src/data/guides.ts.

import { useEffect, useRef, useState } from 'react'
import type { Guide } from '../data/guides'

/** Small "How to measure" button that opens the guide. */
export function GuideLink({ guide, label = 'How to measure' }: { guide: Guide; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="guide-link"
        aria-label={`${label}: ${guide.title}`}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && <GuideDialog guide={guide} onClose={() => setOpen(false)} />}
    </>
  )
}

function GuideDialog({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => opener?.focus()
  }, [])
  return (
    <div className="overlay overlay-top" role="presentation" onClick={onClose}>
      <div
        className="guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            // Close only this guide, not a check-in underneath.
            e.stopPropagation()
            onClose()
          }
        }}
      >
        <header className="checkin-head">
          <h2 id="guide-title" className="checkin-title">
            {guide.title}
          </h2>
          <button type="button" className="back-button" onClick={onClose}>
            Close
          </button>
        </header>
        <section>
          <p className="section-label">How to measure</p>
          <ol className="steps">
            {guide.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
        <section>
          <p className="section-label">Why it matters in space</p>
          <p>{guide.why}</p>
        </section>
        <section className="guide-escalate">
          <p className="section-label">When to get help</p>
          <p>{guide.escalate}</p>
        </section>
      </div>
    </div>
  )
}
