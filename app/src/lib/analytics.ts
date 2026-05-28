/**
 * Analytics layer (PRD §10).
 *
 * 20 typed events keyed by name with a discriminated-union props type.
 * Adding an event is a one-line change to the EventMap below.
 *
 * Pipeline:
 *   1. Mirror every event to the AnalyticsEvent table — backup if
 *      Amplitude is down, and source-of-truth for the admin console.
 *   2. Forward to Amplitude (server SDK on the BE, browser SDK on the FE).
 *
 * The mirror write is fire-and-forget; we never block a request on it.
 */

import { db } from "@/lib/db";

// ------------------------------------------------------------
// Event catalog — keep names and props in lock-step with PRD §10
// ------------------------------------------------------------

export type EventMap = {
  fate_signup_completed: { auth_method: "google" | "github" | "credentials"; archetype?: string };
  fate_profile_created: { archetype: string; question_count: number };
  fate_scenario_loaded: { scenario_id: string; archetype_match: boolean };
  fate_variable_adjusted: { scenario_id: string; variable_name: string; new_value: string | number };
  fate_simulation_started: { scenario_id: string; archetype: string; tier: string; variable_count?: number; estimated_runtime?: number };
  fate_simulation_completed: {
    scenario_id: string;
    simulation_id: string;
    actual_runtime?: number;
    node_count?: number;
    top_insight?: string;
  };
  fate_simulation_failed: { scenario_id: string; error_category: string; retry_count: number };
  fate_results_viewed: { scenario_id: string; simulation_id: string };
  fate_premortem_run: { simulation_id: string; perspective: string };
  fate_dna_triggered: { user_id: string; distinct_scenarios: number };
  fate_tree_node_clicked: { simulation_id: string; node_id: string; depth: number; has_narrative: boolean };
  fate_counterfactual_viewed: { simulation_id: string; node_id: string; narrative_length_chars: number };
  fate_simulation_compared: { sim1_id: string; sim2_id: string; delta_count: number };
  fate_simulation_shared: { simulation_id: string; expires_in_days: number };
  fate_shared_link_viewed: { share_id: string; referrer?: string };
  fate_share_revoked: { code: string };
  fate_upgrade_started: { current_tier: string; source_page: string };
  fate_upgrade_completed: { tier: string; revenue_amount: number };
  fate_custom_model_created: { industry: string; source_type: string; ontology_size: number };
  fate_dna_report_generated: { simulation_count: number; insight_count: number };
  fate_dna_report_opened: { insight_count: number };
  fate_premortem_generated: { iteration_count: number; top_failure_mode: string };
  fate_valley_of_despair_alert: { days_since_last: number; simulation_count: number };
  fate_fidelity_check: { fidelity_score: number; deviation_areas: string[]; sample_size: number };
  fate_marketplace_submitted: { userId: string; listingId: string; category: string };
  fate_marketplace_scenario_used: { userId: string; listingId: string };
  fate_badge_awarded: { userId: string; badgeSlug: string; badgeName: string };
};

export type EventName = keyof EventMap;

// ------------------------------------------------------------
// Lazy Amplitude init (server). Browser variant lives in analytics-client.ts.
// ------------------------------------------------------------

type AmplitudeServer = {
  track: (event: { event_type: string; user_id?: string; event_properties?: Record<string, unknown> }) => unknown;
  flush?: () => Promise<unknown>;
};

let amplitudeServerPromise: Promise<AmplitudeServer | null> | null = null;
async function getAmplitudeServer(): Promise<AmplitudeServer | null> {
  if (!process.env.AMPLITUDE_KEY) return null;
  if (!amplitudeServerPromise) {
    amplitudeServerPromise = (async () => {
      try {
        const mod = await import("@amplitude/analytics-node");
        mod.init(process.env.AMPLITUDE_KEY!, { flushIntervalMillis: 1_000 });
        return { track: mod.track, flush: mod.flush } as AmplitudeServer;
      } catch {
        // Package not installed yet (or running in edge runtime) — degrade gracefully.
        return null;
      }
    })();
  }
  return amplitudeServerPromise;
}

// ------------------------------------------------------------
// Public track() — server-side
// ------------------------------------------------------------

export async function track<E extends EventName>(
  name: E,
  props: EventMap[E],
  ctx?: { userId?: string | null },
): Promise<void> {
  const userId = ctx?.userId ?? null;

  // 1. Mirror to DB (best-effort). We don't await this in the hot path.
  void persistEvent(name, props as Record<string, unknown>, userId);

  // 2. Forward to Amplitude.
  const amp = await getAmplitudeServer();
  if (amp) {
    try {
      amp.track({
        event_type: name,
        user_id: userId ?? undefined,
        event_properties: props as Record<string, unknown>,
      });
    } catch {
      // Swallow — never let analytics break a request.
    }
  }
}

async function persistEvent(
  name: string,
  props: Record<string, unknown>,
  userId: string | null,
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: { name, props, userId: userId ?? undefined },
    });
  } catch {
    // DB down? Sentry will surface the error elsewhere; analytics is non-critical.
  }
}

/**
 * Flush pending Amplitude events. Call from process exit hooks if you
 * need to guarantee delivery in short-lived runtimes (cron, scripts).
 */
export async function flushAnalytics(): Promise<void> {
  const amp = await getAmplitudeServer();
  await amp?.flush?.();
}
