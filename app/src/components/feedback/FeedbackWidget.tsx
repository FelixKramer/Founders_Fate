"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"

type Rating = "negative" | "neutral" | "positive"

const RATINGS: { value: Rating; emoji: string; label: string }[] = [
  { value: "negative", emoji: "😤", label: "Not working well" },
  { value: "neutral", emoji: "😐", label: "It's okay" },
  { value: "positive", emoji: "😊", label: "Loving it" },
]

/**
 * Fixed bottom-right feedback widget.
 * Only renders for authenticated users.
 * Opens a popover with emoji rating + optional text.
 * Submits to POST /api/feedback.
 */
export function FeedbackWidget() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<Rating | null>(null)
  const [text, setText] = useState("")
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  // Reset form when popover opens
  function handleToggle() {
    if (!open) {
      setRating(null)
      setText("")
      setSubmitState("idle")
    }
    setOpen((v) => !v)
  }

  async function handleSubmit() {
    if (!rating) return
    setSubmitState("loading")

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim() || undefined }),
      })

      if (!res.ok) {
        setSubmitState("error")
        return
      }

      setSubmitState("success")
      // Auto-close after brief success display
      setTimeout(() => setOpen(false), 1800)
    } catch {
      setSubmitState("error")
    }
  }

  // Only render for signed-in users
  if (status !== "authenticated" || !session) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Share feedback"
          className="w-72 rounded-xl border border-border bg-popover shadow-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {submitState === "success" ? (
            <div className="text-center py-4 space-y-1">
              <p className="text-2xl">🙏</p>
              <p className="text-sm font-medium text-foreground">Thanks for the feedback!</p>
              <p className="text-xs text-muted-foreground">This really helps us improve.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                How is Founder Fate working for you?
              </p>

              {/* Emoji rating */}
              <div className="flex gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRating(r.value)}
                    title={r.label}
                    aria-label={r.label}
                    aria-pressed={rating === r.value}
                    className={`flex-1 rounded-lg py-2 text-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                      rating === r.value
                        ? "bg-primary/15 ring-2 ring-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>

              {/* Optional text */}
              <div className="space-y-1">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Tell us more…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{text.length}/300</p>
              </div>

              {/* Error */}
              {submitState === "error" && (
                <p className="text-xs text-destructive">
                  Something went wrong — please try again.
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!rating || submitState === "loading"}
                  className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitState === "loading" ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        💬 Feedback
      </button>
    </div>
  )
}
