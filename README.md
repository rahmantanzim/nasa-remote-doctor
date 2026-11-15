# Remote Doctor

**Remote Doctor helps an astronaut on a long mission check their own health every day and know the one thing to do next, even when the doctor on Earth is 20 minutes away.**

NASA Space Apps Challenge 2026 (St. John's) · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions*

> Prototype for education. Not a medical device. All crew data is simulated.

---

## Live demo

**Live demo:** https://nasa-remote-doctor.vercel.app

No login needed. It works offline after the first visit, and you can install it as an app.

### How to try it (about 3 minutes)

1. **Sign in as Cmdr. Maya Okafor.** Look at her "Ghost Self", which shows her body projected to landing day. Eyes, heart and sleep have amber rings. Faded, dotted parts are "fading away".
2. **Click Eyes.** You see early signs of fluid pressing on the eyes (SANS), Level 2, and a trend chart with a forecast to landing day.
3. **Read the One Action card:** "Wear thigh cuffs for 4 hours today". It shows why, the steps, and what to do if Earth cannot answer. Press **Done**.
4. **Do the morning check-in** (about 30 seconds). Adjust a number with + / −, tap your mood and symptoms, then save. The body map updates right away.
5. **Open Earth Report** (toggle at the top) and press **Add to Earth queue**. In the dashed **Demo controls** box, press **Demo: jump to next sync window**. The report is sent. Press it again to jump to the reply: Dr. Hart, the flight surgeon, answers.
6. **Back on Today, try "What if…"** Move exercise to 120 minutes and thigh cuffs to 4 hours. Bones and eyes change to **Recovering**. Press **Reset to my real habits**.
7. **Change the location** (top left): Space Station, Moon base, Mars base. The delay, gravity and radiation change, and everything is recalculated.
8. **Switch user → Dr. Lucas Tremblay**, the Crew Medical Officer. He also sees the crew, with each person's need. His own issue is a radiation dose from a solar event (Level 3: goes to the flight surgeon).
9. **Switch user → Sam Ito.** Everything is steady and solid. This is what "doing well" looks like.

---

## The problem

- NASA lists **5 hazards** of human spaceflight: space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile/closed environments.
- On a long mission they cause bone and muscle loss, fluid shifts that can change the eyes (SANS), poor sleep, weaker immunity, heart changes and low mood.
- On the way to Mars, a message takes **3 to 22 minutes each way**, and the link is only open at certain times. Mission Control cannot help in real time.
- Astronauts are busy and tired, and often say "I'm fine". They need to **check themselves** and **know when to ask for help**.

## Features

- **Ghost Self body map.** Nine body areas, shown as you would be on landing day. Steady parts glow solid; declining parts fade and break up. Amber rings show where to look first. Every glow has a word, never colour alone.
- **One Action.** The single most important thing to do today, with why, steps, an escalation level (1 Self-care · 2 Crew Medical Officer · 3 Flight Surgeon · 4 Urgent) and "If Earth cannot answer".
- **Landing-day forecast.** Every body part has a forecast word (Steady / Drifting / Declining / Recovering), a plain-English trend, a reason, and what it means on landing day.
- **Morning check-in** in about 30 seconds: the 6 NASA-suggested readings plus space-specific symptoms. Values are pre-filled from sensors; you confirm or adjust them.
- **Earth link bar:** ship time, light delay, link open or closed, next sync window, reports waiting, replies received.
- **Earth Report:** daily and weekly reports, a queue that sends at the next sync window, and a flight-surgeon reply after the round-trip delay. Print or save as PDF.
- **"How to measure" guides** for every reading and body part.
- **"What if" sliders:** change exercise, sleep or thigh cuffs and see the landing-day forecast change.
- **Location switch:** Space Station, Moon base, Mars transit, Mars base.
- **Roles:** astronauts see only their own data; the Crew Medical Officer also sees the crew.
- **Offline-first:** no backend and no network calls; installable as an app.

## How it works

```
SIMULATION (src/sim)      realistic body data, day by day (seeded, no randomness)
     ↓
ENGINE (src/engine)       compares you to YOUR normal in space → forecast,
                          escalation level, One Action, landing projection
     ↓
STORE (src/store)         who is signed in, check-ins, actions, reports, clock
                          — saved on the device (localStorage)
     ↓
SCREENS (src/components)  Ghost Self, One Action, check-in, Earth Report

REPORTS (src/reports)     build report → queue → send at sync window → reply
```

- **Your normal, in space.** Each person is compared to their own baseline. Expected space changes are built in, so they never count as problems: the body runs a little warmer, and blood pressure is about 8 points lower.
- **No single bad day escalates.** Readings use weekly middle values, and escalation needs several days or a combination of signs. The one exception is a solar event happening right now: shelter first.
- **Offline-first.** Everything runs on the device. A service worker caches the whole app, including the fonts. There is no backend, database or external API.

## The science (main model rates)

Every number in the code has a comment with its source or the word "assumption".

| Model | Rate used | Source |
|---|---|---|
| Bone loss | Up to 1.5% a month without exercise; a full exercise plan prevents about 70% | CSA ("up to 1.5% per month"); ARED results (Smith et al., JBMR 2012); 70% is an assumption |
| Muscle strength | About 0.15% a day without exercise | Assumption, in line with ~20% leg-strength loss on long flights |
| Fluid shift / SANS | A load score that rises in weightlessness; 4 h a day of thigh cuffs cuts the rise by up to 60% | NASA HRP SANS risk and Thigh Cuff study; numbers are assumptions |
| Sleep debt | Rolling 14-night total below an 8-hour need | Van Dongen et al., Sleep 2003 |
| Blood pressure | About 8 mmHg lower in space | Norsk et al., J Physiol 2015 (ISS) |
| Body temperature | Runs warmer in space ("space fever"); 0.3 °C used for a mouth thermometer | Stahn et al., Sci Rep 2017 (~1 °C core rise); 0.3 °C is an assumption |
| Blood sugar | Inactivity slowly raises fasting sugar; 100 / 126 mg/dL cut-offs | CSA (insulin resistance); ADA cut-offs |
| Mood | Isolation and sleep debt lower mood, with a small "third-quarter" dip | NASA HRP behavioural risk; Bechtel & Berning 1991 (still debated) |
| Radiation | Mars transit 1.8 · Moon 1.4 · Mars surface 0.7 · ISS ~0.5 mSv/day; ~30% neutrons on the ISS; career limit 600 mSv | MSL RAD (Zeitlin et al. 2013); Chang'e-4 (Zhang et al. 2020); Curiosity RAD (Hassler et al. 2014); CSA; NASA-STD-3001 |
| Partial gravity | Gravity-driven effects scale with (1 − g) | Assumption (still an open research question) |

## Simulated data and disclaimer

All three crew members and all their data are **fictional and simulated** by physiology models with seeded variation. The same inputs always give the same data, and no `Math.random()` is used. The flight-surgeon replies are simulated too.

**Prototype for education. Not a medical device.**

## AI disclosure

Built with help from AI tools: Claude (planning, research, specification) and Claude Code (writing and testing code). The author directed the design, scope and decisions, and reviewed the results. No AI-generated images and no NASA branding are used.

## Next steps

- Real wearable sensors and devices (for example Astroskin, ARCHeR, Tempus Pro) instead of simulated values.
- Camera and ultrasound input (for example eye images for SANS).
- A web portal for the flight surgeon on Earth.
- Syncing between crew tablets.

## References

- NASA Human Research Program — 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards
- NASA Human Research Program — Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks
- NASA Human Research Program — Ongoing HRP Research in Space: Thigh Cuff study
- Canadian Space Agency — Monitoring radiation for astronaut health
- Canadian Space Agency — Why do we conduct science experiments in space?
- Zhang et al., *Science Advances* 2020 — First measurements of the radiation dose on the lunar surface (Chang'e-4)
- Norsk et al., *Journal of Physiology* 2015 — Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long-duration spaceflight (ISS)

## Tech stack

Vite · React · TypeScript · Recharts (lazy-loaded) · hand-made SVG body map · vite-plugin-pwa · IBM Plex fonts (bundled locally) · Vitest · Vercel hosting.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev        # open the local link it prints (usually http://localhost:5173)
```

Production build and offline test:

```bash
npm run build
npm run preview    # then turn off the network: the app still works
```

## Run the tests

```bash
npm test           # Vitest: simulation, engine, reports, store logic
npx tsc -b         # type check
npm run lint       # oxlint
```
