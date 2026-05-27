/**
 * Contradiction checks — heuristic rules that warn the user when their
 * chosen parameters + decision option conflict with known best-practice
 * thresholds.
 *
 * Each check is stateless and fast (no I/O).  The UI layer is responsible
 * for dismissal state.
 */

export interface ContradictionWarning {
  id: string;
  message: string;
  severity: "warning" | "info";
}

type Params = Record<string, unknown>;

function num(params: Params, key: string): number {
  const v = params[key];
  return typeof v === "number" ? v : Number(v);
}

export function checkContradictions(
  scenarioId: string,
  decisionOptionId: string,
  parameters: Params,
): ContradictionWarning[] {
  const warnings: ContradictionWarning[] = [];

  // 1 — VP hire timing: hiring too early
  if (
    scenarioId === "vp-hire-timing" &&
    num(parameters, "current_arr") < 100_000 &&
    decisionOptionId === "hire-now-sub-500k"
  ) {
    warnings.push({
      id: "vp_hire_too_early",
      severity: "warning",
      message:
        "Hiring a VP at <$100k ARR is very high risk — typical recommendation is $750k–$1M ARR.",
    });
  }

  // 2 — Seed round: $500k won't cover the desired runway
  if (
    scenarioId === "seed-round-sizing" &&
    num(parameters, "runway_months") < 12 &&
    decisionOptionId === "raise-500k"
  ) {
    warnings.push({
      id: "seed_runway_short",
      severity: "warning",
      message:
        "$500k gives less than 12 months runway at your burn rate — most investors want to see 18+ months.",
    });
  }

  // 3 — Hiring plan: aggressive hiring with tiny team
  if (
    scenarioId === "hiring-plan-ab" &&
    decisionOptionId === "hire-aggressively" &&
    num(parameters, "current_headcount") < 3
  ) {
    warnings.push({
      id: "aggressive_hire_small_team",
      severity: "warning",
      message:
        "Aggressive hiring with a team of <3 often leads to culture fragmentation before product-market fit.",
    });
  }

  // 4 — Bridge round: almost no runway left
  if (
    scenarioId === "bridge-round" &&
    decisionOptionId === "take-bridge" &&
    num(parameters, "months_runway") < 2
  ) {
    warnings.push({
      id: "bridge_low_runway",
      severity: "warning",
      message:
        "Taking a bridge with <2 months runway leaves almost no negotiating leverage.",
    });
  }

  return warnings;
}
