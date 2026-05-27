"use client"

import { useState } from "react"
import Link from "next/link"

const ARCHETYPES = [
  { value: "", label: "Select your archetype (optional)" },
  { value: "visionary", label: "Visionary — big-picture, long-horizon thinking" },
  { value: "operator", label: "Operator — execution-focused, systems builder" },
  { value: "catalyst", label: "Catalyst — relationship-driven, high velocity" },
  { value: "craftsperson", label: "Craftsperson — product-depth, quality focus" },
]

export default function WaitlistPage() {
  const [email, setEmail] = useState("")
  const [archetype, setArchetype] = useState("")
  const [why, setWhy] = useState("")
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setState("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          archetype: archetype || undefined,
          why: why.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(
          (data as { error?: string }).error ?? "Something went wrong. Please try again."
        )
        setState("error")
        return
      }

      setState("success")
    } catch {
      setErrorMsg("Network error. Please try again.")
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">🎯</div>
          <h1 className="text-2xl font-bold tracking-tight">You&rsquo;re on the list.</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We&rsquo;re inviting the first 100 founders in waves. Check your inbox for a
            confirmation — we&rsquo;ll send your invite code when your spot opens.
          </p>
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="text-primary underline underline-offset-2">
              Back to Founder Fate
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              &larr; Founder Fate
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Join the Founder Fate Alpha
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            100 spots. Consequence simulation for high-stakes founder decisions.
            Run &ldquo;what if&rdquo; scenarios before you commit — hiring, fundraising, pivots.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address <span className="text-destructive">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@startup.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Archetype */}
          <div className="space-y-1.5">
            <label htmlFor="archetype" className="text-sm font-medium text-foreground">
              Founder archetype
            </label>
            <select
              id="archetype"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              {ARCHETYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Why */}
          <div className="space-y-1.5">
            <label htmlFor="why" className="text-sm font-medium text-foreground">
              What decision are you facing?{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="why"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="e.g. Deciding whether to raise a seed round or stay bootstrapped…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {why.length}/200
            </p>
          </div>

          {/* Error */}
          {state === "error" && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={state === "loading" || !email}
            className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {state === "loading" ? "Joining…" : "Request alpha access →"}
          </button>
        </form>

        {/* Footer links */}
        <p className="text-xs text-muted-foreground text-center">
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          . No spam — we&rsquo;ll only email you your invite.
        </p>
      </div>
    </div>
  )
}
