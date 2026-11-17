import { city } from "@/cities";
import type { Journey } from "@/transit/types";

/**
 * The barrios with a lot of theft from persons where a journey gets on a bus, gets off or ends, each once, in the
 * order the rider passes them.
 */
export function theftAreas(journey: Journey): string[] {
  const listed = new Set(city.theft?.areas ?? []);
  const seen = [...journey.legs.flatMap((l) => (l.kind === "ride" ? [l.from.area, l.to.area] : [])), journey.endArea];
  return [...new Set(seen.filter((a): a is string => !!a && listed.has(a)))];
}
