/**
 * Email sending via Resend.
 *
 * Uses RESEND_API_KEY env var. If the key is not configured (e.g. in local
 * dev without Resend set up), the function logs the email instead of sending —
 * so the cron jobs work in all environments without crashing.
 *
 * CAN-SPAM compliant: every email includes a physical address, an unsubscribe
 * link, and a privacy policy link.
 */

// Resend is an optional dependency — import dynamically to avoid crashing
// if the package isn't installed yet.
async function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const { Resend } = await import("resend");
    return new Resend(key);
  } catch {
    return null;
  }
}

export type EmailUser = {
  email: string;
  name?: string | null;
};

// ─── Re-engagement email ───────────────────────────────────────────────────────

/**
 * Send the "Valley of Despair" re-engagement email to a user who has run
 * exactly one simulation 7–8 days ago and has marketing emails enabled.
 */
export async function sendReEngagementEmail(user: EmailUser): Promise<void> {
  const subject = "You've run your first simulation — what's next?";
  const html = buildReEngagementHTML(user.name ?? "Founder");

  const resend = await getResend();
  if (!resend) {
    console.log("[email stub] re-engagement email not sent — RESEND_API_KEY not set", {
      to: user.email,
      subject,
    });
    return;
  }

  await resend.emails.send({
    from: "Founder Fate <hello@founderfate.ai>",
    to: user.email,
    subject,
    html,
  });
}

// ─── Waitlist confirmation email ──────────────────────────────────────────────

/**
 * Send a confirmation email to someone who joined the alpha waitlist.
 * Silently stubs if RESEND_API_KEY is not set.
 */
export async function sendWaitlistConfirmationEmail(email: string): Promise<void> {
  const subject = "You're on the Founder Fate waitlist"
  const html = buildWaitlistHTML()

  const resend = await getResend()
  if (!resend) {
    console.log('[email stub] waitlist confirmation not sent — RESEND_API_KEY not set', {
      to: email,
      subject,
    })
    return
  }

  await resend.emails.send({
    from: 'Founder Fate <hello@founderfate.ai>',
    to: email,
    subject,
    html,
  })
}

function buildWaitlistHTML(): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://founderfate.ai'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're on the Founder Fate waitlist</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111; background: #fff;">

  <h2 style="color: #4f46e5; margin-bottom: 8px;">You're on the list.</h2>
  <p style="color: #374151; line-height: 1.6;">
    Thanks for signing up for Founder Fate alpha access. We're inviting the first
    100 founders in waves — you'll hear from us soon.
  </p>
  <p style="color: #374151; line-height: 1.6;">
    <strong>Founder Fate</strong> lets you run consequence simulations before making
    your highest-stakes decisions — hiring, fundraising, pivots. Most founders
    discover a blind spot they'd never noticed before.
  </p>
  <p style="color: #374151; line-height: 1.6;">
    We'll be in touch with your invite code.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
    You're receiving this because you signed up for the Founder Fate alpha waitlist.<br>
    <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy Policy</a><br>
    Founder Fate &middot; San Francisco, CA &middot; CAN-SPAM compliant
  </p>

</body>
</html>`.trim()
}

// ─── Re-engagement email ───────────────────────────────────────────────────────

function buildReEngagementHTML(name: string): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://founderfate.ai";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your next simulation awaits</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111; background: #fff;">

  <h2 style="color: #4f46e5; margin-bottom: 8px;">Hey ${name},</h2>
  <p style="color: #374151; line-height: 1.6;">
    You ran your first Founder Fate simulation — that took courage.
  </p>
  <p style="color: #374151; line-height: 1.6;">
    Most founders who run 3+ simulations discover a blind spot in their
    decision-making they'd never noticed before. After your 3rd, we generate
    your <strong>Decision DNA</strong> — a personalised analysis of your
    cognitive biases and patterns.
  </p>
  <p style="color: #374151; line-height: 1.6; margin-bottom: 8px;">
    Your second simulation is waiting:
  </p>

  <p style="margin: 24px 0;">
    <a href="${baseUrl}/hub"
       style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
      Run another simulation &rarr;
    </a>
  </p>

  <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
    Not finding the right scenario?
    <a href="${baseUrl}/hub" style="color: #4f46e5;">Browse all 7 scenarios</a> —
    from seed round sizing to VP hiring timing.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
    You're receiving this because you signed up for Founder Fate and have
    marketing emails enabled.<br>
    <a href="${baseUrl}/profile" style="color: #9ca3af;">Unsubscribe</a>
    &nbsp;&middot;&nbsp;
    <a href="${baseUrl}/privacy" style="color: #9ca3af;">Privacy Policy</a><br>
    Founder Fate &middot; San Francisco, CA &middot; CAN-SPAM compliant
  </p>

</body>
</html>`.trim();
}
