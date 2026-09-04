// Shared time-zone math — works in Astro frontmatter (build/SSR) AND browser (client scripts).
// Only Intl API used — zero deps, zero bundle weight.

export function nowInTz(tz: string, date = new Date()): Date {
  // Trick: format date's wall-clock parts in target tz, then rebuild a Date from those parts.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
  );
}

export function formatTime(tz: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatFullDate(tz: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Current UTC offset in minutes for a tz (handles DST automatically). */
export function offsetMinutes(tz: string, date = new Date()): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, timeZoneName: "shortOffset",
  });
  const part = dtf.formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = part.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + (hours < 0 ? -mins : mins);
}

/** Hour difference between two tz's right now, e.g. "+10.5" or "-5". */
export function diffHours(fromTz: string, toTz: string, date = new Date()): number {
  const diff = (offsetMinutes(toTz, date) - offsetMinutes(fromTz, date)) / 60;
  return Math.round(diff * 100) / 100;
}

/** Day/Night state 0..1 (0 = midnight, 0.5 = noon) for the slider + sun/moon icon. */
export function dayProgress(tz: string, date = new Date()): number {
  const local = nowInTz(tz, date);
  return (local.getHours() * 60 + local.getMinutes()) / 1440;
}

export function isDaytime(tz: string, date = new Date()): boolean {
  const p = dayProgress(tz, date);
  return p > 0.25 && p < 0.79; // ~6am - 7pm rough daylight window
}

/** Build a shareable slug like "4pm-est" from a given local hour + source tz abbr-free key. */
export function buildShareSlug(hour24: number, tzKey: string): string {
  const h = ((hour24 + 11) % 12) + 1;
  const suffix = hour24 >= 12 ? "pm" : "am";
  return `${h}${suffix}-${tzKey}`.toLowerCase();
}

/** Parse "/t/4pm-utc" style slug back into { hour24, tzKey }. */
export function parseShareSlug(slug: string): { hour24: number; tzKey: string } | null {
  const m = slug.match(/^(\d{1,2})(am|pm)-([a-z-]+)$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10) % 12;
  if (m[2].toLowerCase() === "pm") hour += 12;
  return { hour24: hour, tzKey: m[3].toLowerCase() };
}

/**
 * Prefixes an internal path with the site's `base` (import.meta.env.BASE_URL).
 * Works in .astro frontmatter AND in <script> blocks (Vite processes both).
 * MUST be used for every internal href/URL — GitHub Pages serves under
 * /repo-name/, Cloudflare/custom-domain serves at root ("/"), so BASE_URL
 * is "/" there and this is a no-op. Never hardcode a leading "/..." href.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}` || "/";
}
