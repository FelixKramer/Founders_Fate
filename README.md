# Founder Fate

> Consequence simulator for founders. Run a hiring plan, a fundraise size, or a pivot through a multi-agent simulation and see a 10-year survival-probability tree before you commit real capital.

**Status:** Pre-alpha — see [TASKS.md](TASKS.md). Target internal alpha: **2026-07-20**.

## Repo layout

```
.
├── app/                 Next.js 16 + React 19 + TS + Tailwind + shadcn (ex-boilerplate)
├── services/
│   └── mirofish/        Forked Python sim service (camel-oasis + Zep)  see docs/ADR-001
├── scenarios/           Versioned scenario templates (JSON per archetype)
├── infra/               docker-compose.yml + Caddyfile + fly.toml (later)
├── scripts/             Cross-project ops (admin grants, backfills, etc.)
├── docs/                ADRs, runbooks, audit notes
├── .github/workflows/   CI per project + secret scan
├── PRD-FOUNDER-FATE.md  Product requirements (v0.2)
└── TASKS.md             Milestone plan to alpha
```

## Architecture (one paragraph)

The Next.js app owns auth (NextAuth + Prisma), billing (Stripe), the user-facing UI, and a thin API surface under `/api/sim/*` that proxies into the MiroFish service over an internal token-protected HTTP channel. MiroFish owns the simulation pipeline (ontology → agent population → time compression → consequence cascade), wraps every LLM call through a single OpenRouter-backed gateway with caching + spend caps + circuit breakers, and writes results to a Fly.io persistent volume. The boundary is strict: MiroFish never sees user PII — only opaque `user_id` and structured `variables`. See [PRD §6.5](PRD-FOUNDER-FATE.md) for the LLM strategy and [§5.5](PRD-FOUNDER-FATE.md) for the admin surface.

## Local development

Prerequisites: Docker Desktop, Bun, Python 3.11 (only if running MiroFish outside Docker), `git`.

```bash
# 1) Configure env
cp .env.example .env
# Edit .env — at minimum set NEXTAUTH_SECRET, SERVER_SECRET, OPENROUTER_API_KEY (or LLM_GATEWAY_MODE=mock)

# 2) Bring up the stack
cd infra
docker compose up -d
# postgres :5432 · redis :6379 · mirofish :8000 · web :3000 · caddy :81

# 3) Run Prisma migrations
cd ../app
bun install
bunx prisma migrate dev

# 4) Open
# http://localhost:3000   — Next.js app
# http://localhost:81     — via Caddy (matches prod routing)
```

To work without burning OpenRouter credit, set `LLM_GATEWAY_MODE=mock` — MiroFish returns deterministic fixtures.

## Key docs

- [PRD-FOUNDER-FATE.md](PRD-FOUNDER-FATE.md) — what we're building and why
- [TASKS.md](TASKS.md) — milestone plan with every task traced to a PRD requirement
- [docs/ADR-001-mirofish-fork-strategy.md](docs/ADR-001-mirofish-fork-strategy.md) — why we vendor MiroFish + upstream sync workflow

## Contributing

- Branch off `main`. PRs require: passing CI, one review, no `gitleaks` hits.
- `app/` uses Bun. `services/mirofish/` uses `uv`. Each project has its own lockfile.
- Direct LLM SDK imports (`openai`, `anthropic`, `google.generativeai`) are forbidden anywhere in MiroFish except inside `backend/llm_gateway/`. CI enforces this.
- Run `pre-commit install` once after cloning.
