# 3. Components Map

Trigger → Input → Context → Processing → AI → Output.

| Stage | What it is | In this build |
|---|---|---|
| **Trigger** | A caller dials the studio number at any hour | Voice platform (Vaani) answers; on hang-up it POSTs the finished call to `/webhook/call-ended` (`src/router.js`), protected by a shared secret |
| **Input** | Call id, phone, start time, duration, speaker-tagged transcript, recording URL, voice cost | The webhook payload; checked for `callId`, `phone`, `transcript` |
| **Context** | What the system must know to behave like Aangan | `config/business.json` (services, out-of-scope, Pune place names, thresholds, the fixed price deflection, unit costs); `agent/agent_instructions.md` (the rules from services.md, pricing.md and qualified.md); store lookup by phone for repeat callers |
| **Processing** | Deterministic steps around the AI | `classify.js` extracts fields and applies thresholds → Forward / Forward with flag / Decline / Human; `handoff.js` builds the note; `pricing.js` guards against price leakage; `store.js` makes retries idempotent |
| **AI** | The part that needs judgement | (1) The live voice conversation, run by the voice platform under the instructions file. (2) Optional: replace the rule-based extractor with an LLM extractor behind the same `classify()` interface for messy speech |
| **Output** | What people actually receive | Telegram note with a Claim button and the transcript as a reply; booking email to the team; dashboard row with transcript, recording, evidence and cost; stats (volume, % within 5 min, forwarded, booked, cost per call and per lead) |

```
Call ─► Voice agent ─► call-ended webhook ─► classify ─► handoff note ─┬─► Telegram (claim + transcript)
                                │                                      ├─► Email (if booked)
                                └─► store ◄── repeat caller lookup     └─► Dashboard + cost
```

## Why Telegram, not email, for the handoff

| | Telegram | Email |
|---|---|---|
| Speed of being seen | Phone notification, usually read in minutes | Often read hours later |
| Claiming | One button; first claim wins, so two designers never both call | No built-in claim; replies to all cause confusion |
| Reminders | The bot re-nudges after 30 minutes unclaimed | Needs extra tooling |
| Transcript | Posted as a reply under the lead | Long attachments, easily missed |
| Formal record | Weaker | Stronger, searchable |

**Decision:** Telegram is the primary handoff because the whole case is about speed (4x conversion within an hour) and about two designers not duplicating a call. Email is kept as a secondary, formal confirmation when a consultation is booked. Honest limit: Telegram needs every designer on the group, and chat history is not a record of truth, so the dashboard is the system of record.

## Extending to WhatsApp and the web form (not built)
Each channel produces the same `{callId, phone, transcript}` record. Only the adapter changes (a WhatsApp Business webhook, a form POST). Classification, handoff, store, notify and dashboard are reused unchanged.
