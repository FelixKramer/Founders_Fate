# Founder Fate — Task List (Clean Start → Alpha Release)

Derived from [PRD-FOUNDER-FATE.md](PRD-FOUNDER-FATE.md) v0.2.
Target internal alpha: **2026-07-20** (~6 weeks before public GA on 2026-09-01).

## Stack at a glance

**App (existing boilerplate — `FoundersFate-saas-boilerplate/`):**
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Radix) · NextAuth + Prisma adapter · Stripe · Prisma (SQLite dev → Postgres prod) · Zustand · TanStack Query · React Hook Form + Zod · next-intl · Recharts · Bun runtime · Caddy reverse proxy.
Auth, sessions, subscriptions, Stripe webhook, theming, dashboard shell, login/signup pages **already scaffolded** (see [src/app](FoundersFate-saas-boilerplate/src/app), [prisma/schema.prisma](FoundersFate-saas-boilerplate/prisma/schema.prisma), [src/lib/stripe.ts](FoundersFate-saas-boilerplate/src/lib/stripe.ts)).

**Simulation service (fork of MiroFish — `services/mirofish/`):**
Python 3.11 · Flask · file-based JSON · Zep Cloud graph memory · OASIS (camel-oasis) subprocess · OpenAI-compatible LLM client. Repo: https://github.com/666ghj/MiroFish — forked, vendored, and modified into our verticalized "founder decision" pipeline.
**Hosting:** Fly.io Machines (1× shared-cpu-1x / 1GB for alpha, scale up as load demands) with a persistent volume mounted at `/data/uploads`. Region pinned to the Next.js app's primary region to keep internal latency <20ms. SSE friendly, no cold starts on user-facing path, Docker-based local-dev parity.

**Boundary:** Next.js API routes (`src/app/api/sim/*`) own auth + Prisma writes. They proxy simulation work to the internal MiroFish HTTP service (`MIROFISH_URL`) over a private network. MiroFish never sees PII (we pass `user_id` + opaque variables only).

Legend: `[FR-xxx]` traces to PRD functional requirements. `[NFR-x.x]` non-functional. `[BP]` = already present in boilerplate, only needs adapting.

---

## M0 — Workspace Setup (Week 0, ~2 days)

**Locked decisions:**
- **Repo layout:** two independent top-level projects (`app/` and `services/mirofish/`) — no pnpm workspace. Shared concerns live in `infra/` and `scripts/`.
- **MiroFish fork strategy:** vendored copy (not git submodule). Track upstream via `git remote add upstream https://github.com/666ghj/MiroFish` and cherry-pick.
- **Hosting:** Vercel (web) + Fly.io Machines (MiroFish) + Neon/Supabase Postgres + Upstash Redis.
- **LLM gateway:** OpenRouter (primary), with model tiering config in `services/mirofish/config/llm-routing.yaml`.

Tasks:
- [ ] 0.1 Final layout: `app/` (Next.js, ex-boilerplate) · `services/mirofish/` (Python fork) · `scenarios/` · `docs/` · `infra/` (fly.toml, docker-compose.yml, terraform if needed) · `scripts/` (cross-project ops).
- [ ] 0.2 Move `FoundersFate-saas-boilerplate/` → `app/`. Rename `package.json#name` to `founderfate-app`.
- [ ] 0.3 Fork https://github.com/666ghj/MiroFish into our GitHub org; clone into `services/mirofish/`; add `upstream` remote; commit ADR-001 capturing the cherry-pick workflow.
- [ ] 0.4 Top-level `infra/docker-compose.yml`: web (Next.js) · mirofish (Flask) · postgres · redis · caddy. Adapt boilerplate `Caddyfile` and `docker-compose.yml`.
- [ ] 0.5 Root `.env.example` covering both services:
  - NextAuth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`
  - MiroFish: `MIROFISH_URL`, `MIROFISH_API_TOKEN`
  - LLM gateway: `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, `OPENROUTER_APP_NAME=FounderFate`, optional `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` for direct fallback
  - Zep: `ZEP_API_KEY`, `ZEP_BASE_URL`
  - Cache / queue: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Security: `SERVER_SECRET`, `EMAIL_INDEX_PEPPER`, `MIROFISH_INTERNAL_TOKEN`
  - Observability: `SENTRY_DSN`, `AMPLITUDE_KEY`
  - Admin: `ADMIN_EMAILS` (comma-separated allowlist), `ADMIN_BOOTSTRAP_TOKEN` (one-time grant)
