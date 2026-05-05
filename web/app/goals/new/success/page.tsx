import Link from "next/link";

export const metadata = {
  title: "Goal posted — Newli",
};

type Props = { searchParams: Promise<{ name?: string }> };

export default async function GoalSuccessPage({ searchParams }: Props) {
  const { name } = await searchParams;
  const firstName = name ? name.split(" ")[0] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-purple-pale)] text-2xl">
        ✓
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
        {firstName ? `Your goal is live, ${firstName}.` : "Your goal is live."}
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-[var(--text-muted)]">
        Coaches who specialize in your sport can now find you. Browse the directory while you wait — the right match might already be here.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/coaches" className="btn-primary inline-flex items-center justify-center">
          Browse coaches
        </Link>
        <Link href="/goals" className="btn-secondary inline-flex items-center justify-center">
          See all goals
        </Link>
      </div>
    </div>
  );
}
