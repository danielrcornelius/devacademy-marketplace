import Link from "next/link";
import { fetchCoaches, fetchHealth, fetchSports, fetchStudentGoals, type StudentGoal } from "@/lib/api";
import { DEV_OFFLINE_GOALS } from "@/lib/dev-offline-demo";

const STATIC_EXAMPLES: { title: string; body: string; sport: string }[] = [
  {
    title: "Olympic-distance triathlon",
    body: "Open-water confidence, pacing, and a plan that respects your life off the bike.",
    sport: "Triathlon",
  },
  {
    title: "Technical trail riding",
    body: "Cornering, drops, and line choice so steep sections feel like play, not panic.",
    sport: "Mountain biking",
  },
  {
    title: "Pool-to-open-water swim",
    body: "Stroke efficiency and sighting so race morning starts calm, not chaotic.",
    sport: "Swimming",
  },
];

export default async function HomePage() {
  let coachCount = 0;
  let goalCount = 0;
  let liveGoals: StudentGoal[] = [];

  try {
    await fetchHealth();
    const [coaches, goals] = await Promise.all([fetchCoaches(), fetchStudentGoals()]);
    coachCount = coaches.length;
    goalCount = goals.length;
    liveGoals = goals.slice(0, 3);
  } catch {
    // API offline — fall back to static examples
  }

  const displayGoals = liveGoals.length > 0 ? null : STATIC_EXAMPLES;

  return (
    <div className="bg-[var(--bg-dark)] text-[var(--text-on-dark)]">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <section className="grid gap-14 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">

          <div className="space-y-7 lg:pt-4">
            <p className="anim-rise font-ui text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-on-dark-muted)]">
              {coachCount > 0 ? `${coachCount} coaches · ${goalCount} athlete goals` : "Coaches · Athletes · Big goals"}
            </p>
            <h1 className="anim-rise anim-rise-1 font-display text-[2.35rem] font-bold leading-[1.05] sm:text-5xl lg:text-[3.25rem]">
              Find the coach who{" "}
              <span className="text-[var(--color-coral)]">rewrites your edge</span>
              <span className="text-[var(--text-on-dark-muted)]"> — then go live it.</span>
            </h1>
            <p className="anim-rise anim-rise-2 max-w-xl text-lg leading-relaxed text-[var(--text-on-dark-muted)]">
              Newli connects athletes with coaches who specialize in real-world pursuits:
              triathlon build blocks, open-water swimming, technical MTB, and the training culture
              that keeps you showing up.
            </p>
            <div className="anim-rise anim-rise-3 flex flex-wrap gap-3">
              <Link href="/coaches" className="btn-primary inline-flex items-center justify-center">
                Browse coaches
              </Link>
              <Link
                href="/goals/new"
                className="btn-secondary btn-secondary--onDark inline-flex items-center justify-center"
              >
                Post your goal
              </Link>
            </div>
          </div>

          <div className="anim-rise anim-rise-2 surface-panel relative overflow-hidden p-6 sm:p-9 lg:translate-y-10">
            <div className="relative flex items-center justify-between">
              <p className="font-ui text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                {liveGoals.length > 0 ? "Goals on file" : "What athletes chase"}
              </p>
              {liveGoals.length > 0 && (
                <Link href="/goals" className="font-ui text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]">
                  See all →
                </Link>
              )}
            </div>
            <div className="relative mt-7 space-y-4">
              {liveGoals.length > 0
                ? liveGoals.map((g, i) => (
                    <div
                      key={g.id}
                      className={`anim-rise rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface-tinted)] p-4 sm:p-5 ${["anim-rise-2", "anim-rise-3", "anim-rise-4"][i] ?? ""}`}
                    >
                      {g.sport && (
                        <p className="badge-sport inline-block uppercase tracking-wider">{g.sport.name}</p>
                      )}
                      <p className="mt-3 font-display text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                        {g.title}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
                        {g.goal_description}
                      </p>
                    </div>
                  ))
                : (displayGoals ?? []).map((ex, i) => (
                    <div
                      key={ex.title}
                      className={`anim-rise rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface-tinted)] p-4 sm:p-5 ${["anim-rise-2", "anim-rise-3", "anim-rise-4"][i] ?? ""}`}
                    >
                      <p className="badge-sport inline-block uppercase tracking-wider">{ex.sport}</p>
                      <p className="mt-3 font-display text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                        {ex.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{ex.body}</p>
                    </div>
                  ))}
            </div>
            {liveGoals.length === 0 && (
              <Link
                href="/goals/new"
                className="relative mt-6 block font-ui text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
              >
                Post your goal →
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Coach recruitment strip */}
      <div className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-14">
          <div className="space-y-2">
            <p className="font-ui text-xs font-medium uppercase tracking-[0.28em] text-[var(--text-on-dark-muted)]">
              Are you the coach?
            </p>
            <p className="font-display text-2xl font-bold text-[var(--text-on-dark)] sm:text-3xl">
              Your story belongs here too.
            </p>
            <p className="max-w-md text-base leading-relaxed text-[var(--text-on-dark-muted)]">
              Two steps to a live profile — your sport, your approach, and the moment that made you want to coach.
            </p>
          </div>
          <Link
            href="/coaches/join"
            className="btn-secondary btn-secondary--onDark inline-flex shrink-0 items-center justify-center"
          >
            List yourself →
          </Link>
        </div>
      </div>
    </div>
  );
}