- [ ] 0.6 GitHub Actions: lint + typecheck + `next build` for app; `ruff` + `mypy` + `pytest` for MiroFish; build Docker images on tag; deploy preview to Vercel + Fly staging on PR.
- [ ] 0.7 Pre-commit: eslint, prettier, ruff, mypy, gitleaks (secret scan).
- [ ] 0.8 Replace boilerplate README with project overview linking PRD + this task list + ADRs.

---

## M1 — Boilerplate Adaptation (Week 0–1)

- [ ] 1.1 [BP] Swap SQLite → Postgres in `prisma/schema.prisma` for prod profile; keep SQLite for local dev.
- [ ] 1.2 Extend Prisma schema with `Profile`, `SimulationRecord`, `Share`, `AnalyticsEvent`, `UsageLog`, `UsageDailyAgg`, `FeatureFlag`, `AdminAuditLog`, `InviteCode` per PRD [§8.0](PRD-FOUNDER-FATE.md) and §5.5/§6.5. Add `User.role` enum (`user|admin|support`). Run `prisma migrate dev`.
- [ ] 1.3 [BP] Verify NextAuth + Google provider configured in [src/lib/auth.ts](FoundersFate-saas-boilerplate/src/lib/auth.ts). Add bcrypt-pepper logic for email-index lookup. `[Data D-02]`
- [ ] 1.4 [BP] Confirm Stripe webhook handler in `src/app/api/stripe/*`. Add `Subscription.plan` → tier mapping (`free|pro|enterprise`) used by middleware.
- [ ] 1.5 next-intl: add `messages/en.json` with all `fate.*` keys from PRD [§12](PRD-FOUNDER-FATE.md). Wire locale provider in `app/layout.tsx`.
- [ ] 1.6 Tailwind theme tokens: focus ring `#2563EB`, AA-contrast palette, color-blind-safe survival colors. `[NFR-6.3]`
- [ ] 1.7 Replace placeholder dashboard at `src/app/(dashboard)/dashboard/page.tsx` with redirect to `/hub`.
- [ ] 1.8 Add `src/middleware.ts` rules: require auth for `/hub`, `/sim/*`, `/profile`, `/premortem`; allow anonymous `/sim/share/:code` and marketing routes.
- [ ] 1.9 Strip boilerplate demo content (sample API keys page if unused for v0.1, demo charts).

---

## M2 — Shared Layer: API Client, Errors, Analytics (Week 1)

- [ ] 2.1 `src/lib/mirofish.ts` — typed fetch client with `MIROFISH_URL` + bearer token + retry (3x exp backoff) + Zod response validation.
- [ ] 2.2 `src/lib/errors.ts` — error envelope `{error, trace_id}`, mapping table to user-facing toast messages (E101..E302 from PRD).
- [ ] 2.3 `src/lib/rate-limit.ts` — Next.js middleware-friendly limiter: 60/min read, 10/min write. `[Security S-04]`
- [ ] 2.4 `src/lib/analytics.ts` — Amplitude server + browser wrapper. Implement all 20 `fate_*` events with TypeScript discriminated-union props. `[§10]`
- [ ] 2.5 Sentry SDK (`@sentry/nextjs`) wired both server + browser; sourcemaps in CI.
- [ ] 2.6 `src/lib/tier.ts` — helper `requireTier(user, "pro" | "enterprise")` for API route guards.

---

## M3 — Auth, Onboarding, Profile (Week 1–2)

