# Founder Fate — Operations Runbook

**Last updated:** 2026-05-27  
**On-call rotation:** See Linear > Ops > On-Call Schedule  
**Status page:** https://status.founderfate.ai (BetterStack)  
**Sentry:** https://sentry.io/organizations/founderfate/  

---

## Emergency Contacts

| Role | Contact | Escalation time |
|------|---------|-----------------|
| Primary on-call | Check Linear rotation | Immediate |
| Stripe issues | stripe.com/support | < 2h |
| Vercel issues | vercel.com/support | < 1h |
| Fly.io issues | fly.io/docs/support | < 2h |

---

## Kill Switches

### Stop all new simulations
```bash
# Set feature flag via admin UI: /admin/flags → set "signups_open" to false
# OR set env var and redeploy:
FEATURE_SIM_ENABLED=false  # checked in POST /api/sim/run
```

### Stop MiroFish service
```bash
flyctl scale count 0 --app founderfate-mirofish
# To restart:
flyctl scale count 1 --app founderfate-mirofish
```

### Stop all LLM calls (emergency cost control)
```bash
# Set via admin UI: /admin/flags → set "llm_mock_mode" to true
# All LLM calls fall back to deterministic mock responses
```

---

## Common Incidents

### Incident: MiroFish is down / SSE disconnects
**Symptoms:** Simulations stuck at "queued", SSE connections fail  
**Impact:** Users cannot run simulations  
**Steps:**
1. Check health: `curl https://founderfate-mirofish.fly.dev/health`
2. Check Fly logs: `flyctl logs --app founderfate-mirofish`
3. Check circuit breakers: `/admin/health` page
4. If machine crashed: `flyctl machines restart --app founderfate-mirofish`
5. If persistent: scale down then up: `flyctl scale count 0` then `flyctl scale count 1`
6. Post status update to status page
7. Update SimulationRecord for stuck sims: `UPDATE "SimulationRecord" SET status='failed' WHERE status IN ('queued','running') AND "createdAt" < NOW() - INTERVAL '1 hour'`

### Incident: OpenRouter / LLM provider outage
**Symptoms:** High error rates in `/admin/llm`, circuit breakers open  
**Impact:** Simulations fail at LLM stage  
**Steps:**
1. Check OpenRouter status: https://status.openrouter.ai
2. Check circuit breaker state in `/admin/llm` → Provider Health
3. If single provider down: failover is automatic (M4.5.6)
4. If all providers down: enable mock mode via `/admin/flags` → `llm_mock_mode = true`
5. Monitor spend cap usage — pause if runaway costs detected

### Incident: Stripe webhook failures
**Symptoms:** Upgrades not reflecting in UI, tier mismatch  
**Steps:**
1. Check Stripe dashboard → Developers → Webhooks → Recent deliveries
2. Look for failed events (subscription.updated, checkout.session.completed)
3. Replay failed events from Stripe dashboard
4. Manual fix: Admin → Users → tier override with reason "stripe-webhook-replay"

### Incident: Database connection exhausted
**Symptoms:** 500 errors across all routes, Prisma timeouts  
**Steps:**
1. Check Neon/Supabase connection count in dashboard
2. `SELECT count(*) FROM pg_stat_activity;`
3. Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';`
4. Consider connection pooling (PgBouncer) if recurring

---

## Deployment Procedures

### Standard deploy (Next.js)
```bash
# Vercel auto-deploys on push to main
git push origin main
# Monitor: https://vercel.com/dashboard
```

### Standard deploy (MiroFish)
```bash
cd services/mirofish
flyctl deploy --remote-only
flyctl status --app founderfate-mirofish
```

### Rollback (Next.js)
```bash
# In Vercel dashboard: Deployments → previous deployment → Promote to Production
```

### Rollback (MiroFish)
```bash
flyctl releases list --app founderfate-mirofish
flyctl deploy --image registry.fly.io/founderfate-mirofish:<previous-version>
```

---

## Backup & Restore

### Create Postgres backup
```bash
./scripts/backup-postgres.sh /mnt/backups
```
Nightly backup runs automatically via cron at 01:00 UTC.

### Restore from backup
```bash
# SLO: < 30 minutes restore time
./scripts/restore-postgres.sh /mnt/backups/founderfate_YYYYMMDD_HHMMSS.sql.gz
```

### Fly volume snapshot
```bash
./scripts/fly-snapshot.sh founderfate-mirofish
```
Nightly snapshot via `fly volumes snapshots create` at 01:30 UTC.

---

## SLO Targets (Alpha)

| SLO | Target | Alert threshold |
|-----|--------|-----------------|
| API p95 latency | < 500ms | > 1s for 5 min |
| Simulation start p95 | < 2s | > 5s for 5 min |
| Uptime | 99.5% | < 99% over 1h |
| Crash-free session rate | 99% | < 98% |

---

## Security Checklist (post-incident)
- [ ] Rotate `NEXTAUTH_SECRET`, `MIROFISH_INTERNAL_TOKEN`, `SIMULATION_SEED_SECRET`
- [ ] Review `AdminAuditLog` for unexpected actions
- [ ] Check `AdminAuditLog` for impersonation entries
- [ ] Verify no new ADMIN_EMAILS added
- [ ] Review Sentry for unusual error patterns
