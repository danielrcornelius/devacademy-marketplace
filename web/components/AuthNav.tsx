"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type AuthUser, fetchMe, logout } from "@/lib/auth";

export function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchMe().then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
    router.refresh();
  }

  // Render nothing until we know the auth state to avoid flash
  if (!ready) {
    return <div className="h-8 w-20 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-purple-mid)]/10" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="font-ui hidden max-w-[140px] truncate rounded-[var(--radius-md)] px-2 py-1.5 text-sm font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-purple-mid)]/20 hover:text-[var(--text-on-dark)] sm:inline-block"
          title={user.display_name}
        >
          {user.display_name}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="font-ui rounded-[var(--radius-md)] px-2 py-1.5 text-xs font-medium text-[var(--text-on-dark-muted)] transition hover:bg-[var(--color-coral)]/20 hover:text-[var(--color-coral)] sm:text-sm"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="font-ui rounded-[var(--radius-md)] border border-[var(--color-purple-light)]/30 px-3 py-1.5 text-sm font-medium text-[var(--text-on-dark-muted)] transition hover:border-[var(--color-purple-light)]/60 hover:text-[var(--text-on-dark)]"
    >
      Sign in
    </Link>
  );
}