- [ ] 3.1 Post-signup redirect → `/onboarding/archetype` if no `Profile` row.
- [ ] 3.2 `ArchetypeSelection` page (shadcn `Card` + `RadioGroup`) — 5 archetypes. `[FR-001]`
- [ ] 3.3 `OnboardingQuestionnaire` — 5 Likert questions → cognitive_baseline floats (skippable → sector defaults).
- [ ] 3.4 `POST /api/profile` — creates `Profile`, emits `fate_profile_created`.
- [ ] 3.5 `/profile` page (shadcn `Tabs`): Overview · Decision DNA · Settings · Privacy.
- [ ] 3.6 Settings → Privacy: Export Data (ZIP), Delete Account (30-day SLA), Clear Cognitive Profile, CCPA "Do Not Sell". `[§11, Data D-01]`
- [ ] 3.7 Age-verification (DOB ≥13) on signup. `[COPPA]`
- [ ] 3.8 Cron / scheduled job: mark `cognitiveBaselineStale=true` after 365d inactive. `[Data D-03]`

---

## M4 — Scenario Library (Week 1–2, parallel)

- [ ] 4.1 Author 7 launch scenarios JSON under `scenarios/<archetype>/<scenario_id>.json` per PRD [§8.4]: Seed Round Sizing, Hiring Plan A/B, Pivot Timing, GTM Sensitivity, Bridge Round, VP Hire Timing, Pricing.
- [ ] 4.2 Zod schema for scenario template (variables, ranges, ontology_reference, runtime_estimate).
- [ ] 4.3 `GET /api/scenarios?archetype=...` — reads from `scenarios/` (mounted into MiroFish container; cached in Next.js with TanStack Query).
- [ ] 4.4 Archetype-compatibility check + warning component. `[FR-090, §4.2]`

---

## M4.5 — LLM Gateway, Caching, Spend Controls (Week 2–3, blocks M5)

Owned by MiroFish service — but `UsageLog` writes go to the Postgres the Next.js app owns (over an internal write endpoint). All MiroFish LLM calls MUST go through `services/mirofish/llm_gateway/` — no direct provider SDK calls allowed (enforced via lint + code review).

- [ ] 4.5.1 `services/mirofish/llm_gateway/client.py` — OpenAI-compatible client pointing at OpenRouter. Reads `OPENROUTER_API_KEY`, sets `HTTP-Referer` + `X-Title` headers per OpenRouter conventions.
- [ ] 4.5.2 `config/llm-routing.yaml` schema + loader — per-stage model tier (S/M/L), primary + ordered fallbacks per tier, max retries, temperature, max_tokens. Hot-reloadable (poll mtime every 30s).
- [ ] 4.5.3 Stage enum: `ontology_gen`, `agent_persona`, `cascade_step`, `node_narrative`, `dna_synthesis`, `premortem_iter`, `premortem_synth`, `custom_model_ontology`. Each call MUST pass a stage.
- [ ] 4.5.4 Response cache layer (Upstash Redis REST API from Python). Key = `sha256(model + prompt + system + temp_bucket)`. TTL per stage table in PRD §6.5. Bypass with `cache=False` kwarg.
- [ ] 4.5.5 Circuit breaker (per-provider, per-tier): sliding 60s window, trip at >20% error or p95 latency >2× baseline, half-open after 5 min. State in Redis.
- [ ] 4.5.6 Auto-failover to next provider in the tier's fallback list on circuit-open or HTTP 429/5xx.
- [ ] 4.5.7 Per-call telemetry → write to `UsageLog` via Next.js internal endpoint `POST /api/internal/usage` (token-protected). Fields: `user_id, simulation_id, stage, model, input_tokens, output_tokens, cost_usd, latency_ms, cache_hit, provider, attempt`.
- [ ] 4.5.8 Pre-call spend cap check (Redis-cached for 60s): per-user monthly spend vs tier cap. Free=$2, Pro=$40, Enterprise=contract. Block on hard cap, log+alert on soft alert.
- [ ] 4.5.9 Token-count accuracy verification: tiktoken for OpenAI-family, anthropic tokenizer for Claude, model-reported usage as authority. Reconcile against OpenRouter billing weekly.
- [ ] 4.5.10 Nightly aggregation job: `UsageLog` → `UsageDailyAgg` (groups by day, user, model, stage). Drops `UsageLog` rows >90 days.
- [ ] 4.5.11 `pytest` coverage for gateway: cache hit/miss, circuit-breaker trip/reset, spend-cap enforcement, failover behavior. Mock OpenRouter responses.
- [ ] 4.5.12 Lint rule (`ruff` custom or grep CI check): fail build if `openai.`, `anthropic.`, or direct provider SDK imports appear outside `llm_gateway/`.
- [ ] 4.5.13 Local dev mode: `LLM_GATEWAY_MODE=mock` returns deterministic fixtures so devs don't burn OpenRouter credit.

