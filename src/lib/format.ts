import type { Arrival, Feed } from "@/transit/types";

export function minutesText(minutes: number | null): string {
  if (minutes == null) return "–";
  if (minutes <= 0) return "Ya";
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60}`;
  return `${minutes}`;
}

export function minutesUnit(minutes: number | null): string {
  if (minutes == null || minutes <= 0 || minutes >= 60) return "";
  return "min";
}

export function punctuality(a: Arrival): { text: string; tone: "live" | "late" | "early" | "schedule" } {
  if (a.basis === "scheduled") return { text: "Según horario", tone: "schedule" };
  const d = a.delaySeconds;
  if (d == null || Math.abs(d) < 60) return { text: "A tiempo", tone: "live" };
  const m = Math.round(Math.abs(d) / 60);
  return d > 0 ? { text: `${m} min tarde`, tone: "late" } : { text: `${m} min antes`, tone: "early" };
}

export function spokenArrival(a: Arrival): string {
  const when = a.minutes == null ? "sin hora estimada" : a.minutes <= 0 ? "está llegando" : `llega en ${a.minutes} ${a.minutes === 1 ? "minuto" : "minutos"}`;
  const code = a.aliases.join(" o ").replace(/([A-Z]+)(\d+)/g, "$1 $2");
  return `Ruta ${code}, hacia ${a.name}, ${when}. ${punctuality(a).text}.`;
}

const TIME = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
const DAY = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });

export function clock(iso: string): string {
  return TIME.format(new Date(iso));
}

export function since(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `desde el ${DAY.format(new Date(iso))}, ${clock(iso)}`;
}

export function feedText(feed: Feed): string {
  return feed.live ? `En vivo · ${since(feed.asOf)}` : `Sin datos en vivo ${since(feed.asOf)}`;
}

export function distanceText(m: number | null): string {
  if (m == null) return "";
  const walk = Math.max(1, Math.round(m / 75));
  return m < 1000 ? `${m} m · ${walk} min a pie` : `${(m / 1000).toFixed(1)} km`;
}

const HOUR = new Intl.DateTimeFormat("es-CO", { hour: "numeric", hourCycle: "h23", timeZone: "America/Bogota" });

export function greeting(now = new Date()): string {
  const h = Number(HOUR.format(now));
  if (h < 5) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
