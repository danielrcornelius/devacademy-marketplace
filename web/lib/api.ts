export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return url.replace(/\/$/, "");
}

function replaceLocalhostWithLoopback(url: string): string {
  return url.replace(/^(https?:\/\/)localhost(?=[:/]|$)/i, (_, scheme: string) => `${scheme}127.0.0.1`);
}

function isLikelyConnectionFailure(error: unknown): boolean {
  return error instanceof TypeError && error.message === "fetch failed";
}

/** Server-side fetch with a dev-only retry on 127.0.0.1 when `localhost` fails (IPv4/IPv6 mismatch on some Windows setups). */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const fallback = replaceLocalhostWithLoopback(url);
    const tryLoopback =
      process.env.NODE_ENV === "development" && isLikelyConnectionFailure(e) && fallback !== url;
    if (tryLoopback) {
      return await fetch(fallback, init);
    }
    throw e;
  }
}

export type Sport = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
};

export type CoachingFormat = "in_person" | "remote" | "both";

export type CoachProfile = {
  id: string;
  headline: string;
  bio: string;
  adventure_story: string | null;
  location_city: string | null;
  location_region: string | null;
  years_experience: number | null;
  website_url: string | null;
  coaching_format: CoachingFormat | null;
  timezone: string | null;
  created_at: string;
  display_name: string;
  email: string;
  sports: Sport[];
};

export type CoachCreate = {
  email: string;
  display_name: string;
  headline: string;
  bio: string;
  adventure_story?: string;
  location_city?: string;
  location_region?: string;
  years_experience?: number;
  website_url?: string;
  coaching_format?: CoachingFormat;
  timezone?: string;
  sport_slugs: string[];
};

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type StudentGoal = {
  id: string;
  title: string;
  goal_description: string;
  skill_level: string | null;
  target_date: string | null;
  created_at: string;
  display_name: string;
  email: string;
  sport: Sport | null;
};

export type StudentGoalCreate = {
  email: string;
  display_name: string;
  title: string;
  goal_description: string;
  sport_slug?: string;
  skill_level?: SkillLevel;
  target_date?: string;
};

export async function fetchSports(): Promise<Sport[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/sports`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sports request failed: ${res.status}`);
  return res.json() as Promise<Sport[]>;
}

export async function fetchCoaches(params?: {
  sport_slug?: string;
  q?: string;
}): Promise<CoachProfile[]> {
  const u = new URL(`${getApiBaseUrl()}/coaches`);
  if (params?.sport_slug) u.searchParams.set("sport_slug", params.sport_slug);
  if (params?.q) u.searchParams.set("q", params.q);
  const res = await apiFetch(u.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Coaches request failed: ${res.status}`);
  return res.json() as Promise<CoachProfile[]>;
}

export async function fetchCoach(id: string): Promise<CoachProfile> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/${id}`, { cache: "no-store" });
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error(`Coach request failed: ${res.status}`);
  return res.json() as Promise<CoachProfile>;
}

export async function fetchStudentGoals(sport_slug?: string): Promise<StudentGoal[]> {
  const u = new URL(`${getApiBaseUrl()}/student-goals`);
  if (sport_slug) u.searchParams.set("sport_slug", sport_slug);
  const res = await apiFetch(u.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Goals request failed: ${res.status}`);
  return res.json() as Promise<StudentGoal[]>;
}

export async function fetchMyCoachProfile(token: string): Promise<CoachProfile | null> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Fetch my profile failed: ${res.status}`);
  return res.json() as Promise<CoachProfile>;
}

export type CoachUpdate = Partial<Omit<CoachCreate, "email" | "display_name">>;

export async function updateCoachProfile(
  body: CoachUpdate,
  token: string
): Promise<CoachProfile> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? `Update profile failed: ${res.status}`);
  }
  return res.json() as Promise<CoachProfile>;
}

export async function createCoach(
  body: CoachCreate,
  token?: string
): Promise<CoachProfile> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 409) throw new Error("EMAIL_CONFLICT");
  if (res.status === 400) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(`VALIDATION:${data.detail ?? "Invalid request"}`);
  }
  if (!res.ok) throw new Error(`Create coach failed: ${res.status}`);
  return res.json() as Promise<CoachProfile>;
}

