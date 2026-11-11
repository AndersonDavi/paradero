import { router } from "expo-router";
import { useEffect } from "react";

import Tullave from "../../modules/tullave";

import { city } from "@/cities";
import { t, tag } from "@/i18n";
import { CardError, parseCard, type Card } from "@/transit/tullave";

export type ReadFailure = "unsupported" | "cancelled" | "timeout" | "lost" | "not_tullave" | "failed";

export class ReadError extends Error {
  constructor(readonly code: ReadFailure) {
    super(code);
  }
}

const FAILURES = new Set<ReadFailure>(["unsupported", "cancelled", "timeout", "lost", "not_tullave", "failed"]);

/** This build has the card reader. The phone itself may still lack NFC; `canReadCards` says that. */
export const hasCardReader = city.card && Tullave != null;

export function canReadCards(): boolean {
  if (!city.card) return false;
  try {
    return Tullave?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

/** Reads the card on the phone. Nothing is sent anywhere and nothing is kept after the screen closes. */
export async function readCard(): Promise<Card> {
  if (!Tullave || !canReadCards()) throw new ReadError("unsupported");
  const sheet = t().card.sheet;
  try {
    return parseCard(await Tullave.read(sheet));
  } catch (error) {
    if (error instanceof CardError) throw new ReadError(error.code);
    const code = (error as { code?: string }).code as ReadFailure | undefined;
    throw new ReadError(code && FAILURES.has(code) ? code : "failed");
  }
}

/** The Home Screen quick action: UIApplicationShortcutItems in app.json on iOS, a dynamic shortcut on Android. */
const SHORTCUT = "co.usecroma.paradero.card";

/** Opens the TuLlave reader when the app was opened from the "Leer mi TuLlave" quick action. */
export function useCardShortcut() {
  useEffect(() => {
    if (!Tullave) return;
    if (canReadCards()) Tullave.setShortcut?.(t().card.shortcut);
    if (Tullave.takeShortcut() === SHORTCUT) router.push("/card");
    const sub = Tullave.addListener("onShortcut", ({ type }) => {
      if (type === SHORTCUT) router.push("/card");
    });
    return () => sub.remove();
  }, []);
}

export function cancelRead() {
  Tullave?.cancel?.();
}

const money = new Map<string, Intl.NumberFormat>();

/**
 * "$ 12.300" in Spanish, "$12,300" in English: the "$" Bogotá uses, with each language's digits.
 * Written by hand because Hermes ignores `currencyDisplay: "narrowSymbol"` and prints "COP".
 */
export function pesos(value: number): string {
  let f = money.get(tag());
  if (!f) {
    f = new Intl.NumberFormat(tag(), { maximumFractionDigits: 0 });
    money.set(tag(), f);
  }
  const sign = value < 0 ? "-" : "";
  const space = tag().startsWith("es") ? " " : "";
  return `${sign}$${space}${f.format(Math.abs(value))}`;
}

const formats = new Map<string, Intl.DateTimeFormat>();

const OPTIONS = {
  month: { month: "long", year: "numeric" },
  row: { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
  spoken: { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** The card writes Bogotá wall-clock time, so it is shown as written, never shifted to another zone. */
export function cardTime(at: string, kind: keyof typeof OPTIONS): string {
  const key = `${tag()}:${kind}`;
  let f = formats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(tag(), { ...OPTIONS[kind], timeZone: "UTC" });
    formats.set(key, f);
  }
  const text = f.format(new Date(`${at}Z`));
  return kind === "month" ? text.charAt(0).toLocaleUpperCase(tag()) + text.slice(1) : text;
}
