/** A route's line as the map draws it, [lon, lat] pairs, measured so a bus can be placed and moved along it. */
export type LngLat = [number, number];

export interface MeasuredPath {
  points: LngLat[];
  /** Metres from the first point to each point. */
  along: number[];
  length: number;
}

const METRES_PER_DEGREE = 111_320;

export function metresBetween(a: LngLat, b: LngLat): number {
  const x = (b[0] - a[0]) * METRES_PER_DEGREE * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  const y = (b[1] - a[1]) * METRES_PER_DEGREE;
  return Math.hypot(x, y);
}

export function measure(points: LngLat[]): MeasuredPath {
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1]! + metresBetween(points[i - 1]!, points[i]!));
  return { points, along, length: along[along.length - 1] ?? 0 };
}

/** The point of the path nearest `at`: how far along it lies and how far `at` is from the line. */
export function project(path: MeasuredPath, at: LngLat): { along: number; offset: number } | null {
  if (path.points.length < 2) return null;
  const cos = Math.cos((at[1] * Math.PI) / 180);
  const x = (p: LngLat) => (p[0] - at[0]) * METRES_PER_DEGREE * cos;
  const y = (p: LngLat) => (p[1] - at[1]) * METRES_PER_DEGREE;
  let best: { along: number; offset: number } | null = null;
  for (let i = 0; i + 1 < path.points.length; i++) {
    const a = path.points[i]!;
    const b = path.points[i + 1]!;
    const [ax, ay, bx, by] = [x(a), y(a), x(b), y(b)];
    const length2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * (bx - ax) + ay * (by - ay)) / length2));
    const offset = Math.hypot(ax + t * (bx - ax), ay + t * (by - ay));
    if (!best || offset < best.offset) best = { along: path.along[i]! + t * (path.along[i + 1]! - path.along[i]!), offset };
  }
  return best;
}

/** The spot `along` metres down the path, and the heading there in degrees clockwise from north. */
export function pointAt(path: MeasuredPath, along: number): { at: LngLat; bearing: number } {
  const d = Math.min(path.length, Math.max(0, along));
  let i = 0;
  while (i + 2 < path.along.length && path.along[i + 1]! < d) i++;
  const a = path.points[i]!;
  const b = path.points[i + 1] ?? a;
  const span = path.along[i + 1]! - path.along[i]!;
  const t = span > 0 ? (d - path.along[i]!) / span : 0;
  return { at: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], bearing: bearingBetween(a, b) };
}

/** The stretch of the path between two distances along it. */
export function slice(path: MeasuredPath, from: number, to: number): LngLat[] {
  const start = Math.max(0, Math.min(from, to));
  const end = Math.min(path.length, Math.max(from, to));
  const inside = path.points.filter((_, i) => path.along[i]! > start && path.along[i]! < end);
  return [pointAt(path, start).at, ...inside, pointAt(path, end).at];
}

export function bearingBetween(a: LngLat, b: LngLat): number {
  const x = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  const y = b[1] - a[1];
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

/** Moves `at` by a velocity in metres a second (east, north) for `seconds`. */
export function moveBy(at: LngLat, east: number, north: number, seconds: number): LngLat {
  return [at[0] + (east * seconds) / (METRES_PER_DEGREE * Math.cos((at[1] * Math.PI) / 180)), at[1] + (north * seconds) / METRES_PER_DEGREE];
}

/** Velocity in metres a second, east and north, between two fixes. */
export function velocityBetween(a: LngLat, b: LngLat, seconds: number): { east: number; north: number } {
  if (seconds <= 0) return { east: 0, north: 0 };
  return { east: ((b[0] - a[0]) * METRES_PER_DEGREE * Math.cos((a[1] * Math.PI) / 180)) / seconds, north: ((b[1] - a[1]) * METRES_PER_DEGREE) / seconds };
}

/** Drops points that sit within `tolerance` metres of the line through their neighbours, so a route's line travels light. */
export function simplify(points: LngLat[], tolerance: number): LngLat[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const line = measure([points[first]!, points[last]!]);
    let worst = -1;
    let far = tolerance;
    for (let i = first + 1; i < last; i++) {
      const offset = line.length === 0 ? metresBetween(points[first]!, points[i]!) : (project(line, points[i]!)?.offset ?? 0);
      if (offset > far) [worst, far] = [i, offset];
    }
    if (worst > 0) {
      keep[worst] = 1;
      stack.push([first, worst], [worst, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
