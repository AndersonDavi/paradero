import { measure, project, slice, type LngLat } from "./path";

/** A stop this close to a route's line is on it. */
const STOP_ON_LINE_M = 150;
/** A bus this close to a route's line runs along it. */
const BUS_ON_LINE_M = 80;

/** With no bus to follow, how much of the line before the stop is drawn as the way in. */
const APPROACH_M = 2_500;

export interface Way {
  /** The whole line the route runs, for moving buses along it. */
  line: LngLat[];
  /** The stretch still to be driven: from the bus followed to the stop. */
  approach: LngLat[];
}

/**
 * The way a bus comes to a stop: of the ways the route runs, one that passes the
 * stop, preferring the one the bus is on, before the stop.
 */
export function wayTowards(patterns: { path: LngLat[] }[], stop: { lat: number; lon: number }, bus?: { lat: number; lon: number } | null): Way | undefined {
  const passing = patterns
    .filter((p) => p.path.length > 1)
    .map((p) => {
      const path = measure(p.path);
      return { line: p.path, path, stop: project(path, [stop.lon, stop.lat]) };
    })
    .filter((c) => c.stop && c.stop.offset <= STOP_ON_LINE_M);
  if (bus) {
    for (const c of passing) {
      const at = project(c.path, [bus.lon, bus.lat]);
      if (at && at.offset <= BUS_ON_LINE_M && at.along <= c.stop!.along) return { line: c.line, approach: slice(c.path, at.along, c.stop!.along) };
    }
  }
  const first = passing[0];
  return first && { line: first.line, approach: slice(first.path, first.stop!.along - APPROACH_M, first.stop!.along) };
}
