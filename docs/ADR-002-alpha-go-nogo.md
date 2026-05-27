# ADR-002: Alpha Release Go/No-Go Criteria

**Date:** 2026-05-27  
**Status:** Draft — pending pre-launch checklist completion  
**Deciders:** Dylan  

## Context
Founder Fate alpha opens to ≤100 invited founders. This ADR captures the go/no-go criteria and sign-off process.

## Decision
Alpha proceeds when ALL of the following are true:

### Technical
1. All vitest unit tests pass with ≥70% line coverage on `src/lib/*`
2. MiroFish pytest suite passes with ≥80% coverage
3. Playwright E2E: auth, security, and billing tests pass
4. `/admin/health` shows all services green in production
5. Simulation end-to-end works: run → SSE progress → consequence tree → share

### Security
6. Security headers present in production (verified via curl)
7. IDOR test: non-owner gets 404 on `/api/sim/[id]/results`
8. Share rate limit fires at 10+ req/s
9. All secrets rotated from dev values
10. CCPA opt-out toggle works

### Legal
11. ToS published at /terms
12. Privacy Policy published at /privacy with all required GDPR/CCPA sections
13. Age gate (18+) active on onboarding
14. Liability disclaimer on all result pages

### Operational
15. BetterStack status page live and monitoring
16. Nightly Postgres backup running
17. Runbook written and shared with on-call
18. Kill switches tested (signups_open flag, MiroFish scale-to-zero)

## Consequences
- If all 18 criteria pass: set `signups_open = true`, send alpha invites
- If any criteria fail: block launch, resolve within 48h or push date
- Post-alpha: weekly fidelity reviews, monthly retrospectives
