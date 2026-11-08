import { z } from "zod";

const BASE_URL = process.env.CROMA_API_URL ?? "https://api.croma.run";
const STALE_AFTER_MS = 5 * 60_000;

/** A rider is waiting on the other end, so a slow upstream fails fast instead of hanging the screen. */
const TIMEOUT_MS = 8_000;

export class CromaError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

const failure = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

export async function croma<S extends z.ZodType>(endpoint: string, body: Record<string, unknown>, schema: S): Promise<z.infer<S>> {
  const key = process.env.CROMA_API_KEY;
  if (!key) throw new CromaError("missing_api_key", "Set CROMA_API_KEY in .env.local.", 500);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/co/transmilenio/${endpoint}/v1`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const slow = error instanceof DOMException && error.name === "TimeoutError";
    throw new CromaError(slow ? "timeout" : "network", slow ? "Croma took too long to answer." : "Could not reach Croma.", slow ? 504 : 502);
  }

  const json: unknown = await res.json().catch(() => null);
  const failed = failure.safeParse(json);
  if (!res.ok || failed.success) {
    throw new CromaError(failed.success ? failed.data.error.code : `http_${res.status}`, failed.success ? failed.data.error.message : res.statusText);
  }

  const parsed = schema.safeParse((json as { data?: unknown } | null)?.data);
  if (!parsed.success) throw new CromaError("unexpected_response", `Unexpected shape from ${endpoint}.`);
  return parsed.data;
}

export function isLive(asOf: string, live: boolean | undefined): boolean {
  if (live === false) return false;
  return Date.now() - Date.parse(asOf) <= STALE_AFTER_MS;
}

/** One answer per key for `ttlMs`, shared by every rider on this instance, joining a request already in flight. */
export function cached<T>(ttlMs: number) {
  const entries = new Map<string, { at: number; value: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = load();
    entries.set(key, { at: Date.now(), value });
    value.catch(() => entries.delete(key));
    if (entries.size > 2_000) entries.delete(entries.keys().next().value as string);
    return value;
  };
}
