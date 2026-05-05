import { fetchSports } from "@/lib/api";
import { JoinForm } from "./JoinForm";

export const metadata = {
  title: "List yourself as a coach — Newli",
  description: "Share your sport, your story, and your coaching approach. Athletes are looking for exactly what you offer.",
};

export default async function JoinPage() {
  let sports: Awaited<ReturnType<typeof fetchSports>> = [];
  try {
    sports = await fetchSports();
  } catch {
    // Form will show an inline error if sports failed to load
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-ui text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-secondary)]">
        Coaches
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-5xl">
        List yourself
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--text-muted)]">
        Two quick steps. Share your sport, your story, and your approach — then your profile goes live.
      </p>
      <div className="mt-10">
        <JoinForm sports={sports} />
      </div>
    </div>
  );
}
