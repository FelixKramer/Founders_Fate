# Status Page Setup (BetterStack)

## Setup Steps
1. Create account at https://betterstack.com
2. Create a new Status Page: "Founder Fate Status"
3. Add monitors:
   - Next.js app: GET https://founderfate.ai/api/health (create this endpoint)
   - MiroFish: GET https://founderfate-mirofish.fly.dev/health
   - Check interval: 1 minute
4. Configure: https://status.founderfate.ai (custom domain)
5. Subscribe contacts: engineering@founderfate.ai

## Health endpoint
The Next.js health endpoint is at `GET /api/health` — see `app/src/app/api/health/route.ts`.

It returns:
```json
{
  "ok": true,
  "service": "founderfate-app",
  "version": "abc1234",
  "dbLatencyMs": 12,
  "timestamp": "2026-05-27T00:00:00.000Z"
}
```

Returns HTTP 503 with `{ "ok": false, "error": "Database unreachable" }` if the DB ping fails.
