import { NextRequest, NextResponse } from "next/server";
import { requireTierAtLeast, requireSession } from "@/lib/guards";
import { withErrorHandling, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await requireSession();
  const models = await db.customModel.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(models);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await requireTierAtLeast("pro");

  const formData = await req.formData();
  const name = (formData.get("name") as string)?.trim();
  const description =
    (formData.get("description") as string | null)?.trim() ?? null;
  const file = formData.get("file") as File | null;
  const textContent = formData.get("content") as string | null;

  if (!name) throw new ValidationError("Name is required");

  let content = "";
  let sourceType = "text";

  if (file) {
    if (file.size > MAX_SIZE) throw new ValidationError("File must be under 10MB");
    const bytes = await file.arrayBuffer();
    const fname = file.name.toLowerCase();
    if (fname.endsWith(".csv")) {
      content = new TextDecoder().decode(bytes).slice(0, 50000);
      sourceType = "csv";
    } else if (fname.endsWith(".json")) {
      content = new TextDecoder().decode(bytes).slice(0, 50000);
      sourceType = "json";
    } else {
      throw new ValidationError("Only CSV and JSON files are supported");
    }
  } else if (textContent) {
    if (textContent.length > 5000)
      throw new ValidationError("Description must be under 5000 characters");
    content = textContent;
    sourceType = "text";
  } else {
    throw new ValidationError("Provide a file or text description");
  }

  // Create DB record
  const model = await db.customModel.create({
    data: {
      userId: session.id,
      name,
      description,
      sourceType,
      status: "pending",
    },
  });

  // Kick off MiroFish extraction
  const mfUrl = process.env.MIROFISH_URL;
  const mfToken = process.env.MIROFISH_INTERNAL_TOKEN;

  if (mfUrl && mfToken) {
    try {
      const mfResp = await fetch(`${mfUrl}/internal/v1/models/extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: session.id,
          model_id: model.id,
          content,
          source_type: sourceType,
          name,
        }),
      });

      if (mfResp.ok) {
        const { job_id } = await mfResp.json();
        await db.customModel.update({
          where: { id: model.id },
          data: { miroJobId: job_id, status: "processing" },
        });
      }
    } catch {
      // MiroFish unavailable — record stays pending, can be retried
    }
  }

  await track(
    "fate_custom_model_created",
    { industry: name, source_type: sourceType, ontology_size: content.length },
    { userId: session.id },
  );

  return NextResponse.json(model, { status: 201 });
});
