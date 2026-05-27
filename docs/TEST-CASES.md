# Founder Fate — Test Case Traceability Matrix

Derived from PRD §15. Tests map to Functional Requirements [FR-xxx].

## Automated Tests

### Vitest Unit Tests (`app/src/lib/__tests__/`)

| TC ID | Test Name | FR Ref | File | Status |
|-------|-----------|--------|------|--------|
| TC-U-001 | ValidationError has correct status and code | FR-009 | errors.test.ts | ✅ Auto |
| TC-U-002 | NotFoundError / ForbiddenError / TierRestrictedError statuses | FR-009 | errors.test.ts | ✅ Auto |
| TC-U-003 | TooManyActiveSimsError extends RateLimitedError | FR-011 | errors.test.ts | ✅ Auto |
| TC-U-004 | UpstreamUnavailableError captures cause | FR-004 | errors.test.ts | ✅ Auto |
| TC-U-005 | toEnvelope never leaks raw message for unknown errors | Security | errors.test.ts | ✅ Auto |
| TC-U-006 | errorResponse envelope spreads AppError details | FR-009 | errors.test.ts | ✅ Auto |
| TC-U-007 | USER_FACING_MESSAGES maps all known error codes | FR-009 | errors.test.ts | ✅ Auto |
| TC-U-008 | planToTier maps known and unknown plan strings | FR-009 | tier.test.ts | ✅ Auto |
| TC-U-009 | hasTier: enterprise > pro > free ordering | FR-009 | tier.test.ts | ✅ Auto |
| TC-U-010 | requireTier throws TierRequiredError when insufficient | FR-009 | tier.test.ts | ✅ Auto |
| TC-U-011 | MONTHLY_SIM_QUOTA: free=3, pro=-1, enterprise=-1 | FR-009 | tier.test.ts | ✅ Auto |
| TC-U-012 | SPEND_CAPS: free.hard=$2, pro.hard=$40, enterprise=Infinity | FR-009 | tier.test.ts | ✅ Auto |
| TC-U-013 | ALL_SCENARIOS loads exactly 7 scenarios | FR-002 | scenarios.test.ts | ✅ Auto |
| TC-U-014 | All scenarios have required fields (id, title, difficulty, etc.) | FR-002 | scenarios.test.ts | ✅ Auto |
| TC-U-015 | All scenario IDs are unique | FR-002 | scenarios.test.ts | ✅ Auto |
| TC-U-016 | getScenario retrieves by ID; undefined for unknown | FR-002 | scenarios.test.ts | ✅ Auto |
| TC-U-017 | getScenariosForArchetype filters correctly | FR-002 | scenarios.test.ts | ✅ Auto |
| TC-U-018 | validateScenario throws on invalid data | FR-002 | scenarios.test.ts | ✅ Auto |
| TC-U-019 | Extracted defaults pass schema validation for all 7 scenarios | FR-003 | scenario-validation.test.ts | ✅ Auto |
| TC-U-020 | buildParameterSchema enforces min/max on number params | FR-003 | scenario-validation.test.ts | ✅ Auto |
| TC-U-021 | clampParameters enforces min/max without throwing | FR-003 | scenario-validation.test.ts | ✅ Auto |
| TC-U-022 | VP hire warning fires at <$100k ARR with hire-now-sub-500k | FR-003 | contradiction-checks.test.ts | ✅ Auto |
| TC-U-023 | Seed round warning fires at <12 months runway with raise-500k | FR-003 | contradiction-checks.test.ts | ✅ Auto |
| TC-U-024 | Aggressive hire warning fires at headcount < 3 | FR-003 | contradiction-checks.test.ts | ✅ Auto |
| TC-U-025 | Bridge low runway warning fires at < 2 months | FR-003 | contradiction-checks.test.ts | ✅ Auto |
| TC-U-026 | No false positives on unrelated scenarios | FR-003 | contradiction-checks.test.ts | ✅ Auto |
| TC-U-027 | Boundary conditions checked on all contradiction rules | FR-003 | contradiction-checks.test.ts | ✅ Auto |
| TC-U-028 | flattenTree returns all nodes in O(1)-lookup map | FR-005 | consequence-tree-utils.test.ts | ✅ Auto |
| TC-U-029 | getDepth returns correct depth for various tree shapes | FR-005 | consequence-tree-utils.test.ts | ✅ Auto |
| TC-U-030 | truncateToDepth limits depth without mutating original | FR-005 | consequence-tree-utils.test.ts | ✅ Auto |
| TC-U-031 | getColorForProbability: green>=0.7, amber 0.4–0.69, red<0.4 | FR-005 | consequence-tree-utils.test.ts | ✅ Auto |
| TC-U-032 | getStrokeDashForProbability: solid/dashed/dotted | FR-005 | consequence-tree-utils.test.ts | ✅ Auto |
| TC-U-033 | countNodes counts correctly for various tree shapes | FR-005 | consequence-tree-utils.test.ts | ✅ Auto |
| TC-U-034 | getCookieConsent returns null in node environment | §11 | cookie-consent.test.ts | ✅ Auto |

