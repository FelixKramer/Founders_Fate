/**
 * k6 load test for Founder Fate alpha.
 * Target: 50 concurrent users, p95 < 2s for /api/sim/run
 *
 * Run:
 *   k6 run --vus 50 --duration 60s scripts/load-test.js
 *
 * With environment overrides:
 *   k6 run --vus 50 --duration 60s \
 *     -e BASE_URL=https://staging.founderfate.ai \
 *     -e AUTH_TOKEN=<session-token> \
 *     scripts/load-test.js
 *
 * NOTE: This test requires:
 *   - k6 installed (https://k6.io/docs/getting-started/installation/)
 *   - BASE_URL env var pointing to the app (defaults to localhost:3000)
 *   - AUTH_TOKEN env var — a valid session token or API key for auth-protected routes
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const simRunDuration = new Trend("sim_run_duration", true);

export const options = {
  vus: 50,
  duration: "60s",
  thresholds: {
    http_req_duration: ["p(95)<2000"], // p95 < 2s
    errors: ["rate<0.1"], // < 10% error rate
    sim_run_duration: ["p(95)<2000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "test-token";

export default function () {
  // ── Test 1: Public pricing page ────────────────────────────────────────────
  const pricingRes = http.get(`${BASE_URL}/pricing`);
  check(pricingRes, {
    "pricing page 200": (r) => r.status === 200,
    "pricing page < 500ms": (r) => r.timings.duration < 500,
  });

  // ── Test 2: Scenario list API (auth-gated) ─────────────────────────────────
  const scenariosRes = http.get(`${BASE_URL}/api/scenarios`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  check(scenariosRes, {
    "scenarios 200 or 401": (r) => [200, 401, 307].includes(r.status),
  });
  if (scenariosRes.status === 200) {
    const data = JSON.parse(scenariosRes.body);
    check(data, {
      "scenarios returns 7": (d) => d.scenarios && d.scenarios.length === 7,
    });
  }

  // ── Test 3: Sim run endpoint ───────────────────────────────────────────────
  const start = Date.now();
  const simRes = http.post(
    `${BASE_URL}/api/sim/run`,
    JSON.stringify({
      scenario_id: "seed-round-sizing",
      decision_option_id: "raise-1-5m",
      parameters: {
        runway_months: 18,
        burn_rate_monthly: 50000,
        arr_at_raise: 0,
        team_size: 3,
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );
  const duration = Date.now() - start;
  simRunDuration.add(duration);

  // Without real auth → 401. With auth → 201 or 429 (concurrent limit) or 409 (duplicate).
  check(simRes, {
    "sim run response valid": (r) => [201, 401, 403, 409, 429].includes(r.status),
  });
  errorRate.add(simRes.status >= 500);

  // ── Test 4: Share endpoint (public) ───────────────────────────────────────
  const shareRes = http.get(`${BASE_URL}/api/sim/share/loadtest_nonexistent_code`);
  check(shareRes, {
    "share endpoint not 500": (r) => r.status !== 500,
    "share endpoint valid": (r) => [200, 404, 429].includes(r.status),
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    "stdout": textSummary(data, { indent: " ", enableColors: true }),
    "load-test-results.json": JSON.stringify(data, null, 2),
  };
}

// k6 doesn't have textSummary in scope by default; import if using k6 cloud or bundle
function textSummary(data, _opts) {
  const metrics = data.metrics || {};
  const lines = ["=== Load Test Summary ==="];
  for (const [name, metric] of Object.entries(metrics)) {
    if (metric.type === "trend") {
      const vals = metric.values || {};
      lines.push(
        `${name}: p(50)=${vals["p(50)"]?.toFixed(0)}ms p(95)=${vals["p(95)"]?.toFixed(0)}ms`
      );
    } else if (metric.type === "rate") {
      lines.push(`${name}: ${((metric.values?.rate || 0) * 100).toFixed(2)}%`);
    }
  }
  return lines.join("\n");
}
