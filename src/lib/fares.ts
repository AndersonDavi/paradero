import { city } from "@/cities";
import { serviceDayAt } from "@/cities/local";
import { tag } from "@/i18n";
import type { System } from "@/transit/types";

/** The confirmed fares for a kind of route, if the city has one: what a ride costs on ordinary days and on holidays. */
export function fareOf(system: System): { amount: number; holiday: number } | null {
  const fare = city.fares?.find((f) => f.confirmed && f.systems.includes(system));
  return fare ? { amount: fare.amount, holiday: fare.holiday } : null;
}

/** What a ride on this kind of route costs at a moment: Sundays and holidays have their own fare. Null when unknown. */
export function fareAt(system: System, at: Date = new Date()): number | null {
  const fare = fareOf(system);
  if (!fare) return null;
  return serviceDayAt(at) === "sunday" ? fare.holiday : fare.amount;
}

/** Pesos as riders read them: "$ 3.700". */
export function money(amount: number): string {
  return new Intl.NumberFormat(tag(), { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}
