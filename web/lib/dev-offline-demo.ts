import type { CoachProfile, Sport, StudentGoal } from "./api";

/** Mirrors `api/alembic/versions/001_initial_schema.py` seed so local UI matches a migrated DB. */
const DEMO_CREATED = "2026-01-01T12:00:00.000Z";

export const DEV_OFFLINE_SPORTS: Sport[] = [
  {
    id: 1,
    slug: "swimming",
    name: "Swimming",
    tagline: "Efficiency, pacing, and open-water confidence for the moments that count.",
  },
  {
    id: 2,
    slug: "triathlon",
    name: "Triathlon",
    tagline: "Swim-bike-run rhythm for your first sprint or your next full distance.",
  },
  {
    id: 3,
    slug: "mountain_biking",
    name: "Mountain biking",
    tagline: "Technical roots, drops, and cornering with trail-smart progression.",
  },
  {
    id: 4,
    slug: "running",
    name: "Running",
    tagline: "From base miles to race peaks — durable mechanics and smart volume.",
  },
];

const sport = (slug: string): Sport => {
  const s = DEV_OFFLINE_SPORTS.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown sport slug: ${slug}`);
  return s;
};

export const DEV_OFFLINE_COACHES: CoachProfile[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01",
    headline: "Open-water swimmer · Iron-distance pacing",
    bio: "I help age-groupers and elites smooth out stroke mechanics, sighting, and race-day fueling so the swim feels like a strength, not a survival lap.",
    adventure_story:
      "My first crossing taught me that calm technique beats panic every time — I bring that mindset to every athlete I coach.",
    location_city: "San Diego",
    location_region: "CA",
    years_experience: 12,
    website_url: null,
    coaching_format: "both",
    timezone: "America/Los_Angeles",
    created_at: DEMO_CREATED,
    display_name: "Morgan Rivera",
    email: "morgan.rivera@example.com",
    sports: [sport("swimming"), sport("triathlon")],
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02",
    headline: "Triathlon coach · Swim-bike-run integration",
    bio: "From sprint weekends to full-distance dreams, we build durability without burnout. Brick sessions, transitions, and mental race plans included.",
    adventure_story:
      "Racing Kona changed how I think about cumulative training — I love helping others stack smart weeks toward a start line that excites them.",
    location_city: "Boulder",
    location_region: "CO",
    years_experience: 9,
    website_url: null,
    coaching_format: "in_person",
    timezone: null,
    created_at: DEMO_CREATED,
    display_name: "Kai Nakamura",
    email: "kai.nakamura@example.com",
    sports: [sport("triathlon"), sport("running")],
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccc03",
    headline: "Technical MTB skills · Trail confidence",
    bio: "Cornering, drops, steep chutes, and line choice for riders who want flow on demanding terrain. Progressions that keep rubber side down.",
    adventure_story:
      "I still get butterflies on new lines — coaching is about turning nerves into repeatable skills you trust when it gets spicy.",
    location_city: "Squamish",
    location_region: "BC",
    years_experience: 7,
    website_url: null,
    coaching_format: "remote",
    timezone: "America/Vancouver",
    created_at: DEMO_CREATED,
    display_name: "Jordan Ellis",
    email: "jordan.ellis@example.com",
    sports: [sport("mountain_biking")],
  },
];

export const DEV_OFFLINE_GOALS: StudentGoal[] = [
  {
    id: "dddddddd-dddd-dddd-dddd-dddddddddd05",
    title: "Olympic-distance triathlon — first finish strong",
    goal_description:
      "I can swim 1500m in the pool but need open-water confidence and a pacing plan for the full Olympic distance this fall.",
    skill_level: "intermediate",
    target_date: null,
    created_at: DEMO_CREATED,
    display_name: "Alex Patel",
    email: "alex.patel@example.com",
    sport: sport("triathlon"),
  },
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee06",
    title: "Technical trail riding — drops and steep chutes",
    goal_description:
      "Comfortable on blue runs but freezing up on technical features. Want to build a toolkit for reading and committing to tricky lines.",
    skill_level: "intermediate",
    target_date: null,
    created_at: DEMO_CREATED,
    display_name: "Sam Torres",
    email: "sam.torres@example.com",
    sport: sport("mountain_biking"),
  },
  {
    id: "ffffffff-ffff-ffff-ffff-ffffffffffff07",
    title: "Pool-to-open-water swim — race morning confidence",
    goal_description:
      "Stroke efficiency is decent in the pool but I panic in open water. Need sighting drills and a mental framework for race day.",
    skill_level: "beginner",
    target_date: null,
    created_at: DEMO_CREATED,
    display_name: "Jamie Lee",
    email: "jamie.lee@example.com",
    sport: sport("swimming"),
  },
];

export function filterDevOfflineGoals(sport_slug?: string): StudentGoal[] {
  if (!sport_slug) return [...DEV_OFFLINE_GOALS];
  return DEV_OFFLINE_GOALS.filter((g) => g.sport?.slug === sport_slug);
}

export function isDevOfflineConnectionError(error: unknown): boolean {
  if (process.env.NEXT_PUBLIC_DISABLE_OFFLINE_DEMO === "1") return false;
  return (
    process.env.NODE_ENV === "development" &&
    error instanceof TypeError &&
    error.message === "fetch failed"
  );
}

export function filterDevOfflineCoaches(params?: { sport_slug?: string; q?: string }): CoachProfile[] {
  let list = [...DEV_OFFLINE_COACHES];
  const slug = params?.sport_slug?.trim();
  if (slug) {
    list = list.filter((c) => c.sports.some((s) => s.slug === slug));
  }
  const q = params?.q?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (c) =>
        c.headline.toLowerCase().includes(q) ||
        c.bio.toLowerCase().includes(q) ||
        c.display_name.toLowerCase().includes(q) ||
        c.sports.some((s) => s.name.toLowerCase().includes(q)),
    );
  }
  return list;
}

export function findDevOfflineCoach(id: string): CoachProfile | undefined {
  return DEV_OFFLINE_COACHES.find((c) => c.id === id);
}
