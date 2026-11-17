import type { Journey, Leg, RouteRef } from "@/transit/types";

import type { Point } from "./types";

/**
 * City buses that stop wherever a rider hails them: no stops and no timetable, only the line the bus drives. A ride
 * on one is worked out from the line alone: where it passes close to the rider, where it passes close to the place,
 * and how far it drives between the two, in the direction it goes.
 */
export interface UrbanLine {
  route: RouteRef;
  /** lon/lat */
  line: [number, number][];
  /** The same points in metres on a flat map around the city, and how far along the line each is. */
  xy: [number, number][];
  cum: number[];
  /** The line comes back to where it starts: a round trip, so a ride can go past its end and on from its start. */
  ring: boolean;
}

/** A city bus is boarded within this straight distance of the rider, and left within this of the place. */
const REACH_M = 500;
/** Shorter than this, the bus is not worth waiting for. */
const MIN_RIDE_M = 600;
/** A city bus's pace through traffic, in metres a minute (about 15 km/h). */
const RIDE_M_PER_MIN = 250;
/** Walking pace, as the rest of the planner counts it, and how much longer a walk is than the straight line. */
const WALK_M_PER_MIN = 75;
const DETOUR = 1.25;
/** A ride may wind, but one that drives this many times the straight distance (plus a stretch) goes the long way round. */
const WINDING = 3;
const WINDING_EXTRA_M = 1500;
/** How many city buses to offer. */
const OPTIONS = 3;

const LAT0 = 10.97 * (Math.PI / 180);
const flat = ([lon, lat]: [number, number]): [number, number] => [lon * Math.cos(LAT0) * 111_320, lat * 110_540];

export function urbanLine(route: RouteRef, line: [number, number][]): UrbanLine {
  const xy = line.map(flat);
  const cum = [0];
  for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  const ring = xy.length > 2 && Math.hypot(xy[0][0] - xy[xy.length - 1][0], xy[0][1] - xy[xy.length - 1][1]) < 300;
  return { route, line, xy, cum, ring };
}

interface Pass {
  along: number;
  metres: number;
  at: [number, number];
}

/**
 * Each time the line passes within reach of a point: a street the bus drives both ways is passed twice, once each
 * way, and either can be the one to take.
 */
function passes(u: UrbanLine, p: Point): Pass[] {
  const q = flat([p.lon, p.lat]);
  const out: Pass[] = [];
  let current: Pass | null = null;
  for (let i = 0; i < u.xy.length - 1; i++) {
    const [a, b] = [u.xy[i], u.xy[i + 1]];
    const len = u.cum[i + 1] - u.cum[i];
    const t = len ? Math.max(0, Math.min(1, ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / (len * len))) : 0;
    const d = Math.hypot(q[0] - (a[0] + t * (b[0] - a[0])), q[1] - (a[1] + t * (b[1] - a[1])));
    if (d <= REACH_M) {
      const [la, lb] = [u.line[i], u.line[i + 1]];
      const hit: Pass = { along: u.cum[i] + t * len, metres: d, at: [la[0] + t * (lb[0] - la[0]), la[1] + t * (lb[1] - la[1])] };
      if (!current) out.push((current = hit));
      else if (d < current.metres) Object.assign(current, hit);
    } else current = null;
  }
  return out;
}

/** The line from one point along it to another, going on past its end when it is a round trip. */
function slice(u: UrbanLine, from: Pass, to: Pass): [number, number][] {
  const inner = (a: number, b: number) => u.line.filter((_, i) => u.cum[i] > a && u.cum[i] < b);
  if (to.along >= from.along) return [from.at, ...inner(from.along, to.along), to.at];
  return [from.at, ...inner(from.along, Infinity), ...inner(-1, to.along), to.at];
}

const metres = (a: Point, b: Point) => Math.hypot(...([0, 1] as const).map((k) => flat([a.lon, a.lat])[k] - flat([b.lon, b.lat])[k]));

/**
 * The best ride on each city bus that goes from near `from` to near `to`, the quickest first. Times count from `now`:
 * the walk to the street the bus drives, the ride at a city bus's pace, the walk to the place. The wait is unknown,
 * so it is not in them, and the journeys say so.
 */
export function urbanJourneys(lines: UrbanLine[], from: Point, to: Point, now: Date, nameAt: (p: Point) => string | null): Journey[] {
  const straight = metres(from, to);
  if (straight < MIN_RIDE_M) return [];
  const found: { score: number; journey: Journey; key: string }[] = [];
  for (const u of lines) {
    const ons = passes(u, from);
    if (!ons.length) continue;
    const offs = passes(u, to);
    let best: { on: Pass; off: Pass; ride: number; score: number } | null = null;
    for (const on of ons) {
      for (const off of offs) {
        const ride = off.along > on.along ? off.along - on.along : u.ring ? u.cum[u.cum.length - 1] - on.along + off.along : -1;
        if (ride < MIN_RIDE_M || ride > WINDING * straight + WINDING_EXTRA_M) continue;
        const score = ((on.metres + off.metres) * DETOUR) / WALK_M_PER_MIN + ride / RIDE_M_PER_MIN;
        if (!best || score < best.score) best = { on, off, ride, score };
      }
    }
    if (!best) continue;
    const walkOn = Math.round(best.on.metres * DETOUR);
    const walkOff = Math.round(best.off.metres * DETOUR);
    const minutesOn = Math.ceil(walkOn / WALK_M_PER_MIN);
    const minutesRide = Math.max(1, Math.round(best.ride / RIDE_M_PER_MIN));
    const minutesOff = Math.ceil(walkOff / WALK_M_PER_MIN);
    const at = (m: number) => new Date(now.getTime() + m * 60_000).toISOString();
    const point = (p: [number, number], i: number) => {
      const place = { lat: p[1], lon: p[0] };
      return { id: `street-${u.route.id}-${i}`, name: nameAt(place) ?? "", ...place };
    };
    const on = point(best.on.at, 0);
    const off = point(best.off.at, 1);
    const legs: Leg[] = [
      { kind: "walk", meters: walkOn, minutes: minutesOn, from: null, to: on, path: [[from.lon, from.lat], best.on.at] },
      {
        kind: "ride",
        route: u.route,
        from: on,
        to: off,
        departs: at(minutesOn),
        arrives: at(minutesOn + minutesRide),
        stops: 0,
        path: slice(u, best.on, best.off),
        hail: true,
      },
      { kind: "walk", meters: walkOff, minutes: minutesOff, from: off, to: null, path: [best.off.at, [to.lon, to.lat]] },
    ];
    const minutes = minutesOn + minutesRide + minutesOff;
    found.push({
      score: best.score,
      key: `${u.route.code}|${u.route.name}`,
      journey: { departs: now.toISOString(), arrives: at(minutes), minutes, walkM: walkOn + walkOff, rides: 1, legs, untimed: true },
    });
  }
  // One route each way is one route to the rider: keep the better way.
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.score - b.score)
    .filter((f) => !seen.has(f.key) && seen.add(f.key))
    .slice(0, OPTIONS)
    .map((f) => f.journey);
}
