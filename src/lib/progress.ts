import type { TripLeg } from "@/components/transit-map.types";

type Coord = [number, number];

/** Metres per degree of latitude; a degree of longitude is this times the cosine of the latitude. */
const M_PER_DEG = 111_320;

export interface Progress {
  /** The stretch already behind the rider, from the start to where they are now. */
  done: Coord[];
  /** The legs still ahead, the one the rider is on cut at where they are. */
  ahead: TripLeg[];
  /** Which segment of the whole trip the rider is on, counted over every leg: the next search starts here. */
  segment: number;
  /** How far the rider is from the line, in metres. */
  off: number;
}

/**
 * Where a rider is along a trip: the nearest point of its line, searched from `after` on so a line that runs back
 * along the same street never sends the rider backwards. Null when the nearest point is more than `near` metres away:
 * the rider is not on the way.
 */
export function progressAlong(legs: TripLeg[], at: { lat: number; lon: number }, after = 0, near = 60): Progress | null {
  const kx = M_PER_DEG * Math.cos((at.lat * Math.PI) / 180);
  const x = (c: Coord) => (c[0] - at.lon) * kx;
  const y = (c: Coord) => (c[1] - at.lat) * M_PER_DEG;

  let best: { leg: number; i: number; t: number; d: number; segment: number } | null = null;
  let segment = 0;
  legs.forEach((leg, l) => {
    for (let i = 0; i + 1 < leg.path.length; i++, segment++) {
      if (segment < after) continue;
      const [ax, ay, bx, by] = [x(leg.path[i]), y(leg.path[i]), x(leg.path[i + 1]), y(leg.path[i + 1])];
      const dx = bx - ax;
      const dy = by - ay;
      const length = dx * dx + dy * dy;
      const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (!best || d < best.d) best = { leg: l, i, t, d, segment };
    }
  });
  if (!best) return null;
  const { leg, i, t, d } = best as { leg: number; i: number; t: number; d: number; segment: number };
  if (d > near) return null;

  const a = legs[leg].path[i];
  const b = legs[leg].path[i + 1];
  const here: Coord = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const done = [...legs.slice(0, leg).flatMap((g) => g.path), ...legs[leg].path.slice(0, i + 1), here];
  const ahead = [{ kind: legs[leg].kind, path: [here, ...legs[leg].path.slice(i + 1)] }, ...legs.slice(leg + 1)];
  return { done, ahead, segment: (best as { segment: number }).segment, off: d };
}
