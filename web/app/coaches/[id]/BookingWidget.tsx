"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Slot, type Booking, fetchCoachSlots, createBooking } from "@/lib/api";
import { fetchMe, getToken } from "@/lib/auth";

type Props = {
  coachId: string;
  coachTimezone: string | null;
  coachName: string;
};

// ── ICS helpers ───────────────────────────────────────────────────────────────

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateICS(booking: Booking, coachName: string): string {
  const start = new Date(booking.scheduled_at);
  const end = new Date(start.getTime() + booking.duration_minutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Newli//Marketplace//EN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@newli.app`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Coaching session with ${coachName}`,
    `DESCRIPTION:Your confirmed session on Newli.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(booking: Booking, coachName: string) {
  const content = generateICS(booking, coachName);
  const blob = new Blob([content], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `newli-session-${booking.id.slice(0, 8)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Date/time utilities ───────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function formatDayLabel(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (toDateKey(d) === toDateKey(today)) return "Today";
  if (toDateKey(d) === toDateKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatSlotTime(isoUtc: string, showTimezone = false): string {
  const d = new Date(isoUtc);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (!showTimezone) return time;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const abbr = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "short",
    timeZone: tz,
  })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  return abbr ? `${time} ${abbr}` : time;
}

function formatConfirmedDate(isoUtc: string): string {
  return new Date(isoUtc).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

const LOOKAHEAD = 28;

export function BookingWidget({ coachId, coachTimezone, coachName }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionLocked, setSessionLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const slotSectionRef = useRef<HTMLDivElement>(null);

  // Pre-fill from auth
  useEffect(() => {
    fetchMe().then((u) => {
      if (u) {
        setName(u.display_name);
        setEmail(u.email);
        setSessionLocked(true);
      }
    });
  }, []);

  // Fetch slots
  useEffect(() => {
    setLoading(true);
    fetchCoachSlots(coachId)
      .then((s) => setSlots(s))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [coachId]);

  // Group slots by date key (YYYY-MM-DD in local browser timezone)
  const slotsByDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const key = toDateKey(new Date(s.start));
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  // Build date strip: next LOOKAHEAD days
  const dateDays: Date[] = Array.from({ length: LOOKAHEAD }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const handleSelectDate = useCallback(
    (key: string) => {
      setSelectedDate(key);
      setSelectedSlot(null);
      setFormError(null);
      setTimeout(() => {
        slotSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    },
    []
  );

  const handleSelectSlot = useCallback((slot: Slot) => {
    setSelectedSlot(slot);
    setFormError(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }, []);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const token = getToken() ?? undefined;
      const booking = await createBooking(
        coachId,
        {
          scheduled_at: selectedSlot.start,
          athlete_name: name.trim(),
          athlete_email: email.trim(),
          notes: notes.trim() || undefined,
        },
        token
      );
      setConfirmedBooking(booking);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "SLOT_TAKEN") {
          // Refresh slots so the taken slot disappears
          setFormError(
            "Someone just booked that slot. We've refreshed the available times — pick another!"
          );
          setSelectedSlot(null);
          fetchCoachSlots(coachId)
            .then((s) => setSlots(s))
            .catch(() => {});
        } else if (err.message.startsWith("VALIDATION:")) {
          setFormError(err.message.replace("VALIDATION:", ""));
        } else {
          setFormError("Something went wrong. Please try again.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const formValid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // ── Confirmed state ──────────────────────────────────────────────────────────

  if (confirmedBooking) {
    return (
      <div className="surface-panel overflow-hidden">
        <div className="bg-[var(--color-purple-pale)] px-6 py-8 sm:px-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-purple-mid)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
            You&apos;re booked!
          </p>
          <p className="font-ui mt-2 text-sm text-[var(--text-muted)]">
            Confirmation sent to <strong>{confirmedBooking.athlete_email}</strong>
          </p>
        </div>
        <div className="px-6 py-6 sm:px-10 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                Coach
              </p>
              <p className="font-ui font-medium text-[var(--text-primary)]">{coachName}</p>
            </div>
            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                Date
              </p>
              <p className="font-ui font-medium text-[var(--text-primary)]">
                {formatConfirmedDate(confirmedBooking.scheduled_at)}
              </p>
            </div>
            <div>
              <p className="font-ui text-xs uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                Time
              </p>
              <p className="font-ui font-medium text-[var(--text-primary)]">
                {formatSlotTime(confirmedBooking.scheduled_at, true)}{" "}
                <span className="font-normal text-[var(--text-muted)]">
                  · {confirmedBooking.duration_minutes} min
                </span>
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadICS(confirmedBooking, coachName)}
              className="btn-secondary font-ui text-sm"
            >
              Add to calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── No availability state ────────────────────────────────────────────────────

  if (!loading && slots.length === 0) {
    return (
      <div className="surface-panel px-6 py-8 text-center">
        <p className="font-ui text-sm text-[var(--text-muted)]">
          This coach hasn&apos;t set their availability yet.{" "}
          <span className="text-[var(--text-primary)]">Send an inquiry below</span> and
          they&apos;ll get in touch to find a time that works.
        </p>
      </div>
    );
  }

  const slotsForSelected = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Date strip */}
      <div className="surface-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <p className="font-ui text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Pick a date
          </p>
          {coachTimezone && (
            <p className="font-ui mt-0.5 text-xs text-[var(--text-muted)]">
              Times shown in your local timezone · Coach is in{" "}
              <span className="text-[var(--text-secondary)]">
                {coachTimezone.replace(/_/g, " ")}
              </span>
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-purple-pale)] border-t-[var(--color-purple-mid)]" />
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto px-5 py-4 pb-4 scrollbar-none">
            {dateDays.map((d) => {
              const key = toDateKey(d);
              const hasSlots = !!slotsByDate[key]?.length;
              const isSelected = selectedDate === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!hasSlots}
                  onClick={() => handleSelectDate(key)}
                  className={[
                    "flex min-w-[60px] flex-col items-center rounded-[var(--radius-md)] px-3 py-2.5 transition",
                    "font-ui text-xs font-medium",
                    isSelected
                      ? "bg-[var(--color-purple-mid)] text-white"
                      : hasSlots
                      ? "bg-[var(--bg-surface-tinted)] text-[var(--text-primary)] hover:bg-[var(--color-purple-pale)] cursor-pointer"
                      : "text-[var(--text-muted)] opacity-35 cursor-not-allowed",
                  ].join(" ")}
                >
                  <span className="text-[10px] uppercase tracking-wider mb-0.5">
                    {formatDayLabel(d)}
                  </span>
                  <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                  <span className="text-[10px] mt-0.5">
                    {d.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  {hasSlots && !isSelected && (
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-[var(--color-coral)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Slot chips */}
      {selectedDate && (
        <div ref={slotSectionRef} className="surface-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
            <p className="font-ui text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Available times
            </p>
          </div>
          {slotsForSelected.length === 0 ? (
            <p className="px-5 py-6 font-ui text-sm text-[var(--text-muted)]">
              No open slots on this day.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {slotsForSelected.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => handleSelectSlot(slot)}
                    className={[
                      "rounded-[var(--radius-md)] px-4 py-2 font-ui text-sm font-medium transition",
                      isSelected
                        ? "bg-[var(--color-purple-mid)] text-white"
                        : "bg-[var(--bg-surface-tinted)] text-[var(--text-primary)] hover:bg-[var(--color-purple-pale)]",
                    ].join(" ")}
                  >
                    {formatSlotTime(slot.start)}
                    <span className={["ml-1.5 text-xs", isSelected ? "text-purple-200" : "text-[var(--text-muted)]"].join(" ")}>
                      {slot.duration_minutes}m
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking form */}
      {selectedSlot && (
        <div ref={formRef} className="surface-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-tinted)]">
            <p className="font-ui text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Confirm your session
            </p>
            <p className="font-ui mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {formatConfirmedDate(selectedSlot.start)} at{" "}
              {formatSlotTime(selectedSlot.start, true)}{" "}
              <span className="font-normal text-[var(--text-muted)]">
                · {selectedSlot.duration_minutes} min
              </span>
            </p>
          </div>
          <form onSubmit={handleBook} noValidate className="space-y-5 px-5 py-5">
            {formError && (
              <p className="rounded-[var(--radius-md)] border border-[var(--color-coral)]/40 bg-[var(--color-coral-pale)] px-4 py-3 text-sm text-[var(--color-coral)]">
                {formError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="field-label" htmlFor="book-name">
                  Your name <span className="text-[var(--color-coral)]">*</span>
                </label>
                <input
                  id="book-name"
                  type="text"
                  className={`input ${sessionLocked ? "opacity-60" : ""}`}
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => !sessionLocked && setName(e.target.value)}
                  readOnly={sessionLocked}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="field-label" htmlFor="book-email">
                  Email{" "}
                  {sessionLocked ? (
                    <span className="font-normal text-[var(--text-muted)]">
                      (from your account)
                    </span>
                  ) : (
                    <span className="text-[var(--color-coral)]">*</span>
                  )}
                </label>
                <input
                  id="book-email"
                  type="email"
                  className={`input ${sessionLocked ? "opacity-60" : ""}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => !sessionLocked && setEmail(e.target.value)}
                  readOnly={sessionLocked}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="field-label" htmlFor="book-notes">
                Anything the coach should know?{" "}
                <span className="font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
              <textarea
                id="book-notes"
                className="input min-h-[90px] resize-y"
                placeholder="Your current level, specific goals, questions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="font-ui text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                ← Change time
              </button>
              <button
                type="submit"
                disabled={!formValid || submitting}
                className="btn-primary font-ui text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
