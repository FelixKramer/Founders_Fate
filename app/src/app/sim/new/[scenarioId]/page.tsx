import { notFound } from "next/navigation";
import { getScenario } from "@/lib/scenarios";
import { VariableEditorClient } from "@/components/sim/VariableEditorClient";

interface Props {
  params: Promise<{ scenarioId: string }>;
}

export default async function SimNewPage({ params }: Props) {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);

  if (!scenario) {
    notFound();
  }

  return <VariableEditorClient scenario={scenario} />;
}

export async function generateMetadata({ params }: Props) {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);
  return {
    title: scenario
      ? `Configure: ${scenario.title} — Founder Fate`
      : "Scenario not found — Founder Fate",
  };
}
