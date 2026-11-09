/**
 * Reads what a TuLlave card said over NFC. The card answers in bytes; this turns them into a balance,
 * the card number and its last movements. Pure, so the same rules run on iOS and Android.
 *
 * Layout, from the card itself:
 * - balance: a 4-byte big-endian value (a second 3-byte value after it adds on when present)
 * - purse (file SFI 6): when its first byte is 01, the 4 bytes at offset 4 are subtracted
 * - card number: bytes 8-15 of the 4200 file selection, written as hex digits
 * - records (SFI 4, 1 to 10): type at 0, balance after at 3-5, amount at 11-13, date in BCD at 26-32
 */

export type CardResponses = {
  balance: string;
  purse: string;
  card: string;
  records: (string | null)[];
};

export type MovementKind = "trip" | "topup" | "topupCancelled" | "other";

export type Movement = {
  kind: MovementKind;
  /** Local Bogotá time as the card wrote it, "2026-11-08T07:42:10", or null when unreadable. */
  at: string | null;
  amount: number;
  balanceAfter: number;
};

export type Card = {
  number: string;
  balance: number;
  movements: Movement[];
};

const KINDS: Record<number, MovementKind> = { 1: "trip", 2: "topup", 4: "topupCancelled" };

function bytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9a-f]/gi, "");
  const out: number[] = [];
  for (let i = 0; i + 1 < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
  return out;
}

/** Bytes from..to, zero-padded past the end, so a short answer reads as zeros instead of failing. */
function range(b: number[], from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, i) => b[from + i] ?? 0);
}

function bigEndian(b: number[]): number {
  return b.reduce((n, x) => n * 256 + x, 0);
}

function hexOf(b: number[]): string {
  return b.map((x) => x.toString(16).padStart(2, "0")).join("");
}

function ok(b: number[]): boolean {
  return b.length >= 2 && b[b.length - 2] === 0x90 && b[b.length - 1] === 0x00;
}

/** A BCD byte read as the two digits printed on it: 0x26 is 26. */
function bcd(x: number): number | null {
  const hi = x >> 4;
  const lo = x & 0x0f;
  return hi > 9 || lo > 9 ? null : hi * 10 + lo;
}

function date(b: number[]): string | null {
  const [day, month, century, year, hour, minute, second] = [b[29], b[28], b[26], b[27], b[30], b[31], b[32]].map((x) => (x == null ? null : bcd(x)));
  if ([day, month, century, year, hour, minute, second].some((x) => x == null)) return null;
  if (month! < 1 || month! > 12 || day! < 1 || day! > 31 || hour! > 23 || minute! > 59 || second! > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(century!)}${pad(year!)}-${pad(month!)}-${pad(day!)}T${pad(hour!)}:${pad(minute!)}:${pad(second!)}`;
}

function movement(hex: string | null): Movement | null {
  if (!hex) return null;
  const b = bytes(hex);
  if (!ok(b) || b.length < 35) return null;
  const at = date(b);
  const amount = bigEndian(range(b, 11, 14));
  const balanceAfter = bigEndian(range(b, 3, 6));
  if (at == null && amount === 0 && balanceAfter === 0) return null;
  return { kind: KINDS[b[0]] ?? "other", at, amount, balanceAfter };
}

export class CardError extends Error {
  readonly code: "not_tullave";

  constructor(code: "not_tullave") {
    super(code);
    this.code = code;
  }
}

export function parseCard(r: CardResponses): Card {
  const balance = bytes(r.balance);
  if (!ok(balance)) throw new CardError("not_tullave");

  let value = bigEndian(range(balance, 0, 4)) + bigEndian(range(balance, 5, 8));
  const purse = bytes(r.purse);
  if (ok(purse) && purse[0] === 0x01) value -= bigEndian(range(purse, 4, 8));

  const card = bytes(r.card);
  const number = ok(card) ? hexOf(range(card, 8, 16)) : "";

  const movements = r.records.map(movement).filter((m): m is Movement => m != null);
  return { number, balance: value, movements };
}

/** "1010 0000 1234 5678": the card number in groups of four, as printed on the card. */
export function groupNumber(number: string): string {
  return number.replace(/(.{4})(?=.)/g, "$1 ").toUpperCase();
}
