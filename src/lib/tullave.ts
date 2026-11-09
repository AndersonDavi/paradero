import Tullave from "../../modules/tullave";

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
export const hasCardReader = Tullave != null;

export function canReadCards(): boolean {
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

export function cancelRead() {
  Tullave?.cancel?.();
}

const money = new Map<string, Intl.NumberFormat>();

/** "$ 12.300" in Colombia, written the way each language writes pesos. */
export function pesos(value: number): string {
  let f = money.get(tag());
  if (!f) {
    f = new Intl.NumberFormat(tag(), { style: "currency", currency: "COP", maximumFractionDigits: 0, minimumFractionDigits: 0 });
    money.set(tag(), f);
  }
  return f.format(value);
}

const when = new Map<string, Intl.DateTimeFormat>();

/** The card writes Bogotá wall-clock time, so it is shown as written, never shifted to another zone. */
export function cardTime(at: string): string {
  let f = when.get(tag());
  if (!f) {
    f = new Intl.DateTimeFormat(tag(), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    when.set(tag(), f);
  }
  return f.format(new Date(`${at}Z`));
}
