"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type CoachingFormat, type CoachCreate, type Sport, createCoach, fetchMyCoachProfile } from "@/lib/api";
import { fetchMe, getToken } from "@/lib/auth";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Zurich",
  "Europe/Helsinki",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

type Step1 = {
  display_name: string;
  email: string;
  sport_slugs: string[];
  years_experience: string;
};

type Step2 = {
  headline: string;
  bio: string;
  adventure_story: string;
  coaching_format: CoachingFormat | "";
  timezone: string;
  location_city: string;
  location_region: string;
  website_url: string;
};

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      {([1, 2] as const).map((n) => (
        <div key={n} className="flex items-center gap-3">
          {n > 1 && (
            <div className={`h-px w-10 flex-shrink-0 ${step >= n ? "bg-[var(--color-coral)]" : "bg-[var(--border-default)]"}`} />
          )}
          <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition
            ${step === n ? "bg-[var(--color-coral)] text-white" : step > n ? "bg-[var(--color-coral)]/20 text-[var(--color-coral)]" : "bg-[var(--bg-surface-tinted)] text-[var(--text-muted)]"}`}>
            {step > n ? "✓" : n}
          </div>
          <span className={`font-ui text-xs font-medium uppercase tracking-wider ${step >= n ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
            {n === 1 ? "Identity & sport" : "Your story"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function JoinForm({ sports }: { sports: Sport[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionLocked, setSessionLocked] = useState(false);

  const [s1, setS1] = useState<Step1>({
    display_name: "",
    email: "",
    sport_slugs: [],
    years_experience: "",
  });

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) return;
      setS1((prev) => ({ ...prev, display_name: u.display_name, email: u.email }));
      setSessionLocked(true);
      // If they already have a profile, redirect to dashboard
      const token = getToken();
      if (token) {
        fetchMyCoachProfile(token).then((profile) => {
          if (profile) router.replace("/dashboard?notice=profile_exists");
        });
      }
    });
  }, [router]);

  const [s2, setS2] = useState<Step2>({
    headline: "",
    bio: "",
    adventure_story: "",
    coaching_format: "",
    timezone: "",
    location_city: "",
    location_region: "",
    website_url: "",
  });

  // Step 1 validation
  const step1Valid =
    s1.display_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1.email.trim()) &&
    s1.sport_slugs.length > 0;

  // Step 2 validation
  const step2Valid =
    s2.headline.trim().length > 0 &&
    s2.headline.trim().length <= 200 &&
    s2.bio.trim().length > 0 &&
    s2.coaching_format !== "";

  function toggleSport(slug: string) {
    setS1((prev) => ({
      ...prev,
      sport_slugs: prev.sport_slugs.includes(slug)
        ? prev.sport_slugs.filter((s) => s !== slug)
        : [...prev.sport_slugs, slug],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step2Valid) return;
    setSubmitting(true);
    setSubmitError(null);

    const needsLocation = s2.coaching_format === "in_person" || s2.coaching_format === "both";
    const needsTimezone = s2.coaching_format === "remote" || s2.coaching_format === "both";

    const body: CoachCreate = {
      // Omit email/display_name when JWT is present — API uses the authenticated user
      ...(sessionLocked ? {} : {
        email: s1.email.trim(),
        display_name: s1.display_name.trim(),
      }),
      headline: s2.headline.trim(),
      bio: s2.bio.trim(),
      sport_slugs: s1.sport_slugs,
      ...(s1.years_experience ? { years_experience: parseInt(s1.years_experience, 10) } : {}),
      ...(s2.adventure_story.trim() ? { adventure_story: s2.adventure_story.trim() } : {}),
      ...(s2.coaching_format ? { coaching_format: s2.coaching_format } : {}),
      ...(needsTimezone && s2.timezone ? { timezone: s2.timezone } : {}),
      ...(needsLocation && s2.location_city.trim() ? { location_city: s2.location_city.trim() } : {}),
      ...(needsLocation && s2.location_region.trim() ? { location_region: s2.location_region.trim() } : {}),
      ...(s2.website_url.trim() ? { website_url: s2.website_url.trim() } : {}),
    };

    try {
      const coach = await createCoach(body, getToken() ?? undefined);
      router.push(`/coaches/${coach.id}`);
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_CONFLICT") {
        setStep(1);
        setEmailError("An account with this email already exists.");
      } else if (err instanceof Error && err.message === "PROFILE_EXISTS") {
        router.replace("/dashboard?notice=profile_exists");
      } else if (err instanceof Error && err.message.startsWith("VALIDATION:")) {
        setSubmitError(err.message.replace("VALIDATION:", ""));
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ProgressBar step={step} />

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="surface-panel space-y-6 p-6 sm:p-8">
          <div className="space-y-1">
            <label className="field-label" htmlFor="display_name">Full name</label>
            <input
              id="display_name"
              className={`input ${sessionLocked ? "opacity-60" : ""}`}
              type="text"
              placeholder="Your name"
              value={s1.display_name}
              onChange={(e) => !sessionLocked && setS1((p) => ({ ...p, display_name: e.target.value }))}
              readOnly={sessionLocked}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="field-label" htmlFor="email">
              Email
              {sessionLocked && (
                <span className="ml-2 font-normal text-[var(--text-muted)]">(from your account)</span>
              )}
            </label>
            <input
              id="email"
              className={`input ${sessionLocked ? "opacity-60" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={s1.email}
              onChange={(e) => {
                if (sessionLocked) return;
                setS1((p) => ({ ...p, email: e.target.value }));
                setEmailError(null);
              }}
              readOnly={sessionLocked}
              required
            />
            {emailError && (
              <p className="mt-1 text-xs text-[var(--color-coral)]">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="field-label">Sport(s) you coach <span className="text-[var(--color-coral)]">*</span></p>
            {sports.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Could not load sports — check your API connection.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sports.map((s) => {
                  const active = s1.sport_slugs.includes(s.slug);
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => toggleSport(s.slug)}
                      className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium transition
                        ${active
                          ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-white"
                          : "border-[var(--border-default)] bg-transparent text-[var(--text-primary)] hover:border-[var(--color-coral)]/60"
                        }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="field-label" htmlFor="years_experience">
              Years of experience <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              id="years_experience"
              className="input w-32"
              type="number"
              min={0}
              max={80}
              placeholder="e.g. 7"
              value={s1.years_experience}
              onChange={(e) => setS1((p) => ({ ...p, years_experience: e.target.value }))}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next: your story →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="surface-panel space-y-6 p-6 sm:p-8">
          {submitError && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-coral)]/40 bg-[var(--color-coral-pale)] px-4 py-3 text-sm text-[var(--color-coral)]">
              {submitError}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <label className="field-label" htmlFor="headline">Headline <span className="text-[var(--color-coral)]">*</span></label>
              <span className={`text-xs tabular-nums ${s2.headline.length > 180 ? "text-[var(--color-coral)]" : "text-[var(--text-muted)]"}`}>
                {s2.headline.length}/200
              </span>
            </div>
            <input
              id="headline"
              className="input"
              type="text"
              maxLength={200}
              placeholder="e.g. Open-water swimmer · Iron-distance pacing"
              value={s2.headline}
              onChange={(e) => setS2((p) => ({ ...p, headline: e.target.value }))}
              required
            />
            <p className="text-xs text-[var(--text-muted)]">One punchy line — sport, speciality, and what makes you you.</p>
          </div>

          <div className="space-y-1">
            <label className="field-label" htmlFor="bio">How I coach <span className="text-[var(--color-coral)]">*</span></label>
            <textarea
              id="bio"
              className="input min-h-[120px] resize-y"
              placeholder="Describe your coaching approach, what sessions look like, and who you coach best."
              value={s2.bio}
              onChange={(e) => setS2((p) => ({ ...p, bio: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="field-label" htmlFor="adventure_story">
              Why this matters to me <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              id="adventure_story"
              className="input min-h-[100px] resize-y"
              placeholder="The moment or journey that made you want to coach."
              value={s2.adventure_story}
              onChange={(e) => setS2((p) => ({ ...p, adventure_story: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <p className="field-label">Coaching format <span className="text-[var(--color-coral)]">*</span></p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "in_person", label: "In person" },
                  { value: "remote", label: "Remote" },
                  { value: "both", label: "Both" },
                ] as { value: CoachingFormat; label: string }[]
              ).map(({ value, label }) => {
                const active = s2.coaching_format === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setS2((p) => ({ ...p, coaching_format: value }))}
                    className={`rounded-[var(--radius-md)] border px-5 py-2 text-sm font-medium transition
                      ${active
                        ? "border-[var(--color-purple-mid)] bg-[var(--color-purple-mid)] text-white"
                        : "border-[var(--border-default)] bg-transparent text-[var(--text-primary)] hover:border-[var(--color-purple-mid)]/60"
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {(s2.coaching_format === "in_person" || s2.coaching_format === "both") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="field-label" htmlFor="location_city">City</label>
                <input
                  id="location_city"
                  className="input"
                  type="text"
                  placeholder="e.g. Boulder"
                  value={s2.location_city}
                  onChange={(e) => setS2((p) => ({ ...p, location_city: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="field-label" htmlFor="location_region">State / Province</label>
                <input
                  id="location_region"
                  className="input"
                  type="text"
                  placeholder="e.g. CO"
                  value={s2.location_region}
                  onChange={(e) => setS2((p) => ({ ...p, location_region: e.target.value }))}
                />
              </div>
            </div>
          )}

          {(s2.coaching_format === "remote" || s2.coaching_format === "both") && (
            <div className="space-y-1">
              <label className="field-label" htmlFor="timezone">Timezone</label>
              <select
                id="timezone"
                className="input"
                value={s2.timezone}
                onChange={(e) => setS2((p) => ({ ...p, timezone: e.target.value }))}
              >
                <option value="">Select your timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="field-label" htmlFor="website_url">
              Website <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              id="website_url"
              className="input"
              type="url"
              placeholder="https://yoursite.com"
              value={s2.website_url}
              onChange={(e) => setS2((p) => ({ ...p, website_url: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={!step2Valid || submitting}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Creating profile…" : "Create my profile"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
