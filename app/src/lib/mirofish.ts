/**
 * Typed client for the MiroFish internal simulation service.
 *
 * The Next.js side never calls upstream LLM providers directly — every
 * LLM call goes through MiroFish's `llm_gateway` so we get caching,
 * spend caps, circuit breakers, and unified telemetry (PRD §6.5).
 *
 * The MiroFish service exposes its endpoints under `/internal/v1/*`
 * and rejects any request without the shared bearer token.
 */

import { z } from "zod";
import {
  UpstreamUnavailableError,
  UpstreamTimeoutError,
} from "@/lib/errors";

const MIROFISH_URL = process.env.MIROFISH_URL ?? "http://localhost:8000";
const MIROFISH_TOKEN = process.env.MIROFISH_INTERNAL_TOKEN ?? "";

// Retry/timeout policy (PRD §4.2: 3x exponential 1s/4s/9s).
const RETRY_DELAYS_MS = [1000, 4000, 9000];
const DEFAULT_TIMEOUT_MS = 15_000;

// ------------------------------------------------------------
// Response schemas (keep in sync with MiroFish OpenAPI / types.py)
// ------------------------------------------------------------

export const SimulationStartResponse = z.object({
  job_id: z.string(),
  status: z.enum(["queued", "running"]),
  estimated_completion_seconds: z.number().int().nonnegative(),
});
export type SimulationStartResponse = z.infer<typeof SimulationStartResponse>;

export const SimulationProgress = z.object({
  job_id: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  stage: z.enum([
    "ontology",
    "population",
    "time_compression",
    "cascade",
    "complete",
  ]),
  pct: z.number().min(0).max(100),
  message: z.string().optional(),
});
export type SimulationProgress = z.infer<typeof SimulationProgress>;

export const ConsequenceNode = z.object({
  node_id: z.string(),
  type: z.enum(["decision", "outcome"]),
  label: z.string(),
  description: z.string().optional(),
  parent_id: z.string().nullable(),
  depth: z.number().int().nonnegative(),
  children: z.array(z.string()).default([]),
  probability: z.number().min(0).max(1).optional(),
  projections: z
    .object({
      month_12_revenue: z.number().optional(),
      month_12_headcount: z.number().int().nonnegative().optional(),
      month_12_burn: z.number().optional(),
      survival_probability_24: z.number().min(0).max(1).optional(),
    })
    .partial()
    .optional(),
});
export type ConsequenceNode = z.infer<typeof ConsequenceNode>;