export async function createStudentGoal(
  body: StudentGoalCreate,
  token?: string
): Promise<StudentGoal> {
  const res = await apiFetch(`${getApiBaseUrl()}/student-goals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 400) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(`VALIDATION:${data.detail ?? "Invalid request"}`);
  }
  if (!res.ok) throw new Error(`Create goal failed: ${res.status}`);
  return res.json() as Promise<StudentGoal>;
}

export type InquiryCreate = {
  sender_name: string;
  sender_email: string;
  message: string;
};

export type Inquiry = {
  id: string;
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
};

export async function createInquiry(
  coachId: string,
  body: InquiryCreate,
  token?: string
): Promise<Inquiry> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/${coachId}/inquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 404) throw new Error("COACH_NOT_FOUND");
  if (res.status === 400) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(`VALIDATION:${data.detail ?? "Invalid request"}`);
  }
  if (!res.ok) throw new Error(`Create inquiry failed: ${res.status}`);
  return res.json() as Promise<Inquiry>;
}

export async function fetchMyInquiries(token: string): Promise<Inquiry[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/me/inquiries`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Fetch inquiries failed: ${res.status}`);
  return res.json() as Promise<Inquiry[]>;
}

// ── Availability & Bookings ───────────────────────────────────────────────────

export type AvailabilityWindow = {
  id: string;
  day_of_week: number; // 0=Mon, 6=Sun
  start_time: string;  // "HH:MM:SS"
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
};

export type AvailabilityWindowIn = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
};

export type Slot = {
  start: string; // ISO-8601 UTC
  end: string;
  duration_minutes: number;
};

export type Booking = {
  id: string;
  coach_profile_id: string;
  coach_name: string;
  athlete_name: string;
  athlete_email: string;
  scheduled_at: string; // ISO-8601 UTC
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  created_at: string;
};

export type BookingCreate = {
  scheduled_at: string;
  athlete_name: string;
  athlete_email: string;
  notes?: string;
};

export async function fetchCoachSlots(
  coachId: string,
  params?: { start?: string; end?: string }
): Promise<Slot[]> {
  const u = new URL(`${getApiBaseUrl()}/coaches/${coachId}/slots`);
  if (params?.start) u.searchParams.set("start", params.start);
  if (params?.end) u.searchParams.set("end", params.end);
  const res = await apiFetch(u.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Slots request failed: ${res.status}`);
  return res.json() as Promise<Slot[]>;
}

export async function createBooking(
  coachId: string,
  body: BookingCreate,
  token?: string
): Promise<Booking> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/${coachId}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 409) throw new Error("SLOT_TAKEN");
  if (res.status === 422) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(`VALIDATION:${data.detail ?? "Invalid request"}`);
  }
  if (!res.ok) throw new Error(`Create booking failed: ${res.status}`);
  return res.json() as Promise<Booking>;
}

export async function fetchMyAvailability(token: string): Promise<AvailabilityWindow[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/me/availability`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Fetch availability failed: ${res.status}`);
  return res.json() as Promise<AvailabilityWindow[]>;
}

export async function setMyAvailability(
  windows: AvailabilityWindowIn[],
  token: string
): Promise<AvailabilityWindow[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/me/availability`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ windows }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? `Set availability failed: ${res.status}`);
  }
  return res.json() as Promise<AvailabilityWindow[]>;
}

export async function fetchMyCoachBookings(token: string): Promise<Booking[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/coaches/me/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Fetch coach bookings failed: ${res.status}`);
  return res.json() as Promise<Booking[]>;
}

export async function fetchMyAthleteBookings(token: string): Promise<Booking[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/users/me/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error(`Fetch athlete bookings failed: ${res.status}`);
  return res.json() as Promise<Booking[]>;
}

export async function cancelMyBooking(bookingId: string, token: string): Promise<void> {
  const res = await apiFetch(`${getApiBaseUrl()}/users/me/bookings/${bookingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) throw new Error("BOOKING_NOT_FOUND");
  if (!res.ok) throw new Error(`Cancel booking failed: ${res.status}`);
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await apiFetch(`${getApiBaseUrl()}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health request failed: ${res.status}`);
  return res.json() as Promise<{ status: string }>;
}

/** User-facing hint from server-side fetch errors (log-backed: TypeError + fetch failed = nothing listening). */
export function describeApiFetchError(error: unknown, apiBaseUrl: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  if (name === "TypeError" && msg === "fetch failed") {
    return `Could not connect to the API at ${apiBaseUrl}. Start the FastAPI app (for example: cd api, activate .venv, then uvicorn app.main:app --reload --port 8000). If the API is already running, set NEXT_PUBLIC_API_URL to http://127.0.0.1:8000 in web/.env — some environments resolve localhost to IPv6 while the server listens on IPv4 only.`;
  }
  if (/request failed: 5\d\d/.test(msg)) {
    return "The API responded with a server error. Ensure PostgreSQL is running, then run Alembic migrations (alembic upgrade head) and retry.";
  }
  if (/request failed: 4\d\d/.test(msg)) {
    return `The API rejected the request (${msg}). Check routes and configuration.`;
  }
  return `Could not load data from the API (${name}: ${msg}).`;
}
