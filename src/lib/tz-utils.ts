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

/** Live timezone abbreviation (EST/IST/JST/etc.), DST-correct — computed on demand, never hardcoded. */
export function getAbbr(tz: string, date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  return part ?? tz;
}

/** "GMT+5:30" style offset string, DST-correct. */
export function getOffsetLabel(tz: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
}

/** hour:minute in either 12h or 24h display, same underlying Intl machinery. */
export function formatTimeWithMode(tz: string, hour12: boolean, date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12,
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

/**
 * For each of the 24 hours in `fromTz`, returns the corresponding local hour in
 * `toTz` plus whether BOTH sides fall inside typical working hours (9am–6pm).
 * Powers a "best time to meet" overlap strip on the converter page.
 */
export function getWorkingHourOverlap(fromTz: string, toTz: string, date = new Date()) {
  const diff = diffHours(fromTz, toTz, date);
  const rows: { fromHour: number; toHour: number; goodOverlap: boolean }[] = [];
  for (let h = 0; h < 24; h++) {
    const toHour = (((h + diff) % 24) + 24) % 24;
    const fromOk = h >= 9 && h < 18;
    const toOk = toHour >= 9 && toHour < 18;
    rows.push({ fromHour: h, toHour: Math.round(toHour), goodOverlap: fromOk && toOk });
  }
  return rows;
}

/** Longest contiguous stretch of good-overlap hours, e.g. "9 AM – 12 PM" in fromTz's local time. */
export function bestMeetingWindow(fromTz: string, toTz: string, date = new Date()) {
  const rows = getWorkingHourOverlap(fromTz, toTz, date);
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].goodOverlap) {
      if (curLen === 0) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curLen = 0;
    }
  }
  if (bestLen === 0) return null;
  const fmt = (h: number) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${suffix}`;
  };
  return { startHour: bestStart, endHour: (bestStart + bestLen) % 24, label: `${fmt(bestStart)} – ${fmt((bestStart + bestLen) % 24)}` };
}
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fmtHour = (h: number) => {
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
};

/**
 * A full week's overlap, not just "today" — and it correctly accounts for the
 * date-line rollover: "Monday 9am" in one city can land on "Sunday 9pm" in
 * another, which most converters silently ignore. A slot only counts as
 * "good" if it's a weekday on BOTH sides once that rollover is applied.
 */
export function getWeeklyMeetingMap(fromTz: string, toTz: string, date = new Date()) {
  const fromOffset = offsetMinutes(fromTz, date);
  const toOffset = offsetMinutes(toTz, date);
  const diffMin = toOffset - fromOffset;

  return DAY_LABELS.map((label, dayIdx) => {
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const totalToMin = dayIdx * 1440 + h * 60 + diffMin;
      const toDayIdx = (((Math.floor(totalToMin / 1440)) % 7) + 7) % 7;
      const toHour = (((Math.floor(totalToMin / 60)) % 24) + 24) % 24;
      const fromIsWeekday = dayIdx < 5;
      const toIsWeekday = toDayIdx < 5;
      const good = h >= 9 && h < 18 && toHour >= 9 && toHour < 18 && fromIsWeekday && toIsWeekday;
      hours.push({ h, toHour, toDay: DAY_LABELS[toDayIdx], good });
    }
    let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
    hours.forEach((row, i) => {
      if (row.good) {
        if (curLen === 0) curStart = i;
        curLen++;
        if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
      } else curLen = 0;
    });
    const windowLabel = bestLen > 0
      ? `${fmtHour(bestStart)} – ${fmtHour((bestStart + bestLen) % 24)}`
      : null;
    return { day: label, hours, windowLabel };
  });
}

/**
 * When two zones barely overlap during normal hours, nobody gets a fair deal —
 * one team always eats the early/late call. This suggests TWO alternate slots
 * (one convenient for each side) so teams can rotate week-to-week and share
 * the inconvenience, instead of the same person always losing sleep.
 * Not something typical converters offer — most only show a single "best" time.
 */
export function getFairRotationSuggestion(fromTz: string, toTz: string, date = new Date()) {
  const existingWindow = bestMeetingWindow(fromTz, toTz, date);
  if (existingWindow) return null; // natural overlap already exists — no rotation needed

  const diff = diffHours(fromTz, toTz, date);
  const toHourAt = (h: number) => Math.round((((h + diff) % 24) + 24) % 24);

  // Slot A: pick a mid-morning hour that's comfortable for `from`; see what it costs `to`.
  const slotA = { fromHour: 10, toHour: toHourAt(10) };
  // Slot B: mirror it — pick a mid-morning hour comfortable for `to`, translated back to `from`.
  const fromHourAtToMorning = Math.round((((10 - diff) % 24) + 24) % 24);
  const slotB = { fromHour: fromHourAtToMorning, toHour: 10 };

  return {
    slotA: { fromLabel: fmtHour(slotA.fromHour), toLabel: fmtHour(slotA.toHour) },
    slotB: { fromLabel: fmtHour(slotB.fromHour), toLabel: fmtHour(slotB.toHour) },
  };
}

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
