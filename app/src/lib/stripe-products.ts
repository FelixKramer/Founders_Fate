/**
 * Founder Fate Stripe product definitions.
 *
 * Single source of truth for plan names, prices, price IDs, and feature
 * lists used in the pricing page, upgrade dialog, and billing page.
 *
 * Monetary values are stored in cents (Stripe convention).
 * Divide by 100 to display in USD.
 */

export const STRIPE_PRODUCTS = {
  pro: {
    name: "Founder Fate Pro",
    price: 49_00, // cents
    priceId: process.env.STRIPE_PRICE_PRO ?? process.env.STRIPE_PRO_PRICE_ID ?? "",
    interval: "month" as const,
    features: [
      "Unlimited simulations",
      "All 7 scenario types",
      "Share & compare results",
      "Priority LLM routing",
      "Decision DNA report after 3 simulations",
      "$40/month AI spend included",
    ],
  },
  enterprise: {
    name: "Founder Fate Enterprise",
    price: null, // contact sales
    priceId: process.env.STRIPE_PRICE_ENTERPRISE ?? process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    interval: "month" as const,
    features: [
      "Everything in Pro",
      "Pre-mortem Monte Carlo (1,000 iterations)",
      "Custom domain models (CSV/JSON upload)",
      "Dedicated support",
      "Unlimited AI spend",
      "SSO + team seats",
    ],
  },
} as const;

export const FREE_FEATURES = [
  "3 simulations per month",
  "4 of 7 scenario types",
  "Basic consequence tree",
  "$2/month AI spend included",
];
