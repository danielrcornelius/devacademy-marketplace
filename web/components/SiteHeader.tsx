import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";

export function SiteHeader() {
  return (
    <header className="relative z-[60] border-b border-[var(--border-subtle)] bg-[var(--bg-dark)] px-3 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/newli-mark-dark.svg"
            alt=""
            width={120}
            height={140}
            className="h-9 w-auto shrink-0 sm:h-10"
            priority
            unoptimized
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-display lowercase text-xl font-semibold leading-none tracking-tight text-[var(--text-on-dark)] sm:text-2xl">
              newli
            </span>
            <span className="font-ui text-[0.65rem] font-medium uppercase tracking-[0.3em] text-[var(--color-purple-light)]">
              Athlete development
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link
            href="/coaches"
            className="font-ui hidden rounded-[var(--radius-md)] px-2 py-1.5 font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-purple-mid)]/20 hover:text-[var(--text-on-dark)] sm:inline-block"
          >
            Find coaches
          </Link>
          <Link
            href="/goals"
            className="font-ui hidden rounded-[var(--radius-md)] px-2 py-1.5 font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-purple-mid)]/20 hover:text-[var(--text-on-dark)] sm:inline-block"
          >
            Athlete goals
          </Link>
          <Link
            href="/goals/new"
            className="font-ui inline-block rounded-[var(--radius-md)] px-2 py-1.5 text-xs font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-purple-mid)]/20 hover:text-[var(--text-on-dark)] sm:hidden"
          >
            Post goal
          </Link>
          <Link
            href="/coaches/join"
            className="font-ui inline-block rounded-[var(--radius-md)] px-2 py-1.5 font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-purple-mid)]/20 hover:text-[var(--text-on-dark)] sm:hidden"
            aria-label="List yourself as a coach"
          >
            <span className="text-xs">Coach</span>
          </Link>
          <Link
            href="/coaches/join"
            className="font-ui hidden rounded-[var(--radius-md)] px-2 py-1.5 font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-purple-mid)]/20 hover:text-[var(--text-on-dark)] sm:inline-block"
          >
            Coach
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
