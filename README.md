# Aangan Studio phone enquiry agent

MESA Case 03. Phone only. Node 18+, no dependencies.

```
npm test          # 17 checks, all offline (Telegram and email in dry-run)
npm run seed      # load synthetic sample calls
set DASHBOARD_PASSWORD=pick-one && set WEBHOOK_SECRET=pick-one && npm run serve
```

Dashboard: http://localhost:3000 (opens directly; phone numbers are masked). Set DASHBOARD_LOCK=1 and DASHBOARD_PASSWORD to require a login.

| Path | What |
|---|---|
| `RUBRIC.md` | The pass/fail rules and which check proves each |
| `docs/` | Automation Brief, Nine Checks and the Cut, Components Map, assumptions |
| `agent/agent_instructions.md` | What the voice agent says and never says |
| `config/business.json` | Every threshold and price range; edit this, not code |
| `src/` | classify, handoff, pricing guard, notify, store, stats, server, dashboard |
| `SYSTEM_STATUS.md` | Status of the earlier, deployed build |

Next steps: see `docs/ASSUMPTIONS.md`.
