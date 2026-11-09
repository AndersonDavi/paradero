import { t } from "@/i18n";
import type { Alert } from "@/transit/types";

/** An alert in the rider's language. Stop names and TransMilenio's own notes stay as published. */
export function alertText(alert: Alert): { title: string; detail: string } {
  const words = t().alerts;
  const title = words.effects[alert.effect] ?? words.other;
  if (!alert.places) return { title, detail: alert.detail };
  const [a, b] = alert.places;
  const detail = b ? words.between(a, b) : a ? words.near(a) : alert.note ? (/[.!?]$/.test(alert.note) ? alert.note : `${alert.note}.`) : words.generic;
  return { title, detail };
}
