"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { type AuthUser, fetchMe, logout, getToken } from "@/lib/auth";
import {
  type CoachProfile,
  type Inquiry,
  type Booking,
  fetchMyCoachProfile,
  fetchMyInquiries,
  fetchMyCoachBookings,
  fetchMyAthleteBookings,
} from "@/lib/api";

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");

  const [user, setUser] = useState<AuthUser | null>(null);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [coachBookings, setCoachBookings] = useState<Booking[]>([]);
  const [athleteBookings, setAthleteBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);

      const token = getToken();
      if (token) {
        if (u.role === "coach") {
          const [profile, inqs, bkgs] = await Promise.all([
            fetchMyCoachProfile(token).catch(() => null),
            fetchMyInquiries(token).catch(() => []),
            fetchMyCoachBookings(token).catch(() => []),
          ]);
          setCoachProfile(profile);
          setInquiries(inqs);
          setCoachBookings(bkgs);
        } else {
          const bkgs = await fetchMyAthleteBookings(token).catch(() => []);
          setAthleteBookings(bkgs);
        }
      }

      setLoading(false);
    });
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-[72vh] items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-purple-pale)] border-t-[var(--color-purple-mid)]" />
      </main>
    );
  }

  if (!user) return null;

  const isCoach = user.role === "coach";

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {/* Notice banner */}
      {notice === "profile_exists" && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-purple-mid)]/30 bg-[var(--color-purple-pale)] px-4 py-3 text-sm text-[var(--color-purple-mid)]">
          You already have a coach profile — you can update it below.
        </div>
      )}

      {/* Header */}
      <div className="mb-10">
        <p className="font-ui mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Your profile
        </p>
        <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
          {user.display_name}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium ${
              isCoach
                ? "bg-[var(--color-coral-pale)] text-[#712b13]"
                : "bg-[var(--color-purple-pale)] text-[var(--color-purple-mid)]"
            }`}
          >
            {isCoach ? "Coach" : "Athlete"}
          </span>
          <span className="font-ui text-sm text-[var(--text-muted)]">{user.email}</span>
        </div>
      </div>

      {isCoach ? (
        <CoachSection coachProfile={coachProfile} inquiries={inquiries} bookings={coachBookings} />
      ) : (
        <AthleteSection bookings={athleteBookings} />
      )}

      {/* Sign out */}
      <div className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="font-ui text-sm text-[var(--text-muted)] underline-offset-2 hover:text-[var(--color-coral)] hover:underline"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function CoachSection({
  coachProfile,
  inquiries,
  bookings,
}: {
  coachProfile: CoachProfile | null;
  inquiries: Inquiry[];
  bookings: Booking[];
}) {
  if (!coachProfile) {
    return (
      <div className="space-y-4">
        <div className="surface-panel p-6">
          <p className="font-ui mb-4 text-sm text-[var(--text-muted)]">
            You don&apos;t have a coach profile yet.
          </p>
          <Link href="/coaches/join" className="btn-primary font-ui inline-block text-sm">
            Create your profile
          </Link>
        </div>
        <ActionCard
          label="Leads"
          title="Browse athlete goals"
          description="See what athletes are working toward and find where you can help."
          href="/goals"
        />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* Live profile card */}
      <div className="surface-panel p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-ui text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Your coach profile
            </p>
            <p className="font-display mt-1 text-lg font-semibold text-[var(--text-primary)] leading-snug">
              {coachProfile.headline}
            </p>
          </div>
          <Link
            href={`/coaches/${coachProfile.id}`}
            className="font-ui shrink-0 text-xs font-medium text-[var(--color-purple-mid)] underline-offset-2 hover:underline"
          >
            View →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {coachProfile.sports.map((s) => (
            <span key={s.slug} className="badge-sport uppercase tracking-wider">
              {s.name}
            </span>
          ))}
          {coachProfile.coaching_format && (
            <span className="badge-format capitalize">
              {coachProfile.coaching_format === "in_person"
                ? "In person"
                : coachProfile.coaching_format === "remote"
                ? "Remote"
                : "In person & remote"}
            </span>
          )}
        </div>
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <Link
            href="/coaches/join"
            className="font-ui text-sm font-medium text-[var(--color-purple-mid)] underline-offset-2 hover:underline"
          >
            Edit profile
          </Link>
        </div>
      </div>

      {/* Availability + upcoming sessions */}
      <Link
        href="/dashboard/availability"
        className="surface-panel group flex items-center justify-between gap-4 p-5 transition hover:border-[var(--color-purple-mid)]"
      >
        <div className="flex flex-col gap-1">
          <span className="font-ui text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Availability
          </span>
          <span className="font-ui font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-purple-mid)]">
            {bookings.length > 0
              ? `${bookings.length} upcoming session${bookings.length > 1 ? "s" : ""}`
              : "Set your schedule"}
          </span>
          <span className="font-ui text-sm text-[var(--text-muted)]">
            Manage your weekly windows and view booked sessions.
          </span>
        </div>
        {bookings.length > 0 && (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-coral-pale)] px-2.5 py-1 text-xs font-semibold text-[#712b13]">
            {bookings.length}
          </span>
        )}
      </Link>

      <ActionCard
        label="Leads"
        title="Browse athlete goals"
        description="Find athletes who need what you offer."
        href="/goals"
      />

      {/* Inquiries */}
      <InquiriesSection inquiries={inquiries} />
    </div>
  );
}

function InquiriesSection({ inquiries }: { inquiries: Inquiry[] }) {
  if (inquiries.length === 0) return null;

  return (
    <div className="surface-panel divide-y divide-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="font-ui text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Inquiries
        </p>
        <span className="rounded-[var(--radius-pill)] bg-[var(--color-coral-pale)] px-2 py-0.5 text-xs font-semibold text-[#712b13]">
          {inquiries.length}
        </span>
      </div>
      {inquiries.map((inq) => (
        <div key={inq.id} className="px-5 py-4">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-ui text-sm font-semibold text-[var(--text-primary)]">
              {inq.sender_name}
            </span>
            <span className="font-ui text-xs text-[var(--text-muted)]">
              {new Date(inq.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <a
            href={`mailto:${inq.sender_email}`}
            className="font-ui mb-2 block text-xs text-[var(--color-purple-mid)] underline-offset-2 hover:underline"
          >
            {inq.sender_email}
          </a>
          <p className="font-ui text-sm leading-relaxed text-[var(--text-muted)] line-clamp-3">
            {inq.message}
          </p>
        </div>
      ))}
    </div>
  );
}

function AthleteSection({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          label="Training goals"
          title="Post a new goal"
          description="Tell coaches what you're working toward."
          href="/goals/new"
        />
        <ActionCard
          label="Find a coach"
          title="Browse coaches"
          description="Find the right coach for your sport and goals."
          href="/coaches"
        />
      </div>
      {bookings.length > 0 && (
        <div className="surface-panel divide-y divide-[var(--border-subtle)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="font-ui text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Upcoming sessions
            </p>
            <span className="rounded-[var(--radius-pill)] bg-[var(--color-purple-pale)] px-2 py-0.5 text-xs font-semibold text-[var(--color-purple-mid)]">
              {bookings.length}
            </span>
          </div>
          {bookings.map((b) => (
            <div key={b.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-ui text-sm font-semibold text-[var(--text-primary)]">
                    Session with {b.coach_name}
                  </span>
                <span className="font-ui text-xs text-[var(--text-muted)]">
                  {new Date(b.scheduled_at).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}{" "}
                  · {b.duration_minutes} min
                </span>
              </div>
              {b.notes && (
                <p className="font-ui mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                  {b.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  label,
  title,
  description,
  href,
}: {
  label: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="surface-panel group flex flex-col gap-2 p-5 transition hover:border-[var(--color-purple-mid)]"
    >
      <span className="font-ui text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-ui font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-purple-mid)]">
        {title}
      </span>
      <span className="font-ui text-sm text-[var(--text-muted)]">{description}</span>
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[72vh] items-center justify-center px-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-purple-pale)] border-t-[var(--color-purple-mid)]" />
        </main>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