---

## M5 — MiroFish Fork: Domain Modifications (Week 2–4)

- [ ] 5.1 Audit upstream MiroFish: list existing endpoints, simulation pipeline stages, file layout. Capture in `docs/MIROFISH-AUDIT.md`.
- [ ] 5.2 Add internal-auth middleware (`Authorization: Bearer <MIROFISH_API_TOKEN>`); reject all non-Next.js traffic.
- [ ] 5.3 New endpoint `POST /internal/v1/simulation/run` accepting `{user_id, scenario_id, variables, seed_input}`. `[FR-004]`
- [ ] 5.4 Seed derivation `HMAC-SHA256(SERVER_SECRET, user_id+scenario_id+ts+nonce)`. `[Security S-03]`
- [ ] 5.5 Pipeline orchestrator: Ontology Load → Agent Population → Time Compression → Consequence Cascade. Adapt existing report agent to emit our consequence-tree JSON. `[FR-004 step 3]`
- [ ] 5.6 Zep wrapper: per-user graph create/get/delete + `ZEP_AVAILABLE` fallback flag for LLM-only mode. `[FR-004 AF-2]`
- [ ] 5.7 LLM client retries (3x exp 1/4/9s), per-user param, token accounting per stage.
- [ ] 5.8 OASIS subprocess runner: spawn, IPC, kill-on-timeout (120s), capture stdout/stderr to `uploads/simulations/<id>/`. `[Security S-01]`
- [ ] 5.9 `GET /internal/v1/simulation/{id}/progress` — SSE stream with stage labels.
- [ ] 5.10 `GET /internal/v1/simulation/{id}/results` — returns consequence tree JSON per PRD [§7].
- [ ] 5.11 `POST /internal/v1/simulation/{id}/cancel`.
- [ ] 5.12 Consequence-tree generator: agent outcomes → nodes/edges with probabilities + LLM narrative per node. `[FR-005, FR-006]`
- [ ] 5.13 Per-user concurrency tracked via `ThreadPoolExecutor(max_workers=10)` and an in-process counter; expose `GET /internal/v1/simulation/active?user_id=`. `[FR-011, FR-110]`
- [ ] 5.14 Fidelity backtest harness with curated historical dataset; emits `fate_fidelity_check`. `[FR-020]`
- [ ] 5.15 Custom-model ingestion endpoint with JSON depth ≤4, CSV ≤1000 rows, ≤10MB, HTML strip. `[FR-010, Security S-02]`
- [ ] 5.16 Pre-mortem Monte Carlo endpoint (1000 iterations, partial-on-timeout). `[FR-014]`
- [ ] 5.17 `Dockerfile` for MiroFish service; healthcheck `/healthz`.
- [ ] 5.17a `fly.toml` for MiroFish: 1× shared-cpu-1x/1GB Machine, 10GB persistent volume mounted at `/data/uploads`, internal IPv6 only, region matches Next.js primary, autoscale min=1 (no scale-to-zero — keeps SSE hot).
- [ ] 5.18 Upstream-sync strategy doc: cherry-pick vs rebase, how to pull upstream improvements without losing our changes.

---

## M6 — Next.js API Routes (Simulation Proxy) (Week 3–4)

