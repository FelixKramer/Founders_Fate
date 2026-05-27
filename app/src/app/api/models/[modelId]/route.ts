import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { modelId: string } },
) {
  const session = await requireSession();
  const model = await db.customModel.findFirst({
    where: { id: params.modelId, userId: session.id },
  });
  if (!model) throw new NotFoundError();
  await db.customModel.delete({ where: { id: model.id } });
  return NextResponse.json({ deleted: true });
}
