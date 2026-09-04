export interface TZCity {
  slug: string;
  city: string;
  country: string;
  tz: string;     // IANA timezone name (DST-safe, always use this for calc)
  abbr: string;   // display abbreviation only
}

// 20 cities => 380 unique programmatic "/from-to-to" pages
export const TIMEZONES: TZCity[] = [
  { slug: "new-york",    city: "New York",    country: "USA",       tz: "America/New_York",    abbr: "EST/EDT" },
  { slug: "los-angeles", city: "Los Angeles", country: "USA",       tz: "America/Los_Angeles", abbr: "PST/PDT" },
  { slug: "chicago",     city: "Chicago",     country: "USA",       tz: "America/Chicago",     abbr: "CST/CDT" },
  { slug: "denver",      city: "Denver",      country: "USA",       tz: "America/Denver",      abbr: "MST/MDT" },
  { slug: "toronto",     city: "Toronto",     country: "Canada",    tz: "America/Toronto",     abbr: "EST/EDT" },
  { slug: "london",      city: "London",      country: "UK",        tz: "Europe/London",       abbr: "GMT/BST" },
  { slug: "paris",       city: "Paris",       country: "France",    tz: "Europe/Paris",        abbr: "CET/CEST" },
  { slug: "berlin",      city: "Berlin",      country: "Germany",   tz: "Europe/Berlin",       abbr: "CET/CEST" },
  { slug: "moscow",      city: "Moscow",      country: "Russia",    tz: "Europe/Moscow",       abbr: "MSK" },
  { slug: "dubai",       city: "Dubai",       country: "UAE",       tz: "Asia/Dubai",          abbr: "GST" },
  { slug: "mumbai",      city: "Mumbai",      country: "India",     tz: "Asia/Kolkata",        abbr: "IST" },
  { slug: "kolkata",     city: "Kolkata",     country: "India",     tz: "Asia/Kolkata",        abbr: "IST" },
  { slug: "dhaka",       city: "Dhaka",       country: "Bangladesh",tz: "Asia/Dhaka",          abbr: "BST" },
  { slug: "singapore",   city: "Singapore",   country: "Singapore", tz: "Asia/Singapore",      abbr: "SGT" },
  { slug: "hong-kong",   city: "Hong Kong",   country: "China",     tz: "Asia/Hong_Kong",      abbr: "HKT" },
  { slug: "tokyo",       city: "Tokyo",       country: "Japan",     tz: "Asia/Tokyo",          abbr: "JST" },
  { slug: "shanghai",    city: "Shanghai",    country: "China",     tz: "Asia/Shanghai",       abbr: "CST" },
  { slug: "sydney",      city: "Sydney",      country: "Australia", tz: "Australia/Sydney",    abbr: "AEST/AEDT" },
  { slug: "sao-paulo",   city: "Sao Paulo",   country: "Brazil",    tz: "America/Sao_Paulo",   abbr: "BRT" },
  { slug: "utc",         city: "UTC",         country: "—",         tz: "UTC",                 abbr: "UTC" },
];

export function findCity(slug: string): TZCity | undefined {
  return TIMEZONES.find((t) => t.slug === slug);
}
