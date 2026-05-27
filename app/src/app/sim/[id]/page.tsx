import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SimProgressView } from "@/components/sim/SimProgressView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SimProgressPage({ params }: Props) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?from=/sim/${id}`);
  }

  const record = await db.simulationRecord.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true, scenarioId: true },
  });

  if (!record) {
    notFound();
  }

  // If already completed, send straight to results
  if (record.status === "completed") {
    redirect(`/sim/${id}/results`);
  }

  return (
    <main className="min-h-screen bg-background">
      <SimProgressView
        simulationId={id}
        initialStatus={record.status}
      />
    </main>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Simulation ${id} — Founder Fate`,
  };
}
