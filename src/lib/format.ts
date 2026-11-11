import { t, tag } from "@/i18n";
import { sayable } from "@/transit/codes";
import type { Arrival, Feed } from "@/transit/types";

import { clockFormat } from "./appearance";

const ZONE = "America/Bogota";
const formats = new Map<string, Intl.DateTimeFormat>();

function format(kind: "time" | "day" | "year" | "hour", zone = ZONE): Intl.DateTimeFormat {
  const cycle = clockFormat();
  const key = `${tag()}:${kind}:${cycle}:${zone}`;
  let f = formats.get(key);
  if (!f) {
    const options: Intl.DateTimeFormatOptions =
      kind === "time"
        ? cycle === "24"
          ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
          : { hour: "numeric", minute: "2-digit", hourCycle: "h12" }
        : kind === "day"
          ? { day: "numeric", month: "long" }
          : kind === "year"
            ? { day: "numeric", month: "long", year: "numeric" }
            : { hour: "numeric", hourCycle: "h23" };
    f = new Intl.DateTimeFormat(tag(), { ...options, timeZone: zone });
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

/** A timetable's wall-clock "17:10", written the way the rider reads times: "5:10 p. m." or "17:10". */
export function wallClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return format("time", "UTC").format(new Date(Date.UTC(2000, 0, 1, h % 24, m)));
}

export function since(iso: string, now = Date.now()): string {
  const time = t().time;
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return time.secondsAgo(s);
  const m = Math.round(s / 60);
  if (m < 60) return time.minutesAgo(m);
  const h = Math.round(m / 60);
  if (h < 24) return time.hoursAgo(h);
  // A timetable can be years old; past this year the date says which year, or it would read as recent.
  const then = new Date(iso);
  const sameYear = format("year").formatToParts(then).find((p) => p.type === "year")?.value === format("year").formatToParts(new Date(now)).find((p) => p.type === "year")?.value;
  return time.sinceDay(format(sameYear ? "day" : "year").format(then), clock(iso));
}

export function feedText(feed: Feed): string {
  return feed.live ? `${t().feed.live} · ${since(feed.asOf)}` : t().feed.noLiveSince(since(feed.asOf));
}

/** How long a trip takes: "44 min", "1 h 4 min". */
export function durationText(minutes: number): string {
  return t().trip.duration(Math.floor(minutes / 60), minutes % 60);
}

export function spokenDuration(minutes: number): string {
  return t().trip.speech.duration(Math.floor(minutes / 60), minutes % 60);
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
