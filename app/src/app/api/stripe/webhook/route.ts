/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events. Verifies the signature before processing.
 *
 * Handled events:
 *   - checkout.session.completed     → create/update Subscription, cascade tier to Profile
 *   - customer.subscription.updated  → cascade plan → tier into Profile
 *   - customer.subscription.deleted  → downgrade to free
 *
 * All handlers are idempotent: they upsert rather than create, and use
 * stripeSubscriptionId as the stable key.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { planToTier } from "@/lib/tier";
import type Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/**
 * Given a Stripe price ID, map to a plan name.
 * Falls back to 'free' for unrecognised price IDs.
 */
function priceIdToPlan(priceId: string | null | undefined): string {
  if (!priceId) return "free";
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID ?? "";
  const entPriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "";
  if (priceId === entPriceId) return "enterprise";
  if (priceId === proPriceId) return "pro";
  return "free";
}

async function cascadeTierToProfile(
  userId: string,
  plan: string,
): Promise<void> {
  const tier = planToTier(plan);
  await db.profile.upsert({
    where: { userId },
    update: { tier },
    create: { userId, tier },
  });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) return;

  // Fetch the full subscription to get the price ID.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = priceIdToPlan(priceId);

  await db.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    create: {
      userId,
      stripeCustomerId:
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? undefined),
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status,
      plan,
    },
    update: {
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status,
      plan,
    },
  });

  await cascadeTierToProfile(userId, plan);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = priceIdToPlan(priceId);

  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  });
  if (!existing) return; // No local record — nothing to update.

  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status,
      plan,
    },
  });

  await cascadeTierToProfile(existing.userId, plan);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const existing = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { userId: true },
  });
  if (!existing) return;

  await db.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "cancelled",
      plan: "free",
    },
  });

  await cascadeTierToProfile(existing.userId, "free");
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");

  if (!sig || !WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing stripe-signature or webhook secret" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        // Unknown event — acknowledge and ignore.
        break;
    }
  } catch (err) {
    // Log but return 200 so Stripe doesn't retry indefinitely for
    // bugs in our handler code. Sentry will surface the error.
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(err, {
        tags: { stripe_event_type: event.type, stripe_event_id: event.id },
      });
    } catch {
      // Sentry not available in dev.
    }
    console.error(`Stripe webhook handler error [${event.type}]:`, err);
  }

  return NextResponse.json({ received: true });
}
