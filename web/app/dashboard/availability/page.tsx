"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type AvailabilityWindow,
  type AvailabilityWindowIn,
  type Booking,
  fetchMyAvailability,
  setMyAvailability,
  fetchMyCoachBookings,
} from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { getToken } from "@/lib/auth";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Monday", short: "Mon", value: 0 },
  { label: "Tuesday", short: "Tue", value: 1 },
  { label: "Wednesday", short: "Wed", value: 2 },
  { label: "Thursday", short: "Thu", value: 3 },
  { label: "Friday", short: "Fri", value: 4 },
  { label: "Saturday", short: "Sat", value: 5 },
  { label: "Sunday", short: "Sun", value: 6 },
];

const DURATIONS = [30, 45, 60, 90, 120];

// ── Local state type ──────────────────────────────────────────────────────────

type DayState = {
  enabled: boolean;
  start_time: string; // "HH:MM"
  end_time: string;
  slot_duration_minutes: number;
};

const DEFAULT_DAY: DayState = {
  enabled: false,
  start_time: "09:00",
  end_time: "17:00",
  slot_duration_minutes: 60,
};

function windowsToState(windows: AvailabilityWindow[]): Record<number, DayState> {
  const state: Record<number, DayState> = {};
  for (const day of DAYS) {
    state[day.value] = { ...DEFAULT_DAY };
  }
  for (const w of windows) {
    state[w.day_of_week] = {
      enabled: w.is_active,
      start_time: w.start_time.slice(0, 5),
      end_time: w.end_time.slice(0, 5),
      slot_duration_minutes: w.slot_duration_minutes,
    };
  }
  return state;
}

function stateToWindows(state: Record<number, DayState>): AvailabilityWindowIn[] {
  return Object.entries(state)
    .filter(([, v]) => v.enabled)
    .map(([k, v]) => ({
      day_of_week: Number(k),
      start_time: `${v.start_time}:00`,
      end_time: `${v.end_time}:00`,
      slot_duration_minutes: v.slot_duration_minutes,
    }));
}

