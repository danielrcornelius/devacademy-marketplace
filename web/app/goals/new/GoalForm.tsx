"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type SkillLevel, type StudentGoalCreate, type Sport, createStudentGoal } from "@/lib/api";
import { fetchMe, getToken } from "@/lib/auth";

const SKILL_LEVELS: { value: SkillLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to the sport or just starting structured training" },
  { value: "intermediate", label: "Intermediate", description: "Consistent training, have competed or done the sport for 1–3 years" },
  { value: "advanced", label: "Advanced", description: "Experienced, looking to level up a specific area" },
];

type Fields = {
  display_name: string;
  email: string;
  sport_slug: string;
  title: string;
  goal_description: string;
  skill_level: SkillLevel | "";
  target_date: string;
};

export function GoalForm({ sports }: { sports: Sport[] }) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({
    display_name: "",
    email: "",
    sport_slug: "",
    title: "",
    goal_description: "",
    skill_level: "",
    target_date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionLocked, setSessionLocked] = useState(false);

  useEffect(() => {
    fetchMe().then((u) => {
      if (u) {
        setFields((prev) => ({ ...prev, display_name: u.display_name, email: u.email }));
        setSessionLocked(true);
      }
    });
  }, []);

  const valid =
    fields.display_name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) &&
    fields.title.trim().length > 0 &&
    fields.title.trim().length <= 200 &&
    fields.goal_description.trim().length > 0;

  function set(key: keyof Fields, value: string) {
    setFields((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setSubmitError(null);

    const body: StudentGoalCreate = {
      email: fields.email.trim(),
      display_name: fields.display_name.trim(),
      title: fields.title.trim(),
      goal_description: fields.goal_description.trim(),
      ...(fields.sport_slug ? { sport_slug: fields.sport_slug } : {}),
      ...(fields.skill_level ? { skill_level: fields.skill_level as SkillLevel } : {}),
      ...(fields.target_date ? { target_date: fields.target_date } : {}),
    };

    try {
      const goal = await createStudentGoal(body, getToken() ?? undefined);
      router.push(`/goals/new/success?id=${goal.id}&name=${encodeURIComponent(fields.display_name.trim())}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("VALIDATION:")) {
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
      <div className="surface-panel space-y-6 p-6 sm:p-8">
        {submitError && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-coral)]/40 bg-[var(--color-coral-pale)] px-4 py-3 text-sm text-[var(--color-coral)]">
            {submitError}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="field-label" htmlFor="display_name">
              Your name <span className="text-[var(--color-coral)]">*</span>
            </label>
            <input
              id="display_name"
              className={`input ${sessionLocked ? "opacity-60" : ""}`}
              type="text"
              placeholder="Your name"
              value={fields.display_name}
              onChange={(e) => !sessionLocked && set("display_name", e.target.value)}
              readOnly={sessionLocked}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="field-label" htmlFor="email">
              Email{" "}
              {sessionLocked ? (
                <span className="font-normal text-[var(--text-muted)]">(from your account)</span>
              ) : (
                <span className="text-[var(--color-coral)]">*</span>
              )}
            </label>
            <input
              id="email"
              className={`input ${sessionLocked ? "opacity-60" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={fields.email}
              onChange={(e) => !sessionLocked && set("email", e.target.value)}
              readOnly={sessionLocked}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="field-label" htmlFor="sport_slug">
            Sport <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </label>
          <select
            id="sport_slug"
            className="input"
            value={fields.sport_slug}
            onChange={(e) => set("sport_slug", e.target.value)}
          >
            <option value="">Any / not sure yet</option>
            {sports.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <label className="field-label" htmlFor="title">
              Goal title <span className="text-[var(--color-coral)]">*</span>
            </label>
            <span className={`text-xs tabular-nums ${fields.title.length > 180 ? "text-[var(--color-coral)]" : "text-[var(--text-muted)]"}`}>
              {fields.title.length}/200
            </span>
          </div>
          <input
            id="title"
            className="input"
            type="text"
            maxLength={200}
            placeholder="e.g. Olympic-distance triathlon — first finish strong"
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
          <p className="text-xs text-[var(--text-muted)]">A short, specific headline for what you&apos;re chasing.</p>
        </div>

        <div className="space-y-1">
          <label className="field-label" htmlFor="goal_description">
            Tell us more <span className="text-[var(--color-coral)]">*</span>
          </label>
          <textarea
            id="goal_description"
            className="input min-h-[130px] resize-y"
            placeholder="Where are you now, what specifically are you working on, and what does success look like?"
            value={fields.goal_description}
            onChange={(e) => set("goal_description", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <p className="field-label">
            Skill level <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SKILL_LEVELS.map(({ value, label, description }) => {
              const active = fields.skill_level === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("skill_level", active ? "" : value)}
                  className={`flex flex-col items-start rounded-[var(--radius-md)] border p-3 text-left transition
                    ${active
                      ? "border-[var(--color-purple-mid)] bg-[var(--color-purple-pale)]"
                      : "border-[var(--border-default)] bg-transparent hover:border-[var(--color-purple-mid)]/50"
                    }`}
                >
                  <span className={`text-sm font-semibold ${active ? "text-[var(--color-purple-mid)]" : "text-[var(--text-primary)]"}`}>
                    {label}
                  </span>
                  <span className="mt-1 text-xs leading-snug text-[var(--text-muted)]">{description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <label className="field-label" htmlFor="target_date">
            Target date <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </label>
          <input
            id="target_date"
            className="input w-48"
            type="date"
            value={fields.target_date}
            onChange={(e) => set("target_date", e.target.value)}
          />
        </div>

        <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4">
          <button
            type="submit"
            disabled={!valid || submitting}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Posting goal…" : "Post my goal"}
          </button>
        </div>
      </div>
    </form>
  );
}
