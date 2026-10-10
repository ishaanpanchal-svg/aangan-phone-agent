# 2. Nine Checks

> The course's definition of the nine checks was not in the files provided. These are nine standard automation-readiness checks. If your session notes use different names, keep the evidence and rename the headings. The case brief says "Arjun" where it means Nikhil; the Cut below is about Nikhil's third request.

| # | Check | Evidence from the case | Verdict |
|---|---|---|---|
| 1 | **Real, repeated pain** | ~200 enquiries a month; ~48% unanswered after 48 hours | Pass |
| 2 | **Measurable value** | Under 1 hour = 4x conversion; project value Rs 8 to 14 lakh. Even a few recovered enquiries a month cover the tool's cost (a call costs a few rupees) | Pass |
| 3 | **Clear trigger and boundaries** | Trigger is an incoming call. Phone only; WhatsApp and the web form are out of scope | Pass |
| 4 | **Input available and good enough** | 40 real transcripts, services.md, qualified.md. Speech recognition of Pune place names and spoken numbers is the weak point | Pass with care (place-name hints, no emails by voice) |
| 5 | **Rules can be written down** | qualified.md is Nikhil's own description of a worthwhile enquiry; services.md says what is out of scope | Pass (thresholds go in config, not code) |
| 6 | **Safe to be wrong** | A wrong classification costs a designer a few minutes or a lost lead. Flagging and a human escape route limit this | Pass with a human path for complaints |
| 7 | **Data we are allowed to use** | Callers volunteer name, phone and project details; recordings need disclosure and a retention rule | Pass, needs a spoken recording notice |
| 8 | **Someone owns it** | The founder's office owns the build; designers own follow-up; Nikhil owns the rules | Pass |
| 9 | **Can the AI be trusted with this specific output?** | Pricing. pricing.md says "indicative only, varies by site". A single per-sq-ft quote becomes a promise a designer must later break | **Fails as asked** |

## The Cut

**Nikhil asked:** "the system should be able to quote our standard per-square-foot pricing so people don't have to wait for that."

**Check 9 stops it.** `pricing.md` opens with: "indicative only, varies by site... No number from this guide should be quoted to a client", and ends with a list of what the agent must never say (any number, any range, "rates start at", "for a 2BHK it's typically"). The September calls show why: in T13 the front desk explains that a standard vs premium kitchen alone can differ 3x. A number given on the phone becomes a promise the designer must later break, on a Rs 8 to 14 lakh job.

**What we build instead.** When a caller asks about price, the agent gives one fixed reply (pricing depends on site, materials and scope; the designer explains at the consultation; "I can book that for you right now"). A price question never disqualifies the caller (qualified.md). The dashboard and the designer note record "caller asked about price" so the designer is ready. No price figure is ever stored or sent (tested). The value Nikhil wanted, that people do not wait, is met by booking the consultation immediately.

## Other things deliberately not built
- Booking designers by skill or area across 14 designers (needs team scheduling; one calendar is used).
- Anything on WhatsApp or the form.
- Emailing the caller (agent never asks for an email).
