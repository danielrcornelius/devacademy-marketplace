import { fetchSports } from "@/lib/api";
import { GoalForm } from "./GoalForm";

export const metadata = {
  title: "Post your goal — Newli",
  description: "Tell us what you're working toward. The right coach is looking for exactly this.",
};

export default async function PostGoalPage() {
  let sports: Awaited<ReturnType<typeof fetchSports>> = [];
  try {
    sports = await fetchSports();
  } catch {
    // form will show an inline note if sports failed
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-ui text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-secondary)]">
        Athletes
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-5xl">
        Post your goal
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--text-muted)]">
        Tell us what you&apos;re working toward. Coaches here specialize in exactly the kind of goal you&apos;re describing — let them find you.
      </p>
      <div className="mt-10">
        <GoalForm sports={sports} />
      </div>
    </div>
  );
}
