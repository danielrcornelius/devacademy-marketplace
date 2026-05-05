import Link from "next/link";

export default function CoachNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-ui text-sm font-medium uppercase tracking-[0.28em] text-[var(--text-secondary)]">
        404
      </p>
      <h1 className="mt-5 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
        Coach not found
      </h1>
      <p className="mt-4 text-[var(--text-muted)]">
        That profile may have moved or the link is incomplete. Head back to the directory and keep
        exploring.
      </p>
      <Link href="/coaches" className="btn-primary mt-10 inline-flex items-center justify-center">
        Browse coaches
      </Link>
    </div>
  );
}
