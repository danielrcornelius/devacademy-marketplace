// Client-side auth utilities. All functions read/write localStorage and must
// only be called in browser context (never during SSR).

const JWT_KEY = "newli_jwt";

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  role: "student" | "coach";
  created_at: string;
};

function getApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return url.replace(/\/$/, "");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(JWT_KEY);
}

function saveToken(token: string): void {
  localStorage.setItem(JWT_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(JWT_KEY);
}

/** Returns an Authorization header object when a JWT is stored, otherwise {}. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Request a magic link email. Creates a new user if the email is not yet registered. */
export async function requestMagicLink(
  email: string,
  opts?: { display_name?: string; role?: "student" | "coach" }
): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/request-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      display_name: opts?.display_name,
      role: opts?.role ?? "student",
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? "Failed to send magic link. Try again.");
  }
}

/** Exchange a one-time token for a JWT, persists to localStorage, returns the user. */
export async function verifyMagicLink(token: string): Promise<AuthUser> {
  const res = await fetch(
    `${getApiBase()}/auth/verify?token=${encodeURIComponent(token)}`
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? "Invalid or expired link.");
  }
  const body = (await res.json()) as { user: AuthUser; access_token: string };
  saveToken(body.access_token);
  return body.user;
}

/** Returns the currently logged-in user, or null if not authenticated / token expired. */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${getApiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

/** Sign out — clears the stored JWT. */
export function logout(): void {
  clearToken();
}
