import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCoach, fetchStudentGoals, type StudentGoal } from "@/lib/api";
import { findDevOfflineCoach, filterDevOfflineGoals, isDevOfflineConnectionError } from "@/lib/dev-offline-demo";
import { InquiryForm } from "@/app/coaches/[id]/InquiryForm";
import { BookingWidget } from "@/app/coaches/[id]/BookingWidget";

type Props = { params: Promise<{ id: string }> };

export default async function CoachDetailPage({ params }: Props) {
  const { id } = await params;
  let coach: Awaited<ReturnType<typeof fetchCoach>>;
  let offlineDemo = false;
  let relatedGoals: StudentGoal[] = [];

  try {
    coach = await fetchCoach(id);
    // Fetch goals for each of the coach's sports in parallel, then deduplicate
    const goalSets = await Promise.all(
      coach.sports.map((s) => fetchStudentGoals(s.slug).catch(() => [] as StudentGoal[]))
    );
    const seen = new Set<string>();
    relatedGoals = goalSets.flat().filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    }).slice(0, 3);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") notFound();
    if (isDevOfflineConnectionError(e)) {
      const demo = findDevOfflineCoach(id);
      if (!demo) notFound();
      coach = demo;
      offlineDemo = true;
      // Offline: show goals matching coach sports
      const allGoals = coach.sports.flatMap((s) => filterDevOfflineGoals(s.slug));
      const seen = new Set<string>();
      relatedGoals = allGoals.filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      }).slice(0, 3);
    } else {
      throw e;
    }
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {offlineDemo ? (
        <p className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface-tinted)] px-4 py-3 text-sm text-[var(--text-muted)]">
          Offline demo profile — start the API for live data.
        </p>
      ) : null}
      <Link
        href="/coaches"
        className="font-ui text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--color-purple-mid)]"
      >
        ← Back to coaches
      </Link>
      <div className="mt-8 flex flex-wrap gap-2">
        {coach.sports.map((s) => (
          <span key={s.slug} className="badge-sport uppercase tracking-wider">
            {s.name}
          </span>
        ))}
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl">
        {coach.headline}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
        {coach.display_name}
        {coach.location_city || coach.location_region
          ? ` · ${[coach.location_city, coach.location_region].filter(Boolean).join(", ")}`
          : null}
        {coach.years_experience != null ? ` · ${coach.years_experience}+ years coaching` : null}
      </p>
      {(coach.coaching_format || coach.timezone) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {coach.coaching_format === "remote" && (
            <span className="badge-format">Remote coaching</span>
          )}
          {coach.coaching_format === "in_person" && (
            <span className="badge-format">In-person coaching</span>
          )}
          {coach.coaching_format === "both" && (
            <span className="badge-format">In person &amp; remote</span>
          )}
          {coach.timezone && (
            <span className="text-xs text-[var(--text-muted)]">{coach.timezone.replace(/_/g, " ")}</span>
          )}
        </div>
      )}
      <div className="surface-panel relative mt-10 space-y-8 p-6 sm:p-10">
        <section className="relative">
          <h2 className="font-ui text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            How I coach
          </h2>
          <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-[var(--text-primary)]">
            {coach.bio}
          </p>
        </section>
        {coach.adventure_story ? (
          <section className="relative border-t border-[var(--border-subtle)] pt-8">
            <h2 className="font-ui text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Why this matters to me
            </h2>
            <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-[var(--text-muted)]">
              {coach.adventure_story}
            </p>
          </section>
        ) : null}
      </div>
      {relatedGoals.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-ui text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Athletes looking for this
            </h2>
            <Link href="/goals" className="font-ui text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]">
              See all goals →
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {relatedGoals.map((g) => (
              <li key={g.id} className="surface-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-display text-base font-bold text-[var(--text-primary)]">{g.title}</p>
                  {g.skill_level && (
                    <span className="badge-featured shrink-0 capitalize">{g.skill_level}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {g.goal_description}
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{g.display_name}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-center">
            <Link href="/goals/new" className="font-ui text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--color-purple-mid)]">
              Post your own goal →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-12">
        <h2 className="font-ui mb-4 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Book a session
        </h2>
        <BookingWidget
          coachId={coach.id}
          coachTimezone={coach.timezone}
          coachName={coach.display_name}
        />
      </div>

      <div className="mt-10">
        <h2 className="font-ui mb-4 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Send an inquiry
        </h2>
        <InquiryForm coachId={coach.id} />
      </div>
    </article>
  );
}