- [ ] 6.1 `POST /api/sim/run` — auth, tier check, dup-rejection, write `SimulationRecord(status=queued)`, call MiroFish, return job id. `[FR-004]`
- [ ] 6.2 Per-user 5-concurrent enforcement at DB level (`SimulationRecord.status IN ('queued','running')`). 429 with `Retry-After`. `[FR-011]`
- [ ] 6.3 `GET /api/sim/[id]/progress` — proxies MiroFish SSE.
- [ ] 6.4 `GET /api/sim/[id]/results` — owner check (`SimulationRecord.userId == session.user.id`), 404 otherwise. `[Security threat: result sniffing]`
- [ ] 6.5 `GET /api/sim/active` — returns active sims for reconnect-on-load. `[§4.4]`
- [ ] 6.6 `POST /api/sim/[id]/cancel`.
- [ ] 6.7 `POST /api/sim/share` — generates `Share` row + URL. `[FR-012]`
- [ ] 6.8 `GET /api/sim/share/[code]` — public, rate-limited 10 req/s/IP, increments `viewCount`. `[FR-018, NFR-6.2]`
- [ ] 6.9 `POST /api/premortem` — multipart, enterprise-tier guard, proxies to MiroFish. `[FR-014]`
- [ ] 6.10 `POST /api/profile/dna` — triggers / fetches DNA report. `[FR-007]`
- [ ] 6.11 Stripe webhook → update `Subscription.plan` → cascades to `Profile.tier`.

---

## M7 — Hub, Variable Editor, Run Flow (Week 4–5)

- [ ] 7.1 `/hub` — scenario grid (shadcn `Card`), recommended-for-archetype banner, "Continue where you left off" row.
- [ ] 7.2 `/sim/new/[scenarioId]` — `VariableEditor` with shadcn `Slider`, `Input`, `Select`; structured-hires editor with `useFieldArray`. `[FR-003]`
- [ ] 7.3 Range clamping + Zod validation client + server.
- [ ] 7.4 Contradiction warnings (enterprise launch + 0 sales hires → yellow alert). `[FR-003 AF-2]`
- [ ] 7.5 Estimated-runtime live label.
- [ ] 7.6 Run button → `POST /api/sim/run` → push to `/sim/[id]`.
- [ ] 7.7 `/sim/[id]` `ProgressView`: EventSource to `/api/sim/[id]/progress`, 4-stage progress bar, reconnect on remount. `[FR-004, §4.4]`
- [ ] 7.8 Failure UI with retry + friendly error mapping.

---

## M8 — Consequence Tree & Counterfactual (Week 5)

- [ ] 8.1 `ConsequenceTree` React component using **D3.js** force-directed graph inside an SVG. Keyboard navigable (Tab/Arrow/Enter). Color + line-pattern for color-blind. `[FR-005, NFR-6.3]`
- [ ] 8.2 Survival color bands: green ≥70%, yellow 40–70%, red <40%.
- [ ] 8.3 Node click → `CounterfactualPanel` (shadcn `Sheet`) with LLM narrative + key-metric widgets (Recharts mini-charts). `[FR-006]`
- [ ] 8.4 Linear-timeline fallback when only 1 node. `[§9]`
- [ ] 8.5 "Deep view" toggle for >50 forks. `[FR-005 AF-1]`
- [ ] 8.6 ARIA roles (`treeitem`, `aria-expanded`, `aria-label` summary). `[NFR-6.3 §4.1.2]`
- [ ] 8.7 Performance: render p95 <500ms on 100-node fixture. `[NFR-6.1]`

---

## M9 — Decision DNA (Week 5–6)

- [ ] 9.1 After 3rd non-identical simulation, enqueue DNA generation job in MiroFish. `[FR-007]`
- [ ] 9.2 LLM prompt template for biases + patterns + recommendations.
- [ ] 9.3 Store report as `uploads/reports/dna/<user_id>/report.{md,pdf}` (ReportLab in MiroFish for PDF).
- [ ] 9.4 In-app notification (TanStack Query polling or SSE) + badge.
- [ ] 9.5 `DNAReportView` at `/profile?tab=dna` with Cognitive Bias / Decision Pattern / Recommendations sections.
- [ ] 9.6 Contradiction-aware narrative section. `[§9]`

