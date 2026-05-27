/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so the user can manage their
 * subscription (cancel, update payment method, view invoices).
 *
 * Auth: requireSession()
 * Response: { url: string }
 */

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { withErrorHandling, ValidationError } from "@/lib/errors";

export const POST = withErrorHandling(async () => {
  const user = await requireSession();

  const existingSub = await db.subscription.findFirst({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  });

  const customerId = existingSub?.stripeCustomerId;
  if (!customerId) {
    throw new ValidationError(
      "No billing account found. Subscribe to a plan first.",
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
});
