"use client";

import { useEffect, useState } from "react";
import { type InquiryCreate, createInquiry } from "@/lib/api";
import { fetchMe, getToken } from "@/lib/auth";

type Props = { coachId: string };

export function InquiryForm({ coachId }: Props) {
  const [fields, setFields] = useState<InquiryCreate>({
    sender_name: "",
    sender_email: "",
    message: "",
  });
  const [sessionLocked, setSessionLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().then((u) => {
      if (u) {
        setFields((prev) => ({
          ...prev,
          sender_name: u.display_name,
          sender_email: u.email,
        }));
        setSessionLocked(true);
      }
    });
  }, []);

  const valid =
    fields.sender_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.sender_email.trim()) &&
    fields.message.trim().length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = getToken() ?? undefined;
      await createInquiry(coachId, fields, token);
      setSent(true);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("VALIDATION:")) {
        setError(err.message.replace("VALIDATION:", ""));
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="surface-panel p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-purple-pale)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-[var(--color-purple-mid)]"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Inquiry sent
        </p>
        <p className="font-ui mt-2 text-sm text-[var(--text-muted)]">
          The coach has been notified and will reach out to you at{" "}
          <strong>{fields.sender_email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="surface-panel space-y-5 p-6 sm:p-8">
      {error && (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-coral)]/40 bg-[var(--color-coral-pale)] px-4 py-3 text-sm text-[var(--color-coral)]">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="field-label" htmlFor="inq-name">
            Your name <span className="text-[var(--color-coral)]">*</span>
          </label>
          <input
            id="inq-name"
            className={`input ${sessionLocked ? "opacity-60" : ""}`}
            type="text"
            placeholder="Your name"
            value={fields.sender_name}
            onChange={(e) =>
              !sessionLocked && setFields((p) => ({ ...p, sender_name: e.target.value }))
            }
            readOnly={sessionLocked}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="field-label" htmlFor="inq-email">
            Email{" "}
            {sessionLocked ? (
              <span className="font-normal text-[var(--text-muted)]">(from your account)</span>
            ) : (
              <span className="text-[var(--color-coral)]">*</span>
            )}
          </label>
          <input
            id="inq-email"
            className={`input ${sessionLocked ? "opacity-60" : ""}`}
            type="email"
            placeholder="you@example.com"
            value={fields.sender_email}
            onChange={(e) =>
              !sessionLocked && setFields((p) => ({ ...p, sender_email: e.target.value }))
            }
            readOnly={sessionLocked}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="field-label" htmlFor="inq-message">
          Your message <span className="text-[var(--color-coral)]">*</span>
        </label>
        <textarea
          id="inq-message"
          className="input min-h-[120px] resize-y"
          placeholder="Tell the coach about your goals, current fitness level, and what kind of coaching you're looking for."
          value={fields.message}
          onChange={(e) => setFields((p) => ({ ...p, message: e.target.value }))}
          required
        />
        <p className="text-xs text-[var(--text-muted)]">
          A few sentences is all it takes. The coach will reply to your email.
        </p>
      </div>

      <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4">
        <button
          type="submit"
          disabled={!valid || submitting}
          className="btn-primary font-ui disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send inquiry"}
        </button>
      </div>
    </form>
  );
}