---

## M10 — Billing & Tier Enforcement (Week 6)

- [ ] 10.1 [BP] Verify Stripe Checkout + Customer Portal flows in `src/app/api/stripe/*`.
- [ ] 10.2 Define Stripe products: Free ($0), Pro ($49/mo), Enterprise (contact). Store price IDs in env.
- [ ] 10.3 Free-tier monthly quota (3 sims) — count `SimulationRecord` rows in current month; 403 with `tier_restricted`.
- [ ] 10.4 `UpgradeFlow` modal (shadcn `Dialog`) triggered from `/hub` and post-results CTA. `[FR-009]`
- [ ] 10.5 Stripe webhook tests with `stripe-cli` listening locally.

---

## M11 — Sharing & Compare (Week 6)

- [ ] 11.1 `ShareModal` — create/copy/revoke link, set expiry.
- [ ] 11.2 `/sim/share/[code]` — read-only public page rendering consequence tree, no auth. CTA "Run your own simulation". `[FR-018]`
- [ ] 11.3 Owner can revoke from `/profile?tab=shares`.
- [ ] 11.4 `CompareView` (`/sim/compare?a=...&b=...`) — side-by-side trees with delta highlighting. Requires same `scenarioId`. `[FR-015]`

---

## M12 — Enterprise Pre-Mortem (Week 7) — may slip post-alpha

- [ ] 12.1 `/premortem` upload page (drag-drop PDF/DOCX, URL paste). Enterprise-tier guard.
- [ ] 12.2 `POST /api/premortem` → MiroFish parses → 1000-iteration MC.
- [ ] 12.3 Progress page + email-on-complete.
- [ ] 12.4 15-page ReportLab PDF with liability disclaimer footer. `[§11]`
- [ ] 12.5 Audit-trail record in `AnalyticsEvent` + downloadable link.

---

## M13 — Compliance, Security, Privacy (Week 6–7, parallel)

- [ ] 13.1 Cookie banner + CCPA "Do Not Sell" toggle.
- [ ] 13.2 PII at-rest encryption (AES-256-GCM) for `name`, `email`, billing fields stored in Postgres — use `pgcrypto` or app-layer Node `crypto`.
- [ ] 13.3 IDOR test: confirm `/api/sim/[id]/*` rejects non-owner with 404 (not 403).
- [ ] 13.4 Share-link enumeration test: 10 req/s/IP cap on `/sim/share/[code]`.
- [ ] 13.5 LLM system prompt hardening against injection for custom-model uploads.
- [ ] 13.6 Threat-model walkthrough + signoff (PRD [§6.2] table).
- [ ] 13.7 External pen-test against staging (auth bypass, IDOR, share enumeration, SSRF on URL ingest, prompt injection on custom models).
- [ ] 13.8 Liability disclaimer footer on every result page and PDF.

---

## M14 — Custom Domain Models (Pro Tier) (Week 7) — stretch for alpha

- [ ] 14.1 `/profile?tab=models` UI — upload CSV/JSON or paste industry description.
- [ ] 14.2 `POST /api/models` → MiroFish ontology extraction.
- [ ] 14.3 Quality score surfaced; require ≥0.7 to use in simulations.
- [ ] 14.4 New scenario template auto-listed in `/hub`.

---

## M15 — Lifecycle Jobs (Week 7)

- [ ] 15.1 Nightly cron (Vercel Cron or self-hosted): delete simulations >90d for users inactive >12mo; preserve anonymized DNA. `[FR-013]`
- [ ] 15.2 Pre-mortem retention (24mo) + metadata anonymization.
- [ ] 15.3 Share-link cleanup (30d expiry, 7d post-revoke).
- [ ] 15.4 "Valley of Despair" re-engagement email (1 sim + 7d inactive). `[FR-019]`
- [ ] 15.5 Email templates + CAN-SPAM opt-out footer. Sender: Resend or Postmark.

---

