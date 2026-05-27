import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: { modelId: string } },
) {
  const session = await requireSession();
  const model = await db.customModel.findFirst({
    where: { id: params.modelId, userId: session.id },
  });
  if (!model) throw new NotFoundError();

  // If still processing, poll MiroFish and update
  if (model.status === "processing" && model.miroJobId) {
    const mfUrl = process.env.MIROFISH_URL;
    const mfToken = process.env.MIROFISH_INTERNAL_TOKEN;

    if (mfUrl && mfToken) {
      try {
        const mfResp = await fetch(
          `${mfUrl}/internal/v1/models/${model.miroJobId}/status`,
          { headers: { Authorization: `Bearer ${mfToken}` } },
        );
        if (mfResp.ok) {
          const data = await mfResp.json();
          if (data.status === "done") {
            const updated = await db.customModel.update({
              where: { id: model.id },
              data: {
                status: "ready",
                qualityScore: data.quality_score,
                ontology: data.ontology,
                scenarioJson: data.scenario,
              },
            });
            return NextResponse.json(updated);
          } else if (data.status === "error") {
            await db.customModel.update({
              where: { id: model.id },
              data: { status: "failed" },
            });
          }
        }
      } catch {
        // Upstream unavailable — return current state
      }
    }
  }

  return NextResponse.json(model);
}
