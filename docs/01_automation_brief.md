# 1. Automation Brief: Aangan Studio phone enquiries

## The Why

**Pain.** About 200 enquiries a month. Roughly 48% get no reply within 48 hours, and about a third arrive outside the front desk's 10am to 7pm cover. Nikhil's own data: an enquiry answered inside an hour converts at 4x the rate of one answered next day. At an average project of Rs 8 to 14 lakh, every lost enquiry is a large loss. When an enquiry does reach a designer it arrives as a forwarded message with no context, so the designer's first call repeats the front desk's questions.

**User.** Two users with different needs:
- *The caller* (a homeowner or small-office owner in Pune): wants to be answered now, be understood, and know what happens next.
- *The designer* (and Nikhil behind them): wants only the enquiries worth their time, with everything already asked.

**Outcome.** Every phone enquiry is answered within 5 minutes, day or night. The ones worth a designer's time reach them with a complete note (who, what, where, size, budget, timeline, booked slot). The rest get a polite answer and cost no designer time. Nikhil sees volume, response time, conversion inputs and the running cost of the tool on a dashboard, with no manual counting.

**How we will know it worked** (measured on the dashboard): % of calls answered in under 5 minutes (target 100%), % of designer handoffs that need no re-asking (target: all note fields filled or marked "not given"), cost per forwarded lead.

## The Journey Today (phone only)

| Step | What happens now | Where it breaks |
|---|---|---|
| 1. Caller rings the studio | Two front-desk staff cover 10am to 7pm | A third of calls land outside hours: voicemail or ringing out |
| 2. Front desk answers | Asks name, need, area, size, budget | Busy desk, calls missed or kept short; answers vary by person |
| 3. Decide if it is worth a designer | Judged by gut feel | No written rule; a good lead can be dropped, a poor one wastes a designer |
| 4. Forward to a designer | Forwarded message, often just a number | Context lost; designer must re-ask everything |
| 5. Designer calls back | Hours to days later | ~48% never get a reply in 48 hours; conversion drops 4x |
| 6. Nikhil reviews performance | Pulls numbers by hand once a month | Slow, effortful, and never includes the cost of the process |

## The Journey With the Build

Call (any hour) → agent answers instantly → asks one question at a time → classifies (Forward, Forward with flag, Polite decline, Human) → Telegram note with claim button and transcript → designer claims in minutes → dashboard updates with volume, response time and cost.

## Out of scope (noted, not built)
WhatsApp and the website form. They extend the same pipeline: each channel only needs an adapter that produces the same `{callId, phone, transcript}` record. See `03_components_map.md`.
