import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Zap } from "lucide-react";

interface Props {
  params: Promise<{ code: string }>;
}

async function validateInvite(code: string) {
  const invite = await db.inviteCode.findUnique({
    where: { code },
  });

  if (!invite) return { valid: false, reason: "not_found" as const };
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return { valid: false, reason: "expired" as const };
  }
  if (invite.usedCount >= invite.maxUses) {
    return { valid: false, reason: "exhausted" as const };
  }

  return { valid: true, invite };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const result = await validateInvite(code);

  if (!result.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Invalid invite link</h1>
            <p className="text-muted-foreground text-sm">
              {result.reason === "expired"
                ? "This invite link has expired."
                : result.reason === "exhausted"
                ? "This invite link has already been used to its maximum capacity."
                : "This invite link is invalid or no longer exists."}
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const signUpUrl = `/signup?invite=${code}&callbackUrl=${encodeURIComponent(`/hub?invite=${code}`)}`;
  const signInUrl = `/login?invite=${code}&callbackUrl=${encodeURIComponent(`/hub?invite=${code}`)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-600 flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-2 mt-0.5" />
            </div>
            <h1 className="text-2xl font-bold">
              You&apos;ve been invited to Founder Fate Alpha
            </h1>
            <p className="text-muted-foreground text-sm">
              Rehearse the future before you fund it. Simulate the long-term consequences of your
              startup decisions before you commit real capital.
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href={signUpUrl}>Create account &amp; accept invite</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href={signInUrl}>Sign in to existing account</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Invite code: <span className="font-mono font-bold">{code}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