## M16 — Analytics & Observability (parallel from Week 2)

- [ ] 16.1 All 20 `fate_*` events instrumented (FE via Amplitude browser SDK, BE via Node SDK). `[§10]`
- [ ] 16.2 Amplitude funnel dashboards: signup → 1st sim → 3rd sim → DNA → upgrade.
- [ ] 16.3 Sentry release tagging in CI; sourcemaps uploaded.
- [ ] 16.4 Internal `/admin/fidelity` page (admin-only) showing latest backtest scores.
- [ ] 16.5 SLO dashboard: API p95, sim runtime p95, crash-free session rate. Track in Sentry + Vercel Analytics.

---

## M17 — QA & Hardening (Week 7–8)

- [ ] 17.1 Unit tests (vitest): ≥70% on `src/lib/*` and component tests for `ConsequenceTree`, `VariableEditor`.
- [ ] 17.2 MiroFish pytest suite: ≥80% on services; mock Zep + LLM.
- [ ] 17.3 Playwright E2E: signup → onboarding → run sim → view tree → upgrade.
- [ ] 17.4 Load test (k6): 50 concurrent users on `/api/sim/run`, p95 <2s start. `[NFR-6.1]`
- [ ] 17.5 Lighthouse on `/hub` mobile profile: LCP <2s. `[NFR-6.1]`
- [ ] 17.6 axe-core accessibility scan + manual screen-reader pass on consequence tree. `[NFR-6.3]`
- [ ] 17.7 Cross-browser smoke: Chrome, Firefox, Safari, Edge (latest 2).
- [ ] 17.8 Chaos: kill MiroFish mid-sim, kill LLM provider, kill Zep — verify graceful fallback / failure surfacing.
- [ ] 17.9 Execute TC-FATE-001..020 from PRD traceability matrix. `[§15]`

---

## M19 — Admin / Operator Console (Week 3 onwards, parallel — alpha-required slices ship early)

Route group `app/src/app/(admin)/admin/*`. Protected by `User.role in ('admin', 'support')` checked in middleware. Layout uses shadcn `Sidebar` + `DataTable` + `Sheet`. Every mutating action writes to `AdminAuditLog`.

**Alpha-required (P0) — must ship before invite list opens (target M6):**
- [ ] 19.1 `User.role` enum + middleware guard + `ADMIN_EMAILS` bootstrap (first matching email auto-promoted on signup; subsequent grants via admin UI only). `[FR-A01]`
- [ ] 19.2 `/admin` shell: sidebar nav, role badge, audit-log button. shadcn `Sidebar` primitive.
- [ ] 19.3 `/admin/users` — search/filter table; row → profile drawer with: archetype, tier, sim count, last active, Stripe state.
- [ ] 19.4 User actions: tier override (writes audit), suspend/unsuspend, trigger GDPR delete, impersonate (read-only session w/ banner). `[FR-A01]`
- [ ] 19.5 `/admin/simulations` — filter by status/scenario/user/date; row → drawer with state.json + result.json + LLM call log + cost breakdown. Cancel button. `[FR-A02]`
- [ ] 19.6 `/admin/llm` — cost dashboard (daily/weekly/monthly by model/stage/user/tier), per-sim p50/p95 trend, provider health (success %, p95 latency, circuit-breaker state), per-user spend leaderboard. Recharts. `[FR-A03]`
- [ ] 19.7 `/admin/flags` — feature flags (`marketplace_enabled`, `premortem_enabled`, `custom_models_enabled`, `signups_open`) + LLM routing YAML editor with diff preview, version history, one-click rollback. Backed by `FeatureFlag` table + Git-tracked YAML mirror. `[FR-A05]`
- [ ] 19.8 `/admin/invites` — generate alpha invite codes, set cap, view redemption rate, bulk-import waitlist CSV → trigger invite emails. `[FR-A07]`
- [ ] 19.9 `/admin/health` — live status: MiroFish, OpenRouter (per provider), Zep, Stripe, Postgres, Upstash. Last 24h Sentry errors grouped. `[FR-A11]`
- [ ] 19.10 `AdminAuditLog` viewer at `/admin/audit` (filterable, CSV export). Every privileged action emits. `[FR-A09]`

