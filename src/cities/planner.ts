import type { Journey, Leg, PlanStop, RouteRef } from "@/transit/types";

import type { Corner, Streets, Walk } from "./streets";
import type { Point } from "./types";

/**
 * Ways to get from one point to another on a timetable kept on the phone, worked out on the phone: the rider's
 * position never leaves it. This is RAPTOR (Delling, Pajor and Werneck, 2012): round by round, each round one
 * more bus, it finds the soonest arrival with one bus, then with two, then with three, so a rider can pick fewer
 * changes or an earlier arrival. A city's whole network fits in a few thousand trips, so it takes milliseconds.
 */

export interface Network {
  stops: PlanStop[];
  routes: RouteRef[];
  patterns: { route: number; stops: number[]; offsets: number[]; line: [number, number][] | null }[];
  /** For each stop: the patterns that call there and where in the pattern. */
  calls: { pattern: number; at: number }[][];
}

/** A walking pace most riders keep: 75 metres a minute, about 4.5 km/h. */
export const WALK_M_PER_MIN = 75;
/** Streets are longer than a straight line between two points: the guess when a city has no street map. */
const DETOUR = 1.25;
/** How far a rider will walk to the first stop, or from the last. */
const ACCESS_M = 1000;
/** How far a rider will walk between two stops to change buses. */
const TRANSFER_M = 350;
const MAX_RIDES = 3;
/** A minute to get from one bus to the next at the same stop. */
const CHANGE_MIN = 1;
/** Closer than this, the stop is where the rider already is: no walk to tell. */
const HERE_M = 25;
const OPTIONS = 3;

export function metres(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Minutes to walk a distance already measured along the streets (or guessed with DETOUR). */
export const walkMinutes = (m: number) => Math.max(1, Math.ceil(m / WALK_M_PER_MIN));

type Label =
  | { kind: "access"; meters: number }
  | { kind: "ride"; round: number; pattern: number; start: number; board: number; alight: number }
  | { kind: "walk"; round: number; from: number; meters: number };

interface Reach {
  stop: number;
  meters: number;
}

const transfers = new WeakMap<Network, Reach[][]>();

/** Stops close enough to walk between, worked out once per network. */
function walksBetween(net: Network): Reach[][] {
  let paths = transfers.get(net);
  if (!paths) {
    paths = net.stops.map((a, i) =>
      net.stops.flatMap((b, j) => {
        if (i === j) return [];
        const meters = metres(a, b);
        return meters <= TRANSFER_M ? [{ stop: j, meters: Math.round(meters * DETOUR) }] : [];
      }),
    );
    transfers.set(net, paths);
  }
  return paths;
}

const snaps = new WeakMap<Network, Corner[][]>();

/** The corners each stop can be walked to from, worked out once per network. A stop sits on its street. */
function stopsOnStreets(net: Network, streets: Streets) {
  let list = snaps.get(net);
  if (!list) {
    list = net.stops.map((s) => streets.near(s, 60));
    snaps.set(net, list);
  }
  return list;
}

/** The stops a rider can walk to from a point, and how far: along the streets when the city has them. */
function around(net: Network, point: Point, walk: Walk | null, streets: Streets | null): Reach[] {
  for (const radius of [ACCESS_M, ACCESS_M * 1.6]) {
    const found = net.stops.flatMap((s, stop) => {
      if (walk && streets && walk.origin >= 0) {
        const at = streets.reach(walk, stopsOnStreets(net, streets)[stop]);
        const meters = at ? at.meters : Infinity;
        // A stop beside the rider is closer in a straight line than by going round the block to its corner.
        const straight = metres(point, s);
        const best = straight < HERE_M * 2 ? straight : meters;
        return best <= radius ? [{ stop, meters: Math.round(best) }] : [];
      }
      const meters = metres(point, s) * DETOUR;
      return meters <= radius ? [{ stop, meters: Math.round(meters) }] : [];
    });
    if (found.length) return found;
  }
  return [];
}

/** The first start in a sorted list at or after `minute`. */
function firstAtLeast(list: number[], minute: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid] < minute) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function raptor(net: Network, trips: number[][], access: Reach[], now: number) {
  const n = net.stops.length;
  const walks = walksBetween(net);
  const first = new Float64Array(n).fill(Infinity);
  const firstLabels: (Label | undefined)[] = new Array(n);
  for (const { stop, meters } of access) {
    const t = now + (meters < HERE_M ? 0 : walkMinutes(meters));
    if (t < first[stop]) {
      first[stop] = t;
      firstLabels[stop] = { kind: "access", meters };
    }
  }
  const arrivals = [first];
  const labels = [firstLabels];
  const best = Float64Array.from(first);
  let marked = new Set(access.map((a) => a.stop));

  for (let round = 1; round <= MAX_RIDES && marked.size > 0; round++) {
    const before = arrivals[round - 1];
    const reached = Float64Array.from(before);
    const label = labels[round - 1].slice();
    // Each pattern is scanned once, from the earliest stop on it the last round reached.
    const queue = new Map<number, number>();
    for (const s of marked) {
      for (const { pattern, at } of net.calls[s]) {
        const q = queue.get(pattern);
        if (q === undefined || at < q) queue.set(pattern, at);
      }
    }
    const rode = new Set<number>();
    for (const [pattern, from] of queue) {
      const p = net.patterns[pattern];
      const list = trips[pattern];
      if (!list.length) continue;
      let start = -1;
      let board = -1;
      for (let i = from; i < p.stops.length; i++) {
        const s = p.stops[i];
        if (start >= 0) {
          const t = start + p.offsets[i];
          if (t < best[s]) {
            reached[s] = t;
            best[s] = t;
            label[s] = { kind: "ride", round, pattern, start, board, alight: i };
            rode.add(s);
          }
        }
        const ready = before[s] + (round > 1 ? CHANGE_MIN : 0);
        if (ready < Infinity && (start < 0 || ready <= start + p.offsets[i])) {
          const j = firstAtLeast(list, ready - p.offsets[i]);
          if (j < list.length && (start < 0 || list[j] < start)) {
            start = list[j];
            board = i;
          }
        }
      }
    }
    // Then a short walk to the stops around, to catch a bus there in the next round. Never two walks in a row.
    const next = new Set(rode);
    for (const s of rode) {
      for (const { stop, meters } of walks[s]) {
        if (rode.has(stop)) continue;
        const t = reached[s] + walkMinutes(meters);
        if (t < best[stop]) {
          reached[stop] = t;
          best[stop] = t;
          label[stop] = { kind: "walk", round, from: s, meters };
          next.add(stop);
        }
      }
    }
    arrivals.push(reached);
    labels.push(label);
    marked = next;
  }
  return { arrivals, labels };
}

