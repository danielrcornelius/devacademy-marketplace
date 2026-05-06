import Link from "next/link";
import { describeApiFetchError, fetchCoaches, fetchSports, getApiBaseUrl } from "@/lib/api";
import {
  DEV_OFFLINE_SPORTS,
  filterDevOfflineCoaches,
  isDevOfflineConnectionError,
} from "@/lib/dev-offline-demo";

type SearchParams = Promise<{ sport_slug?: string; q?: string }>;

export default async function CoachesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  let sports: Awaited<ReturnType<typeof fetchSports>> = [];
  let coaches: Awaited<ReturnType<typeof fetchCoaches>> = [];
  let error: string | null = null;
  let offlineDemo = false;

  let resolvedBase = "";
  try {
    resolvedBase = getApiBaseUrl();
  } catch {
    resolvedBase = "__GET_API_BASE_URL_THREW__";
  }

  try {
    [sports, coaches] = await Promise.all([
      fetchSports(),
      fetchCoaches({ sport_slug: sp.sport_slug, q: sp.q }),
    ]);
  } catch (e) {
    if (resolvedBase !== "__GET_API_BASE_URL_THREW__" && isDevOfflineConnectionError(e)) {
      offlineDemo = true;
      sports = DEV_OFFLINE_SPORTS;
      coaches = filterDevOfflineCoaches({ sport_slug: sp.sport_slug, q: sp.q });
    } else {
      error =
        resolvedBase === "__GET_API_BASE_URL_THREW__"
          ? "NEXT_PUBLIC_API_URL is not set. Copy web/.env.example to web/.env and set the API URL."
          : describeApiFetchError(e, resolvedBase);
    }
  }

  const sportSlug = sp.sport_slug ?? "";
  const q = sp.q ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <p className="font-ui text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-secondary)]">
          Discovery
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-5xl">
          Find your coach
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-muted)]">
          Filter by sport, skim headlines, read the stories. Every coach here is building toward
          the same thing you are: progress that sticks when it gets hard.
        </p>
      </div>

      <form
        className="surface-panel mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-end"
        action="/coaches"
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
        <label className="flex flex-[1.2] flex-col gap-2 text-sm text-[var(--text-muted)]">
          <span className="font-ui font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Search
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="e.g. open water, corners, pacing"
            className="input"
          />
        </label>
        <button
          type="submit"
          className="btn-primary inline-flex h-12 shrink-0 items-center justify-center px-8 sm:h-[46px]"
        >
          Apply
        </button>
      </form>

      {offlineDemo ? (
        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface-tinted)] p-5">
          <p className="font-display text-base font-bold text-[var(--text-secondary)]">Offline demo</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Showing the same sample coaches and sports as the API seed. Start FastAPI on port 8000
            (see README) to use your real database.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--color-coral-pale)] p-6">
          <p className="font-display text-lg font-bold text-[var(--color-coral)]">API unavailable</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{error}</p>
        </div>
      ) : null}

      {!error && coaches.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-xl)] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface-tinted)] p-12 text-center">
          <p className="font-display text-2xl font-bold text-[var(--text-primary)]">
            No coaches match that filter yet
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
            New coaches land here first — widen the sport filter or clear search to see everyone
            shaping this community.
          </p>
          <Link
            href="/coaches"
            className="btn-secondary mt-8 inline-flex items-center justify-center"
          >
            Reset filters
          </Link>
        </div>
      ) : null}

      {!error && coaches.length > 0 ? (
        <ul className="mt-12 grid gap-7 md:grid-cols-2 md:items-start">
          {coaches.map((c) => (
            <li key={c.id}>
              <Link href={`/coaches/${c.id}`} className="coach-card group relative block overflow-hidden p-6">
                <div className="relative flex flex-wrap gap-2">
                  {c.sports.map((s) => (
                    <span key={s.slug} className="badge-sport uppercase tracking-wider">
                      {s.name}
                    </span>
                  ))}
                </div>
                <h2 className="relative mt-5 font-display text-xl font-bold text-[var(--text-primary)] transition group-hover:text-[var(--color-purple-mid)] sm:text-2xl">
                  {c.headline}
                </h2>
                <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  {c.bio}
                </p>
                <div className="relative mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-primary)]">{c.display_name}</span>
                  <span className="flex items-center gap-2 text-right">
                    {c.coaching_format === "remote" ? (
                      <span className="badge-format">Remote</span>
                    ) : c.coaching_format === "both" ? (
                      <>
                        <span>{[c.location_city, c.location_region].filter(Boolean).join(", ")}</span>
                        <span className="badge-format">Remote ok</span>
                      </>
                    ) : (
                      [c.location_city, c.location_region].filter(Boolean).join(", ") || "Location flexible"
                    )}
                  </span>
                </div>
              </Link>
            </li>
          ))}

          {/* Ghost "your slot" card — always shown to invite coaches */}
          <li>
            <Link
              href="/coaches/join"
              className="group flex h-full flex-col items-start justify-between rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] p-6 transition hover:border-[var(--color-purple-mid)] hover:bg-[var(--bg-surface-tinted)]"
            >
              <div>
                <p className="font-ui text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Coach here?
                </p>
                <p className="mt-4 font-display text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                  Add your profile.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  Two steps — your sport, your story, your approach. Then you&apos;re on the map.
                </p>
              </div>
              <span className="mt-8 font-ui text-sm font-medium text-[var(--text-secondary)] transition group-hover:text-[var(--color-purple-mid)]">
                List yourself →
              </span>
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
