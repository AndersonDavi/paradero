import { t, tag } from "@/i18n";
import { sayable } from "@/transit/codes";
import type { Arrival, Feed } from "@/transit/types";

const ZONE = "America/Bogota";
const formats = new Map<string, Intl.DateTimeFormat>();

function format(kind: "time" | "day" | "hour"): Intl.DateTimeFormat {
  const key = `${tag()}:${kind}`;
  let f = formats.get(key);
  if (!f) {
    const options: Intl.DateTimeFormatOptions =
      kind === "time" ? { hour: "numeric", minute: "2-digit" } : kind === "day" ? { day: "numeric", month: "long" } : { hour: "numeric", hourCycle: "h23" };
    f = new Intl.DateTimeFormat(tag(), { ...options, timeZone: ZONE });
    formats.set(key, f);
  }
  return f;
}

export function punctuality(a: Arrival): { text: string; tone: "live" | "late" | "early" | "schedule" } {
  const pace = t().pace;
  if (a.basis === "scheduled") return { text: pace.scheduled, tone: "schedule" };
  // Timed from where the bus is, not a prediction from the network: we know it is coming, not whether it is late.
  if (a.basis === "estimated" && a.delaySeconds == null) return { text: pace.estimated, tone: "live" };
  const d = a.delaySeconds;
  if (d == null || Math.abs(d) < 60) return { text: pace.onTime, tone: "live" };
  const m = Math.round(Math.abs(d) / 60);
  return d > 0 ? { text: pace.late(m), tone: "late" } : { text: pace.early(m), tone: "early" };
}

/** When a bus comes, in words a screen reader can say. */
export function spokenWhen(minutes: number | null): string {
  const speech = t().speech;
  if (minutes == null) return t().time.unknown;
  return minutes <= 0 ? speech.arriving : speech.arrivesIn(minutes);
}

/** "K 635 o H 635": a paired code as people would say it. */
export function spokenCode(code: string): string {
  return code.split(" · ").map(sayable).join(t().speech.or);
}

export function spokenRoute(aliases: string[]): string {
  return t().speech.route(aliases.map(sayable).join(t().speech.or));
}

export function spokenArrival(a: Arrival): string {
  return t().speech.arrival(spokenRoute(a.aliases), a.name, spokenWhen(a.minutes), punctuality(a).text);
}

export function clock(iso: string): string {
  return format("time").format(new Date(iso));
}

export function since(iso: string, now = Date.now()): string {
  const time = t().time;
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return time.secondsAgo(s);
  const m = Math.round(s / 60);
  if (m < 60) return time.minutesAgo(m);
  const h = Math.round(m / 60);
  if (h < 24) return time.hoursAgo(h);
  return time.sinceDay(format("day").format(new Date(iso)), clock(iso));
}

export function feedText(feed: Feed): string {
  return feed.live ? `${t().feed.live} · ${since(feed.asOf)}` : t().feed.noLiveSince(since(feed.asOf));
}

export function distanceText(m: number | null): string {
  if (m == null) return "";
  const walk = Math.max(1, Math.round(m / 75));
  return m < 1000 ? t().time.walk(m, walk) : t().time.km((m / 1000).toLocaleString(tag(), { maximumFractionDigits: 1 }));
}

export function greeting(now = new Date()): string {
  const g = t().time.greeting;
  const h = Number(format("hour").format(now));
  if (h < 5) return g.night;
  if (h < 12) return g.morning;
  if (h < 19) return g.afternoon;
  return g.night;
}
