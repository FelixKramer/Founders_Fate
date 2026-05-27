/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for upgrading to Pro or Enterprise.
 * Gets or creates a Stripe customer for the user, then starts a
 * subscription checkout.
 *
 * Body: { priceId: string, successUrl?: string, cancelUrl?: string }
 * Auth: requireSession()
 */

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireSession } from "@/lib/guards";
import { db } from "@/lib/db";
import { withErrorHandling, ValidationError } from "@/lib/errors";

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireSession();

  const body = await req.json();
  const { priceId, successUrl, cancelUrl } = body as {
    priceId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!priceId || typeof priceId !== "string") {
    throw new ValidationError("priceId is required");
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Look up existing Stripe customer ID from our Subscription record.
  const existingSub = await db.subscription.findFirst({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  });

  let customerId = existingSub?.stripeCustomerId ?? null;

  // If no customer yet, create one and persist the ID.
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    // Persist the customer ID so future calls can find it.
    await db.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        status: "inactive",
        plan: "free",
      },
      update: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url:
      successUrl ??
      `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl ?? `${baseUrl}/pricing`,
    metadata: { userId: user.id },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: checkoutSession.url });
});
