"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { verifyMagicLink } from "@/lib/auth";

function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No token found in this link. Please request a new one.");
      return;
    }
    verifyMagicLink(token)
      .then(() => {
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Something went wrong."
        );
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "verifying") {
    return (
      <main className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-20">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-purple-pale)] border-t-[var(--color-purple-mid)]" />
          <p className="font-ui text-[var(--text-muted)]">Signing you in…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-coral-pale)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-[var(--color-coral)]"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="font-display mb-3 text-2xl font-semibold text-[var(--text-primary)]">
          Link expired or invalid
        </h1>
        <p className="font-ui mb-8 text-sm text-[var(--text-muted)]">
          {errorMsg}
        </p>

        <Link href="/login" className="btn-primary font-ui inline-block">
          Request a new link
        </Link>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[72vh] flex-col items-center justify-center px-4 py-20">
          <div className="text-center">
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-purple-pale)] border-t-[var(--color-purple-mid)]" />
            <p className="font-ui text-[var(--text-muted)]">Signing you in…</p>
          </div>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
