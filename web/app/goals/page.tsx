import Link from "next/link";
import { fetchSports, fetchStudentGoals, describeApiFetchError, getApiBaseUrl } from "@/lib/api";
import {
  DEV_OFFLINE_SPORTS,
  DEV_OFFLINE_GOALS,
  filterDevOfflineGoals,
  isDevOfflineConnectionError,
} from "@/lib/dev-offline-demo";

const SKILL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

type SearchParams = Promise<{ sport_slug?: string }>;

export const metadata = {
  title: "Athlete goals — Newli",
  description: "Browse what athletes are working toward. Find the goal that matches your coaching specialty.",
};

export default async function GoalsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  let sports: Awaited<ReturnType<typeof fetchSports>> = [];
  let goals: Awaited<ReturnType<typeof fetchStudentGoals>> = [];
  let error: string | null = null;
  let offlineDemo = false;

  let resolvedBase = "";
  try {
    resolvedBase = getApiBaseUrl();
  } catch {
    resolvedBase = "__GET_API_BASE_URL_THREW__";
  }

  try {
    [sports, goals] = await Promise.all([
      fetchSports(),
      fetchStudentGoals(sp.sport_slug),
    ]);
  } catch (e) {
    if (resolvedBase !== "__GET_API_BASE_URL_THREW__" && isDevOfflineConnectionError(e)) {
      offlineDemo = true;
      sports = DEV_OFFLINE_SPORTS;
      goals = filterDevOfflineGoals(sp.sport_slug);
    } else {
      error =
        resolvedBase === "__GET_API_BASE_URL_THREW__"
          ? "NEXT_PUBLIC_API_URL is not set. Copy web/.env.example to web/.env and set the API URL."
          : describeApiFetchError(e, resolvedBase);
    }
  }

  const sportSlug = sp.sport_slug ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <p className="font-ui text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-secondary)]">
          Athletes
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-5xl">
          What athletes are chasing
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-muted)]">
          Real goals from athletes looking for the right coach. Filter by sport to find the ones that match your specialty.
        </p>
      </div>

      <form
        className="surface-panel mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-end"
        action="/goals"
        method="get"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm text-[var(--text-muted)]">
          <span className="font-ui font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Sport
          </span>
          <select name="sport_slug" defaultValue={sportSlug} className="input">
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn-primary inline-flex h-12 shrink-0 items-center justify-center px-8 sm:h-[46px]"
        >
          Filter
        </button>
        <Link
          href="/goals/new"
          className="btn-secondary inline-flex h-12 shrink-0 items-center justify-center px-6 sm:h-[46px]"
        >
          Post your goal
        </Link>
      </form>

      {offlineDemo && (
        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface-tinted)] p-5">
          <p className="font-display text-base font-bold text-[var(--text-secondary)]">Offline demo</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Showing sample goals. Start FastAPI on port 8000 to use your real database.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--color-coral-pale)] p-6">
          <p className="font-display text-lg font-bold text-[var(--color-coral)]">API unavailable</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{error}</p>
        </div>
      )}

      {!error && goals.length === 0 && (
        <div className="mt-12 rounded-[var(--radius-xl)] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface-tinted)] p-12 text-center">
          <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
            No goals posted yet
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
            Be the first to share what you&apos;re working toward.
          </p>
          <Link href="/goals/new" className="btn-primary mt-8 inline-flex items-center justify-center">
            Post a goal
          </Link>
        </div>
      )}

      {!error && goals.length > 0 && (
        <ul className="mt-12 grid gap-7 md:grid-cols-2">
          {goals.map((g, idx) => (
            <li key={g.id} className={idx % 2 === 1 ? "md:translate-y-4" : ""}>
              <div className="surface-panel flex h-full flex-col p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {g.sport && (
                    <span className="badge-sport uppercase tracking-wider">{g.sport.name}</span>
                  )}
                  {g.skill_level && SKILL_LABEL[g.skill_level] && (
                    <span className="badge-featured">{SKILL_LABEL[g.skill_level]}</span>
                  )}
                </div>
                <h2 className="mt-4 font-display text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                  {g.title}
                </h2>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  {g.goal_description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-primary)]">{g.display_name}</span>
                  {g.target_date && (
                    <span>Target: {new Date(g.target_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </div>
            </li>
          ))}

          {/* Ghost "post your goal" card */}
          <li className={goals.length % 2 === 1 ? "md:translate-y-4" : ""}>
            <Link
              href="/goals/new"
              className="group flex h-full flex-col items-start justify-between rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-6 transition hover:border-[var(--color-purple-mid)] hover:bg-[var(--bg-surface-tinted)]"
            >
              <div>
                <p className="font-ui text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Have a goal?
                </p>
                <p className="mt-4 font-display text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                  Post yours.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  Coaches browse these goals. The right one might reach out.
                </p>
              </div>
              <span className="mt-8 font-ui text-sm font-medium text-[var(--text-secondary)] transition group-hover:text-[var(--color-purple-mid)]">
                Share your goal →
              </span>
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