/** The part of a route's line between two of its stops. */
function between(line: [number, number][] | null, stops: PlanStop[], from: number, to: number): [number, number][] {
  const a = stops[from];
  const b = stops[to];
  if (!line) return stops.slice(from, to + 1).map((s) => [s.lon, s.lat]);
  const nearest = (point: PlanStop, after: number) => {
    let at = after;
    let close = Infinity;
    for (let i = after; i < line.length; i++) {
      const d = (line[i][0] - point.lon) ** 2 + (line[i][1] - point.lat) ** 2;
      if (d < close) [close, at] = [d, i];
    }
    return at;
  };
  const start = nearest(a, 0);
  const end = nearest(b, start);
  return [[a.lon, a.lat], ...line.slice(start + 1, end), [b.lon, b.lat]];
}

export interface Clock {
  /** Minutes since the start of the city's day. */
  minute: number;
  /** The time a minute of the city's day falls at, as ISO. */
  at: (minute: number) => string;
}

/**
 * Up to three ways from `from` to `to`, the soonest arrival first. `trips` holds, for each pattern, the minutes
 * of the day its trips leave their first stop, in order, tomorrow's after today's.
 */
export function plan(net: Network, trips: number[][], from: Point, to: Point, clock: Clock, streets: Streets | null = null): Journey[] {
  // With the city's streets, every walk is measured and drawn along them; without, it is a straight line, longer
  // by a guess. One search out from each end covers every stop a rider would walk to.
  const reach = ACCESS_M * 1.6 + 200;
  const fromWalk = streets?.walkFrom(from, reach) ?? null;
  const toWalk = streets?.walkFrom(to, reach) ?? null;
  const onStreets = streets ? stopsOnStreets(net, streets) : null;
  const access = around(net, from, fromWalk, streets);
  const egress = around(net, to, toWalk, streets);
  const found: (Journey & { arrive: number; leave: number; key: string })[] = [];

  const straight = (a: Point, b: Point): [number, number][] => [
    [a.lon, a.lat],
    [b.lon, b.lat],
  ];
  const byStreet = (walk: Walk | null, stop: number, meters: number) => {
    const at = streets && walk && onStreets && meters >= HERE_M * 2 ? streets.reach(walk, onStreets[stop]) : null;
    return at && streets && walk ? streets.line(walk, at.vertex, net.stops[stop]) : null;
  };
  const accessPath = (stop: number, meters: number) => byStreet(fromWalk, stop, meters) ?? straight(from, net.stops[stop]);
  const egressPath = (stop: number, meters: number) => byStreet(toWalk, stop, meters)?.reverse() ?? straight(net.stops[stop], to);
  const transferPath = (a: number, b: number, meters: number) => {
    const walk = streets && meters >= HERE_M * 2 ? streets.walkFrom(net.stops[a], TRANSFER_M * 3) : null;
    return byStreet(walk, b, meters) ?? straight(net.stops[a], net.stops[b]);
  };

  const walkLeg = (meters: number, a: PlanStop | null, b: PlanStop | null, path: [number, number][]): Leg => ({
    kind: "walk",
    meters,
    minutes: walkMinutes(meters),
    from: a,
    to: b,
    path,
  });

  const search = (now: number) => {
    if (!access.length || !egress.length) return;
    const { arrivals, labels } = raptor(net, trips, access, now);
    let bestSoFar = Infinity;
    for (let round = 1; round < arrivals.length; round++) {
      let arrive = Infinity;
      let end: Reach | null = null;
      for (const e of egress) {
        const t = arrivals[round][e.stop] + (e.meters < HERE_M ? 0 : walkMinutes(e.meters));
        if (t < arrive) [arrive, end] = [t, e];
      }
      if (!end || arrive >= bestSoFar) continue;
      const legs: Leg[] = [];
      let leave = now;
      if (end.meters >= HERE_M) legs.unshift(walkLeg(end.meters, net.stops[end.stop], null, egressPath(end.stop, end.meters)));
      let s = end.stop;
      let label = labels[round][s];
      let guard = 0;
      while (label && guard++ < 10) {
        if (label.kind === "access") {
          if (label.meters >= HERE_M) legs.unshift(walkLeg(label.meters, null, net.stops[s], accessPath(s, label.meters)));
          break;
        }
        if (label.kind === "walk") {
          legs.unshift(walkLeg(label.meters, net.stops[label.from], net.stops[s], transferPath(label.from, s, label.meters)));
          s = label.from;
          label = labels[label.round][s];
          continue;
        }
        const p = net.patterns[label.pattern];
        const departs = label.start + p.offsets[label.board];
        legs.unshift({
          kind: "ride",
          route: net.routes[p.route],
          from: net.stops[p.stops[label.board]],
          to: net.stops[p.stops[label.alight]],
          departs: clock.at(departs),
          arrives: clock.at(label.start + p.offsets[label.alight]),
          stops: label.alight - label.board,
          via: p.stops.slice(label.board + 1, label.alight).map((s) => net.stops[s]),
          path: sliceStops(p, net, label.board, label.alight),
        });
        leave = departs;
        s = p.stops[label.board];
        label = labels[label.round - 1][s];
      }
      const rides = legs.filter((l) => l.kind === "ride").length;
      if (rides === 0) continue;
      // The rider leaves just in time to walk to the first bus.
      const first = legs[0];
      if (first.kind === "walk") leave -= first.minutes;
      bestSoFar = arrive;
      const walkM = legs.reduce((sum, l) => sum + (l.kind === "walk" ? l.meters : 0), 0);
      const key = legs.map((l) => (l.kind === "ride" ? `${l.route.id}@${l.from.id}@${l.departs}` : "w")).join("|");
      found.push({ departs: clock.at(leave), arrives: clock.at(arrive), minutes: arrive - leave, walkM, rides, legs, arrive, leave, key });
    }
  };

  // The next departures too, for a rider who will not make the first one.
  let start = clock.minute;
  for (let tries = 0; tries < OPTIONS; tries++) {
    const before = found.length;
    search(start);
    if (found.length === before) break;
    start = Math.min(...found.slice(before).map((j) => j.leave)) + 1;
  }

  // A way is no use when another leaves no sooner, arrives no later and takes no more buses: then the rider just waits longer.
  const worse = (a: (typeof found)[number], b: (typeof found)[number]) => b !== a && b.leave >= a.leave && b.arrive <= a.arrive && b.rides <= a.rides && (b.leave > a.leave || b.arrive < a.arrive || b.rides < a.rides);
  const kept = found.filter((a) => !found.some((b) => worse(a, b)));
  const unique = [...new Map(kept.map((j) => [j.key, j])).values()].sort((a, b) => a.arrive - b.arrive || a.rides - b.rides);
  const journeys: Journey[] = unique.slice(0, OPTIONS).map(({ arrive: _a, leave: _l, key: _k, ...j }) => j);

  // Close enough, walking is a way too, and sometimes the best one.
  const there = streets && fromWalk ? streets.reach(fromWalk, streets.near(to)) : null;
  const direct = Math.round(there ? there.meters : metres(from, to) * DETOUR);
  const directPath = there && streets && fromWalk ? streets.line(fromWalk, there.vertex, to) : straight(from, to);
  const walkOnly = walkMinutes(direct);
  if (direct <= 2500 && (journeys.length === 0 || walkOnly <= journeys[0].minutes + 5)) {
    journeys.push({
      departs: clock.at(clock.minute),
      arrives: clock.at(clock.minute + walkOnly),
      minutes: walkOnly,
      walkM: direct,
      rides: 0,
      legs: [walkLeg(direct, null, null, directPath)],
    });
    journeys.sort((a, b) => Date.parse(a.arrives) - Date.parse(b.arrives));
  }
  return journeys;
}

function sliceStops(p: Network["patterns"][number], net: Network, board: number, alight: number): [number, number][] {
  const stops = p.stops.map((s) => net.stops[s]);
  return between(p.line, stops, board, alight);
}
