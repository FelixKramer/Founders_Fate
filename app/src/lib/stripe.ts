import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: process.env.STRIPE_FREE_PRICE_ID ?? "",
    features: [
      "Up to 1,000 API requests/month",
      "Basic analytics",
      "Community support",
      "1 API key",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    features: [
      "Up to 50,000 API requests/month",
      "Advanced analytics",
      "Priority email support",
      "10 API keys",
      "Custom webhooks",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    features: [
      "Unlimited API requests",
      "Real-time analytics",
      "24/7 dedicated support",
      "Unlimited API keys",
      "Custom webhooks",
      "Team collaboration",
      "SSO / SAML",
      "Custom SLA",
      "Dedicated account manager",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;