### Playwright E2E Tests (`app/e2e/`)

| TC ID | Test Name | FR Ref | File | Status |
|-------|-----------|--------|------|--------|
| TC-E-001 | Unauthenticated /hub redirects to sign-in | FR-001 | 01-auth.spec.ts | ✅ Auto |
| TC-E-002 | Unauthenticated /billing redirects to sign-in | FR-009 | 01-auth.spec.ts | ✅ Auto |
| TC-E-003 | /pricing is publicly accessible (200) | FR-009 | 01-auth.spec.ts | ✅ Auto |
| TC-E-004 | Share page does not redirect to auth for invalid code | FR-012 | 01-auth.spec.ts | ✅ Auto |
| TC-E-005 | /onboarding/archetype is guarded (unauthenticated) | FR-001 | 02-onboarding.spec.ts | ✅ Auto |
| TC-E-006 | /pricing shows Free, Pro, Enterprise language | FR-009 | 02-onboarding.spec.ts | ✅ Auto |
| TC-E-007 | GET /api/scenarios returns 200 or 401 (auth guard) | FR-002 | 03-scenarios.spec.ts | ✅ Auto |
| TC-E-008 | GET /api/scenarios?archetype=b2b_saas filters correctly | FR-002 | 03-scenarios.spec.ts | ✅ Auto |
| TC-E-009 | GET /api/scenarios/:id returns 404 for unknown id | FR-002 | 03-scenarios.spec.ts | ✅ Auto |
| TC-E-010 | X-Frame-Options: DENY on all responses | Security | 04-security.spec.ts | ✅ Auto |
| TC-E-011 | X-Content-Type-Options: nosniff on all responses | Security | 04-security.spec.ts | ✅ Auto |
| TC-E-012 | IDOR: /api/sim/[id]/results with no auth returns 401/404 | Security | 04-security.spec.ts | ✅ Auto |
| TC-E-013 | POST /api/sim/run with no auth returns 401 (not 201) | Security | 04-security.spec.ts | ✅ Auto |
| TC-E-014 | Share endpoint with invalid code returns 404/200 (not 500) | FR-012 | 04-security.spec.ts | ✅ Auto |
| TC-E-015 | /admin/* routes all require authentication | FR-A01 | 04-security.spec.ts | ✅ Auto |
| TC-E-016 | /pricing shows Pro tier and pricing info | FR-009 | 05-billing.spec.ts | ✅ Auto |
| TC-E-017 | POST /api/webhooks/stripe rejects invalid signatures | Security | 05-billing.spec.ts | ✅ Auto |

### MiroFish Pytest (`services/mirofish/backend/tests/simulation/`)

| TC ID | Test Name | FR Ref | File | Status |
|-------|-----------|--------|------|--------|
| TC-P-001 | _build_bias_prompt produces valid JSON with required keys | FR-007 | test_dna.py | ✅ Auto |
| TC-P-002 | _build_pattern_prompt includes identified_biases | FR-007 | test_dna.py | ✅ Auto |
| TC-P-003 | generate_dna_report completes or fails gracefully in mock mode | FR-007 | test_dna.py | ✅ Auto |
| TC-P-004 | generate_dna_report saves report.json on success | FR-007 | test_dna.py | ✅ Auto |
| TC-P-005 | load_report returns None for unknown user | FR-007 | test_dna.py | ✅ Auto |
| TC-P-006 | load_report returns report after save | FR-007 | test_dna.py | ✅ Auto |
| TC-P-007 | push_event + push_done streams 2 events | FR-004 | test_progress.py | ✅ Auto |
| TC-P-008 | stream terminates after done event | FR-004 | test_progress.py | ✅ Auto |
| TC-P-009 | stream terminates after error event | FR-004 | test_progress.py | ✅ Auto |
| TC-P-010 | Multiple sim IDs are isolated | FR-004 | test_progress.py | ✅ Auto |
| TC-P-011 | Events have timestamps | FR-004 | test_progress.py | ✅ Auto |
| TC-P-012 | ZepWrapper in-memory fallback stores and retrieves messages | FR-008 | test_zep_wrapper.py | ✅ Auto |
| TC-P-013 | ZepWrapper get_memory last_n slices correctly | FR-008 | test_zep_wrapper.py | ✅ Auto |
| TC-P-014 | ZepWrapper sessions are isolated | FR-008 | test_zep_wrapper.py | ✅ Auto |
| TC-P-015 | ZepWrapper preserves insertion order | FR-008 | test_zep_wrapper.py | ✅ Auto |

## Manual Test Cases

| TC ID | Test Name | FR Ref | Notes |
|-------|-----------|--------|-------|
| TC-M-001 | POST /api/sim/run returns 201 with valid auth + MiroFish running | FR-004 | Requires real auth + running services |
| TC-M-002 | SSE progress stream delivers 10+ events with < 200ms gap | FR-004 | Manual SSE inspection |
| TC-M-003 | Consequence tree renders with correct color bands | FR-005 | Visual QA |
| TC-M-004 | Node click opens counterfactual panel | FR-006 | Visual QA |
| TC-M-005 | DNA report generated after 3rd simulation | FR-007 | Full integration |
| TC-M-006 | Compare view renders side-by-side for two sims | FR-015 | Visual QA |
| TC-M-007 | Free tier quota blocks at 3 sims per month | FR-009 | Requires billing integration |
| TC-M-008 | Pre-mortem requires enterprise tier | FR-014 | Requires billing + tier check |
| TC-M-009 | Stripe upgrade flow end-to-end in test mode | FR-009 | Use Stripe test cards |
| TC-M-010 | Admin user tier override is audit-logged | FR-A01 | Admin UI + audit log check |
| TC-M-011 | Cookie banner CCPA opt-out stored correctly | §11 | Browser test |
| TC-M-012 | Share link creation and public access without auth | FR-012 | E2E with real sim |

## Load Test (`scripts/load-test.js`)

| TC ID | Metric | Target | Tool |
|-------|--------|--------|------|
| TC-L-001 | p95 /api/sim/run latency | < 2000ms | k6 |
| TC-L-002 | Error rate under 50 VU load | < 10% | k6 |
| TC-L-003 | No 5xx responses during steady state | 0 | k6 |
| TC-L-004 | p50 /pricing latency | < 500ms | k6 |

## Accessibility Audit (`app/lighthouserc.js`)

| TC ID | Metric | Target | Tool |
|-------|--------|--------|------|
| TC-A-001 | Lighthouse accessibility score / | ≥ 0.85 | Lighthouse CI |
| TC-A-002 | Lighthouse accessibility score /pricing | ≥ 0.85 | Lighthouse CI |
| TC-A-003 | First Contentful Paint | < 2000ms | Lighthouse CI |
| TC-A-004 | Largest Contentful Paint | < 2500ms | Lighthouse CI |
| TC-A-005 | Cumulative Layout Shift | < 0.1 | Lighthouse CI |
