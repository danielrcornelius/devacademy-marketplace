"use client";

import Link from "next/link";
import { useState } from "react";
import { requestMagicLink } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await requestMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-purple-pale)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-[var(--color-purple-mid)]"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 7 10-7" />
            </svg>
          </div>

          <h1 className="font-display mb-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            Check your inbox
          </h1>
          <p className="font-ui mb-2 text-[var(--text-muted)]">
            We sent a sign-in link to
          </p>
          <p className="font-ui mb-6 font-semibold text-[var(--text-primary)]">
            {email}
          </p>
          <p className="font-ui mb-8 text-sm text-[var(--text-muted)]">
            The link expires in 15 minutes. If you don&apos;t see it, check
            your spam folder.
          </p>

          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="btn-secondary font-ui text-sm"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display mb-2 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
            Sign in
          </h1>
          <p className="font-ui text-[var(--text-muted)]">
            Enter your email and we&apos;ll send you a magic link — no password
            needed.
          </p>
        </div>

        <div className="surface-panel p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1">
              <label className="field-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
              />
            </div>

            {error && (
              <p className="rounded-[var(--radius-md)] border border-[var(--color-coral)]/40 bg-[var(--color-coral-pale)] px-4 py-3 text-sm text-[var(--color-coral)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary font-ui w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        </div>

        <p className="font-ui mt-6 text-center text-sm text-[var(--text-muted)]">
          New here?{" "}
          <Link
            href="/coaches/join"
            className="text-[var(--color-purple-mid)] underline-offset-2 hover:underline"
          >
            List yourself as a coach
          </Link>{" "}
          or{" "}
          <Link
            href="/goals/new"
            className="text-[var(--color-purple-mid)] underline-offset-2 hover:underline"
          >
            post a training goal
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