**Nice-to-have (P1) — can land during or after alpha:**
- [ ] 19.11 `/admin/fidelity` — backtest scores trend, manual run trigger. `[FR-A04]`
- [ ] 19.12 `/admin/scenarios` — browse/edit/preview/publish, diff between versions. `[FR-A06]`
- [ ] 19.13 `/admin/billing` — Stripe-vs-DB reconciliation, refund/credit issuance, webhook replay. `[FR-A10]`
- [ ] 19.14 `/admin/emails` — re-engagement queue, pause/resume, mute per user, delivery stats. `[FR-A12]`
- [ ] 19.15 `/admin/moderation` — custom-model review queue (auto-flagged below quality threshold). `[FR-A08]`

---

## M18 — Alpha Release (Week 8)

- [ ] 18.1 Staging: Vercel (web, preview deploy per PR) + Fly.io app `founderfate-mirofish-staging` (separate Machine + volume from prod) + Neon/Supabase Postgres branch.
- [ ] 18.2 Backup + restore drill: Postgres `pg_dump` nightly + Fly volume snapshot (`fly volumes snapshots create`) nightly; restore-time SLO <30 min.
- [ ] 18.3 Runbook: incident response, rollback, on-call rotation, sim-engine kill-switch (`FEATURE_SIM_ENABLED=false`).
- [ ] 18.4 Status page (BetterStack or Statuspage) + uptime monitor.
- [ ] 18.5 Alpha invite list (≤100 founders) + waitlist signup capture.
- [ ] 18.6 In-app feedback widget → Linear.
- [ ] 18.7 ToS, Privacy Policy, DPA published; legal sign-off recorded.
- [ ] 18.8 Launch checklist: secrets rotated, debug flags off, rate limits live, Sentry alerts wired, analytics verified end-to-end.
- [ ] 18.9 Go/no-go review → **Alpha live**.

---

## Out of Scope for Alpha (deferred — see [§14](PRD-FOUNDER-FATE.md))

Marketplace (FR-016/017), native mobile, real-time multi-user editing, public 3rd-party API, on-prem/air-gapped, interview sub-agent, multi-language beyond English, historical backtesting dashboard, Decision Regret Archive, gamification, finance integrations, co-founder dispute sim.

---

## Critical-Path Risks

1. **MiroFish upstream divergence** — vendored fork strategy chosen; upstream-sync ritual documented in M5.18. Review monthly.
2. **Simulation fidelity <60%** — biggest technical risk per PRD. Backtest harness (M5.14) live by week 4; weekly fidelity reviews.
3. **OASIS subprocess instability** — wrap with timeout + kill; LLM-only fallback path (M5.6).
4. **LLM cost overrun** — mitigated by M4.5 (OpenRouter gateway + Redis cache + per-user spend caps + admin dashboard FR-A03). Hard cap stops runaway usage automatically; admin gets alert at soft threshold.
5. **OpenRouter outage** — single LLM gateway is a SPOF. Mitigation: `OPENROUTER_FALLBACK_DIRECT=true` env + direct provider keys in vault; gateway client tries OpenRouter first, then a direct path on full outage. Test in M17.8 chaos drill.
6. **Provider rate limits during burst** — mitigated by OpenRouter's aggregated quota + multi-provider fallback within each tier (M4.5.6). Track headroom in FR-A03.
7. **Zep rate limits at scale** — procure paid tier before M5; fallback to LLM-only mode (M5.6) on persistent rate limit.
8. **Stripe ↔ Profile.tier desync** — webhook idempotency + nightly reconciliation job (FR-A10).
9. **D3 tree perf with >50 nodes** — pagination + virtualized rendering planned in M8.5.
10. **Admin privilege escalation** — bootstrap via `ADMIN_EMAILS` env only on first signup; subsequent grants require existing admin; every grant audited; impersonation produces banner + audit row + cannot perform billing/delete actions.
