# Founder Fate Alpha Launch Checklist

**Target:** Internal alpha (≤100 founders)  
**Date:** TBD  
**Owner:** Dylan  

---

## Pre-Launch (T-7 days)

### Infrastructure
- [ ] Vercel project connected to GitHub, auto-deploy on main ✅
- [ ] Fly.io app `founderfate-mirofish` deployed and healthy
- [ ] Neon/Supabase Postgres provisioned, connection string in env
- [ ] Upstash Redis provisioned, REST URL + token in env
- [ ] All secrets set in Vercel dashboard (NEXTAUTH_SECRET, STRIPE_*, OPENROUTER_API_KEY, etc.)

### Services
- [ ] Stripe: Free ($0), Pro ($49/mo), Enterprise products created; price IDs in env
- [ ] Resend: sender domain verified (founderfate.ai), API key in env
- [ ] Amplitude: project created, API key in env
- [ ] Sentry: project created, DSN in env
- [ ] BetterStack: status page live at https://status.founderfate.ai
- [ ] ADMIN_EMAILS env set to Dylan's email for auto-promotion on signup

### Security
- [ ] All secrets rotated from development values
- [ ] SIMULATION_SEED_SECRET set to cryptographically random 32-byte hex
- [ ] EMAIL_INDEX_PEPPER set to cryptographically random value
- [ ] MIROFISH_INTERNAL_TOKEN rotated
- [ ] CRON_SECRET set for Vercel cron jobs
- [ ] Debug flags off: NODE_ENV=production, no LLM_GATEWAY_MODE=mock in production env

### Features
- [ ] `signups_open` feature flag set to `false` (invite-only)
- [ ] `premortem_enabled` feature flag set to `true`
- [ ] `custom_models_enabled` flag set to `false` (stretch feature)
- [ ] `marketplace_enabled` flag set to `false` (deferred)

### Data
- [ ] Prisma migrations applied to production DB
- [ ] 5 default feature flags seeded via `/admin/flags` first load
- [ ] 7 scenarios available via `/api/scenarios`
- [ ] Backup cron verified: `pg_dump` running nightly

### Legal
- [ ] Terms of Service published at /terms ✅
- [ ] Privacy Policy published at /privacy ✅
- [ ] Cookie Policy published at /cookies ✅
- [ ] DPA available on request (email legal@founderfate.ai)
- [ ] Age verification gate active for onboarding ✅
- [ ] CCPA "Do Not Sell" toggle active in profile settings ✅
- [ ] Liability disclaimer footer on all result pages ✅

---

## Launch Day (T-0)

### Pre-send (T-2h)
- [ ] Full smoke test: sign up → onboard → run sim → view results → share
- [ ] Admin console working: /admin → users → simulations → llm → health
- [ ] Stripe test purchase in production mode (then refund)
- [ ] MiroFish health: `curl https://founderfate-mirofish.fly.dev/health` → `{"ok":true}`
- [ ] Sentry test event received
- [ ] Amplitude test event visible in dashboard

### Alpha invite send (T-0)
- [ ] Generate 100 invite codes via `/admin/invites` (cap=1, expires=30d)
- [ ] Set `signups_open = true` in `/admin/flags`
- [ ] Send invite emails from Resend
- [ ] Monitor `/admin/health` and `/admin/simulations` for first hour

### Post-launch (T+1h)
- [ ] First sim completed — review results quality
- [ ] Error rate < 5% (check Sentry)
- [ ] No unexpected Stripe events
- [ ] Status page green

---

## Rollback Plan
1. Kill switch: `signups_open = false` in `/admin/flags`
2. Stop sims: `flyctl scale count 0 --app founderfate-mirofish`
3. Revert Next.js: Vercel dashboard → previous deployment → Promote
4. Communicate via status page: https://status.founderfate.ai

---

## Go/No-Go Criteria
| Check | Owner | Status |
|-------|-------|--------|
| All vitest tests pass (≥70% coverage) | Eng | 🔲 |
| MiroFish pytest pass (≥80% coverage) | Eng | 🔲 |
| E2E Playwright: auth + security tests pass | Eng | 🔲 |
| Security headers verified in prod | Eng | 🔲 |
| Stripe checkout works in production | Eng | 🔲 |
| ToS + Privacy published | Legal | 🔲 |
| BetterStack monitoring active | Ops | 🔲 |
| 10 internal test runs completed successfully | Eng | 🔲 |
| **GO / NO-GO decision** | Dylan | 🔲 |