function formatBookingTime(isoUtc: string): string {
  return new Date(isoUtc).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dayState, setDayState] = useState<Record<number, DayState>>(() => {
    const s: Record<number, DayState> = {};
    for (const d of DAYS) s[d.value] = { ...DEFAULT_DAY };
    return s;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchMe().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.role !== "coach") {
        router.replace("/dashboard");
        return;
      }
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const [windows, bkgs] = await Promise.all([
        fetchMyAvailability(token).catch(() => [] as AvailabilityWindow[]),
        fetchMyCoachBookings(token).catch(() => [] as Booking[]),
      ]);
      setDayState(windowsToState(windows));
      setBookings(bkgs);
      setLoading(false);
    });
  }, [router]);

  function updateDay(dow: number, patch: Partial<DayState>) {
    setDayState((prev) => ({ ...prev, [dow]: { ...prev[dow], ...patch } }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    // Validate time ranges
    for (const day of DAYS) {
      const d = dayState[day.value];
      if (!d.enabled) continue;
      if (d.end_time <= d.start_time) {
        setSaveError(
          `End time must be after start time on ${day.label}.`
        );
        setSaving(false);
        return;
      }
    }

    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      await setMyAvailability(stateToWindows(dayState), token);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[72vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-purple-pale)] border-t-[var(--color-purple-mid)]" />
      </main>
    );
  }

  const enabledCount = Object.values(dayState).filter((d) => d.enabled).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="font-ui text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--color-purple-mid)]"
        >
          ← Dashboard
        </Link>
        <h1 className="font-display mt-4 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
          Availability
        </h1>
        <p className="font-ui mt-2 text-sm text-[var(--text-muted)]">
          Set the recurring windows when athletes can book sessions with you. Only open
          slots are shown — booked times are hidden automatically.
        </p>
      </div>

      {/* Weekly grid form */}
      <form onSubmit={handleSave} className="space-y-3">
        {DAYS.map((day) => {
          const d = dayState[day.value];
          return (
            <div
              key={day.value}
              className={[
                "surface-panel transition",
                d.enabled ? "border-[var(--color-purple-mid)]/40" : "",
              ].join(" ")}
            >
              {/* Day toggle row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={d.enabled}
                  onClick={() => updateDay(day.value, { enabled: !d.enabled })}
                  className={[
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    d.enabled ? "bg-[var(--color-purple-mid)]" : "bg-[var(--border-default)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      d.enabled ? "translate-x-4" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
                <span
                  className={[
                    "font-ui text-sm font-medium w-24",
                    d.enabled ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {day.label}
                </span>
                {d.enabled && (
                  <span className="font-ui text-xs text-[var(--text-muted)]">
                    {d.start_time} – {d.end_time} · {d.slot_duration_minutes}m slots
                  </span>
                )}
              </div>

              {/* Expanded settings */}
              {d.enabled && (
                <div className="border-t border-[var(--border-subtle)] px-5 py-4 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="field-label" htmlFor={`start-${day.value}`}>
                      Start time
                    </label>
                    <input
                      id={`start-${day.value}`}
                      type="time"
                      className="input"
                      value={d.start_time}
                      onChange={(e) => updateDay(day.value, { start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="field-label" htmlFor={`end-${day.value}`}>
                      End time
                    </label>
                    <input
                      id={`end-${day.value}`}
                      type="time"
                      className="input"
                      value={d.end_time}
                      onChange={(e) => updateDay(day.value, { end_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="field-label" htmlFor={`dur-${day.value}`}>
                      Session length
                    </label>
                    <select
                      id={`dur-${day.value}`}
                      className="input"
                      value={d.slot_duration_minutes}
                      onChange={(e) =>
                        updateDay(day.value, { slot_duration_minutes: Number(e.target.value) })
                      }
                    >
                      {DURATIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Save bar */}
        <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
          <div>
            {saveError && (
              <p className="font-ui text-sm text-[var(--color-coral)]">{saveError}</p>
            )}
            {saved && (
              <p className="font-ui text-sm text-[var(--color-purple-mid)]">
                Availability saved — athletes can now book{" "}
                {enabledCount === 0 ? "no days" : `${enabledCount} day${enabledCount > 1 ? "s" : ""}`} per week.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary font-ui text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save availability"}
          </button>
        </div>
      </form>

      {/* Upcoming bookings */}
      {bookings.length > 0 && (
        <div className="mt-12">
          <h2 className="font-ui mb-4 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            Upcoming sessions
          </h2>
          <div className="surface-panel divide-y divide-[var(--border-subtle)] overflow-hidden">
            {bookings.map((b) => (
              <div key={b.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-ui text-sm font-semibold text-[var(--text-primary)]">
                    {b.athlete_name}
                  </span>
                  <span className="font-ui text-xs text-[var(--text-muted)]">
                    {formatBookingTime(b.scheduled_at)}{" "}
                    <span className="text-[var(--text-muted)]">· {b.duration_minutes} min</span>
                  </span>
                </div>
                <a
                  href={`mailto:${b.athlete_email}`}
                  className="font-ui text-xs text-[var(--color-purple-mid)] underline-offset-2 hover:underline"
                >
                  {b.athlete_email}
                </a>
                {b.notes && (
                  <p className="font-ui mt-1.5 text-sm text-[var(--text-muted)] line-clamp-2">
                    {b.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div className="mt-12 surface-panel px-5 py-6 text-center">
          <p className="font-ui text-sm text-[var(--text-muted)]">
            No upcoming sessions yet.{" "}
            {enabledCount > 0
              ? "Your availability is set — share your profile so athletes can book."
              : "Enable at least one day above so athletes can book time with you."}
          </p>
        </div>
      )}
    </main>
  );
}