export const SimulationResults = z.object({
  job_id: z.string(),
  status: z.literal("completed"),
  scenario_id: z.string(),
  variables: z.record(z.unknown()),
  consequence_tree: z.object({
    nodes: z.array(ConsequenceNode),
    primary_insight: z.string(),
  }),
  top_insight: z.string().optional(),
  dna_update: z
    .object({
      new_insight: z.string().optional(),
      simulations_to_full_report: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
export type SimulationResults = z.infer<typeof SimulationResults>;

// ------------------------------------------------------------
// Low-level fetch
// ------------------------------------------------------------

type FetchOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  // Don't retry idempotency-unsafe writes when we cannot prove idempotency.
  retry?: boolean;
  signal?: AbortSignal;
};

async function mirofishFetch(
  path: string,
  { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, retry = true, signal }: FetchOptions = {},
): Promise<Response> {
  if (!MIROFISH_TOKEN) {
    throw new UpstreamUnavailableError("mirofish", new Error("MIROFISH_INTERNAL_TOKEN not configured"));
  }
  const url = `${MIROFISH_URL}${path}`;
  const headers: Record<string, string> = {
    authorization: `Bearer ${MIROFISH_TOKEN}`,
    accept: "application/json",
  };
  if (body !== undefined) headers["content-type"] = "application/json";

  const attemptsAllowed = retry ? RETRY_DELAYS_MS.length + 1 : 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attemptsAllowed; attempt++) {
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      // 5xx and 429 retry on safe methods; 4xx surface immediately.
      if (res.status >= 500 || res.status === 429) {
        lastError = new Error(`mirofish ${method} ${path} -> ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
      // AbortError due to caller cancel — propagate immediately.
      if (signal?.aborted) throw err;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
    if (attempt < attemptsAllowed) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    }
  }
  const isTimeout = lastError instanceof Error && /timeout/i.test(lastError.message);
  throw isTimeout
    ? new UpstreamTimeoutError("mirofish")
    : new UpstreamUnavailableError("mirofish", lastError);
}

async function json<T>(res: Response, schema: z.ZodSchema<T>): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new UpstreamUnavailableError(
      "mirofish",
      new Error(`non-JSON response from mirofish (status ${res.status}): ${text.slice(0, 200)}`),
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new UpstreamUnavailableError(
      "mirofish",
      new Error(`mirofish response failed schema validation: ${result.error.message}`),
    );
  }
  return result.data;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export type RunSimulationInput = {
  userId: string;
  simulationId: string; // we generate sim_<cuid> on the Next.js side
  scenarioId: string;
  variables: Record<string, unknown>;
  /** Per PRD §S-03: pass enough material for HMAC seed derivation. MiroFish derives the final seed. */
  seedInput: { userId: string; scenarioId: string; ts: number; nonce: string };
};

export const mirofish = {
  async startSimulation(input: RunSimulationInput): Promise<SimulationStartResponse> {
    const res = await mirofishFetch("/internal/v1/simulation/run", {
      method: "POST",
      body: {
        user_id: input.userId,
        simulation_id: input.simulationId,
        scenario_id: input.scenarioId,
        variables: input.variables,
        seed_input: input.seedInput,
      },
      retry: false, // POST /run is not idempotent until MiroFish supports an Idempotency-Key
    });
    return json(res, SimulationStartResponse);
  },

  async cancelSimulation(jobId: string): Promise<void> {
    const res = await mirofishFetch(`/internal/v1/simulation/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    });
    if (!res.ok && res.status !== 404) {
      throw new UpstreamUnavailableError("mirofish");
    }
  },

  async getResults(jobId: string): Promise<SimulationResults> {
    const res = await mirofishFetch(`/internal/v1/simulation/${encodeURIComponent(jobId)}/results`);
    if (!res.ok) throw new UpstreamUnavailableError("mirofish");
    return json(res, SimulationResults);
  },

  /**
   * Stream SSE progress. Returns an async iterable; caller is responsible
   * for cancellation via the passed AbortSignal.
   *
   * Usage:
   *   for await (const progress of mirofish.streamProgress(jobId, signal)) { ... }
   */
  async *streamProgress(
    jobId: string,
    signal: AbortSignal,
  ): AsyncGenerator<SimulationProgress, void, void> {
    const res = await mirofishFetch(`/internal/v1/simulation/${encodeURIComponent(jobId)}/progress`, {
      timeoutMs: 0 as unknown as number, // no overall timeout for streams
      retry: false,
      signal,
    });
    if (!res.ok || !res.body) {
      throw new UpstreamUnavailableError("mirofish");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = frame
            .split("\n")
            .find((l) => l.startsWith("data:"))
            ?.slice(5)
            .trim();
          if (!dataLine) continue;
          try {
            const parsed = SimulationProgress.parse(JSON.parse(dataLine));
            yield parsed;
          } catch {
            // Skip malformed frames; MiroFish will retry the next tick.
          }
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }
  },

  async health(): Promise<{ ok: boolean; deps: Record<string, "ok" | "down" | "unknown"> }> {
    try {
      const res = await mirofishFetch("/healthz", { retry: false, timeoutMs: 2000 });
      if (!res.ok) return { ok: false, deps: {} };
      const parsed = await res.json();
      return { ok: true, deps: parsed?.deps ?? {} };
    } catch {
      return { ok: false, deps: {} };
    }
  },
};
