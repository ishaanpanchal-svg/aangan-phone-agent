# Assumptions and open questions

The case files are now in `Case 03 Seed Data/` and the rules are built from them. What is still assumed:

| Assumption | Why | Where |
|---|---|---|
| Minimum budget Rs 3.5 lakh | pricing.md gives Rs 3.5 lakh as the lowest single-room price. T10 (Rs 1 to 1.5 lakh) was declined by the front desk | `config/business.json` |
| 500 sq ft commercial minimum | Only in transcript T18, not in services.md | same |
| Under 6 weeks declined, 6 to 8 weeks flagged | services.md says 6 weeks; qualified.md says 8 to 10 weeks. They disagree | same |
| Unit costs (voice Rs 5.5/min, AI Rs 0.8/call) | Placeholders until real invoices | same |
| Webhook field names | Not known until Vaani docs are checked | `src/server.js` |
| Expected answers for the 18 phone calls | My reading of qualified.md, not an answer key | `samples/enquiries.js` |
| Nine check names | Session notes not provided | `docs/02_nine_checks.md` |

## Questions for Nikhil
1. services.md says under 6 weeks is impossible, qualified.md says 8 to 10 weeks. Which is the rule?
2. Is there a minimum size for offices (500 sq ft was only said on one call)?
3. What budget is "clearly too low"? We use Rs 3.5 lakh.
4. May calls be recorded, and for how long?
5. A caller whose request is the same day as a festival (Diwali): who decides?

## Known limit
T07 (Diwali): festival dates are not parsed, so the agent must ask "when do you need it complete?". Result is Forward with flag.

## Not proven offline
The voice call, Telegram, email and booking need real accounts. The 35 tests prove the logic.
