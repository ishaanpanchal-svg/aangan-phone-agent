# Rubric: Aangan Studio phone enquiry agent (Case 03)

Modelled on the checklist in `SYSTEM_STATUS.md`. Each item is pass/fail and has a named check in `npm test`. Items marked **(live)** need real credentials and cannot be proven offline.

## A. Voice agent behaviour (the 12 instruction rules)

| # | Rule | Check |
|---|---|---|
| A1 | One question per turn | `test/run.js` (rule text present) + call review |
| A2 | Never repeats back what the caller said | rule text + call review |
| A3 | No praise or commentary ("great!", "lovely!") | rule text + call review |
| A4 | A price question gets only the fixed deflection, never a number, range or per-sq-ft figure | `test/run.js` |
| A5 | A price question never ends the call or disqualifies the caller (qualified.md) | `test/run.js` |
| A6 | Needs it in under 6 weeks: declined kindly, never promised a date | `test/run.js` |
| A7 | Polite close that states what happens next and when | rule text |
| A8 | Complaints and existing-client issues go to a human, not the agent | `test/run.js` |
| A9 | Never asks for an email (spoken emails are misheard) | rule text |
| A10 | Out-of-scope work (see `config/business.json`) is declined politely, without a designer handoff | `test/run.js` |
| A11 | No leftover template text (`{{`, `TODO`, `lorem`) in the live prompt | `test/run.js` |
| A12 | Answers within 5 minutes, day or night (the call is answered immediately, 24x7) | **(live)** |

## B. Agent configuration (Vaani) **(live)**

Greeting set; call cap 5 minutes; idle prompt 15 s, hang-up 45 s; Pune place names in speech recognition (`config/business.json: placeNames`); calendar tools attached and pointing at the right event type; stand-in email for callers without one must be a deliverable address, never `example.com`.

## C. Handoff note

| # | Rule | Check |
|---|---|---|
| C1 | Note contains name, phone, project type, location, size, budget, timeline, booked slot, and a 2-line summary | `test/run.js` |
| C2 | The designer's first call never needs to repeat a question the agent asked (every field either filled or marked "not given") | `test/run.js` |
| C3 | No price is ever stored or sent | `test/run.js` |
| C4 | Delivered to Telegram (claim button, first claim wins, 30 min reminder, transcript reply; button presses need the public address (step 5)) | `test/run.js` (dry-run) |
| C5 | Repeat caller (same phone) is recognised, not duplicated | `test/run.js` |

## D. Qualification

| # | Rule | Check |
|---|---|---|
| D1 | Nikhil's five criteria (real project, Pune/PCMC, timeline, budget, decision-maker) give Forward / Forward with flag / Decline / Human with the reason. Checked on the 18 real phone calls | `test/run.js` |
| D2 | Thresholds come from `config/business.json`, not code, so Nikhil can change them | `test/run.js` |

## E. Dashboard

| # | Rule | Check |
|---|---|---|
| E1 | Enquiries per day, % answered in under 5 min, % forwarded, bookings | `test/run.js` |
| E2 | **Cost of the tool**: per call (voice, AI, messaging) and total, plus cost per forwarded lead | `test/run.js` |
| E3 | Transcript and evidence per call, behind a password | `test/run.js` |
| E4 | Nikhil never has to pull numbers manually | E1 to E3 together |

## F. Honesty and safety

- No key is committed; everything comes from environment variables (`.env.example`).
- Placeholder assumptions are listed in `docs/ASSUMPTIONS.md`, never hidden.
- Anything unproven is labelled **(live)** in `SYSTEM_STATUS.md`, not reported as done.

## G. Documents (pre-class)

Automation Brief, Nine Checks with the Cut, Components Map, plus the written justification of Telegram vs email. All in `docs/`.
