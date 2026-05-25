# ADR-001: MiroFish Fork Strategy

**Status:** Accepted
**Date:** 2026-05-25
**Decider:** Founder Fate engineering

## Context

We are building Founder Fate on top of MiroFish (https://github.com/666ghj/MiroFish), an actively-developed Python/Flask multi-agent simulation framework. We will heavily modify MiroFish to (a) expose an internal-only HTTP API consumed by our Next.js app, (b) add a stage-aware LLM gateway with caching and spend controls, (c) replace its frontend (we use Next.js instead), (d) add Founder Fate-specific scenario pipelines, ontology generators, and the consequence-tree output format.

We need a strategy that lets us:
1. Diverge aggressively from upstream without friction.
2. Pull selected upstream improvements (bug fixes, OASIS adapter updates) without re-merging our entire fork.
3. Avoid operational drag for day-to-day contributors.

## Options considered

| Option | Pros | Cons |
|--------|------|------|
| **Git submodule** | Clean separation, upstream URL preserved | Submodule UX is famously painful — every clone needs `--recursive`, every contributor needs to remember `git submodule update`, CI complexity. Not worth it when we're not consuming upstream as a black-box library. |
| **Vendored copy with `upstream` remote** *(chosen)* | Simple `git clone`; full repo history; cherry-pick or merge upstream when we want; no extra contributor steps. | Manual upstream-sync ritual; risk of conflict on heavily-modified files. |
| **NPM/PyPI package fork** | Standard ecosystem | MiroFish isn't published; would require us to publish + maintain our own package, more overhead than vendoring. |

## Decision

**Vendor MiroFish as a copy** under `services/mirofish/` in this repository. Track upstream via a `git remote` named `upstream`.

```bash
# Already configured:
git remote -v
# origin    git@github.com:<our-org>/founderfate.git (fetch/push)
# upstream  https://github.com/666ghj/MiroFish.git (fetch/push)
```

> **TODO before alpha:** The `origin` remote in `services/mirofish/` currently has a placeholder URL because we vendored before forking. Once the FounderFate org GitHub repo exists, set `origin` for the monorepo (not the inner mirofish directory) and remove the inner `origin` entirely — `services/mirofish/` is a directory inside our monorepo, not a separate repo. The `upstream` remote stays so individual contributors can pull from it locally (see workflow below).

## Upstream-sync workflow

Once a quarter (or when upstream ships a relevant fix):

```bash
cd services/mirofish
git fetch upstream

# Inspect what's new
git log HEAD..upstream/main --oneline

# Option A: cherry-pick specific commits we want
git cherry-pick <sha1> <sha2> ...

# Option B: full merge (only if our divergence is small — unlikely)
git merge upstream/main

# Test locally, resolve conflicts (expect conflicts in:
#   backend/app/services/*  — we replaced these
#   frontend/*              — we deleted this entirely
# )

# Commit and push to our main
```

## Carve-outs

- `services/mirofish/frontend/` — **delete on first PR**. We do not use it; carrying it around inflates clone size and creates merge noise.
- `services/mirofish/locales/` — review; if locale logic is referenced from backend, retain; otherwise delete.
- `services/mirofish/docker-compose.yml` and `Dockerfile` — supplanted by our `infra/docker-compose.yml` and the new `services/mirofish/Dockerfile` we'll write in M5.17.

## Review trigger

Re-evaluate this ADR if:
- Upstream ships a major rearchitecture that we want to adopt wholesale.
- Our changes outgrow ~50% of the MiroFish surface (at that point, "fork" stops being meaningful — we should consider it a derived work and detach upstream entirely).
