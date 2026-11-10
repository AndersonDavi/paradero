import { useEffect, useMemo, useRef, useState } from "react";

import { bearingBetween, measure, moveBy, pointAt, project, velocityBetween, type LngLat, type MeasuredPath } from "@/transit/path";

export interface BusFix {
  id: string;
  lat: number;
  lon: number;
  reportedAt: string | null;
  code?: string;
  system?: string;
  /** Known to be running forward along the line, so it can move before two reports give its speed. */
  onItsWay?: boolean;
}

export interface MovingBus {
  id: string;
  at: LngLat;
  bearing: number;
  code: string | null;
  system: string | null;
}

/** A bus within this distance of the route's line is moved along it; further off, it runs the other way or off the line. */
const ON_LINE_M = 60;
/** Faster than any bus in Bogotá: a jump this quick is a bad fix, not speed. */
const TOP_SPEED = 22;
/** How long past its last report a bus keeps the speed it had; after that it slows gently to a halt instead of stopping dead. */
const COAST_MS = 30_000;
/** How much further, in time at full speed, a bus rolls while slowing. */
const SLOWING_MS = 15_000;
/** A report older than this is shown where it was, without moving it. */
const STALE_MS = 120_000;
/** How long a bus takes to settle from where it is drawn onto where a new report puts it. */
const SETTLE_MS = 3_000;
const FRAME_MS = 33;
/** Under Reduce Motion buses are redrawn only to pick up new reports. */
const STILL_MS = 1_000;
/** A bus on its way with one report so far is moved at a gentle city pace, until a second report gives its own. */
const CRUISE = 4;
/** How long a bus takes to make up the distance to where its reports put it. It speeds up or eases off, never jumps. */
const CATCH_UP_S = 5;
/** Further than this from where its reports put it, a bus is simply drawn there. */
const SNAP_M = 600;
/** How much of the remaining turn a bus makes each frame, so it swings through a corner instead of snapping. */
const TURN = 0.09;

export interface Track {
  fixAt: number;
  fix: LngLat;
  along: number | null;
  speed: number;
  /** Whether the speed comes from two reports, or is still the pace assumed for a bus on its way. */
  measured: boolean;
  east: number;
  north: number;
  bearing: number;
  from: LngLat | null;
  settleAt: number;
  code: string | null;
  system: string | null;
}

/**
 * Buses moving between reports, like a ride app: each one is drawn where its speed
 * says it is now, along the route's line when it is on it, and settles onto every
 * new report instead of jumping. Positions arrive every 15 to 20 seconds; between
 * them this is an estimate, and under Reduce Motion buses stay where they reported.
 */
export function useMovingBuses(fixes: BusFix[], line: LngLat[] | undefined, still: boolean): MovingBus[] {
  const path = useMemo<MeasuredPath | null>(() => (line && line.length > 1 ? measure(line) : null), [line]);
  const tracks = useRef(new Map<string, Track>());
  const headings = useRef(new Map<string, number>());
  const rides = useRef(new Map<string, number>());
  const [moving, setMoving] = useState<MovingBus[]>([]);

  useEffect(() => {
    const now = Date.now();
    const seen = new Set<string>();
    for (const bus of fixes) {
      seen.add(bus.id);
      tracks.current.set(bus.id, follow(tracks.current.get(bus.id), bus, path, now));
    }
    for (const id of [...tracks.current.keys()]) if (!seen.has(id)) tracks.current.delete(id);
  }, [fixes, path]);

  useEffect(() => {
    rides.current.clear();
    let last = Date.now();
    const draw = () => {
      const now = Date.now();
      const seconds = Math.min(1, (now - last) / 1000);
      last = now;
      setMoving(
        [...tracks.current.entries()].map(([id, track]) => {
          let placed = { at: track.fix, bearing: track.bearing };
          if (!still && path && track.along !== null) {
            const along = ride(rides.current.get(id), track, now, seconds);
            rides.current.set(id, along);
            const here = pointAt(path, along);
            placed = { at: here.at, bearing: track.speed > 0.5 ? here.bearing : track.speed < -0.5 ? (here.bearing + 180) % 360 : track.bearing };
          } else if (!still) {
            placed = place(track, now);
          }
          const from = headings.current.get(id);
          const bearing = still || from === undefined ? placed.bearing : turnTowards(from, placed.bearing);
          headings.current.set(id, bearing);
          return { id, at: placed.at, bearing, code: track.code, system: track.system };
        }),
      );
      for (const id of [...headings.current.keys()]) {
        if (tracks.current.has(id)) continue;
        headings.current.delete(id);
        rides.current.delete(id);
      }
    };
    const timer = setInterval(draw, still ? STILL_MS : FRAME_MS);
    return () => clearInterval(timer);
  }, [still, path]);

  return moving;
}

/** A bus's track after a report: where it is, how fast it runs along the line, and where it was drawn, to settle from. */
export function follow(old: Track | undefined, bus: BusFix, path: MeasuredPath | null, now: number): Track {
  const fix: LngLat = [bus.lon, bus.lat];
  const fixAt = Math.min(now, bus.reportedAt ? Date.parse(bus.reportedAt) || now : now);
  const along = path ? onLine(path, fix) : null;
  if (!old) {
    return {
      fixAt,
      fix,
      along,
      speed: bus.onItsWay && along !== null ? CRUISE : 0,
      measured: false,
      east: 0,
      north: 0,
      bearing: path && along !== null ? pointAt(path, along).bearing : 0,
      from: null,
      settleAt: now,
      code: bus.code ?? null,
      system: bus.system ?? null,
    };
  }
  if (fixAt <= old.fixAt) return old;
  const seconds = (fixAt - old.fixAt) / 1000;
  const drawn = place(old, now);
  let { speed, east, north, bearing } = old;
  if (path && along !== null && old.along !== null) {
    // Signed: a bus running against the line's direction (the other way along the same street) moves back along it.
    const pace = (along - old.along) / seconds;
    speed = Math.abs(pace) > TOP_SPEED ? old.speed * 0.5 : old.measured ? 0.6 * pace + 0.4 * old.speed : pace;
    const heading = pointAt(path, along).bearing;
    bearing = Math.abs(pace) < 0.5 ? old.bearing : pace < 0 ? (heading + 180) % 360 : heading;
  } else {
    const v = velocityBetween(old.fix, fix, seconds);
    const pace = Math.hypot(v.east, v.north);
    [east, north] = pace <= TOP_SPEED ? [v.east, v.north] : [old.east * 0.5, old.north * 0.5];
    if (pace > 0.5) bearing = bearingBetween(old.fix, fix);
  }
  return { fixAt, fix, along, speed, measured: true, east, north, bearing, from: drawn.at, settleAt: now, code: bus.code ?? old.code, system: bus.system ?? old.system };
}

function turnTowards(from: number, to: number): number {
  const turn = ((to - from + 540) % 360) - 180;
  return Math.abs(turn) < 0.5 ? to : (from + turn * TURN + 360) % 360;
}

function onLine(path: MeasuredPath, at: LngLat): number | null {
  const p = project(path, at);
  return p && p.offset <= ON_LINE_M ? p.along : null;
}

/** How far past its report a bus has run by `now`, in seconds at the speed it had. */
function coasted(track: Track, now: number): number {
  const age = now - track.fixAt;
  if (age > STALE_MS) return 0;
  return (age <= COAST_MS ? age : COAST_MS + SLOWING_MS * (1 - Math.exp(-(age - COAST_MS) / SLOWING_MS))) / 1000;
}

/**
 * How far along the line a bus is drawn, one frame on from `drawn`. It runs at the speed its reports
 * give, a little faster or slower to close on where they put it, and it never backs up: a bus drawn
 * too far ahead waits for itself, as a bus held at a light does.
 */
export function ride(drawn: number | undefined, track: Track, now: number, seconds: number): number {
  const target = track.along! + track.speed * coasted(track, now);
  if (drawn === undefined || Math.abs(target - drawn) > SNAP_M) return target;
  const way = Math.abs(track.speed) > 0.5 ? Math.sign(track.speed) : Math.sign(target - drawn) || 1;
  const gap = (target - drawn) * way;
  const pace = Math.abs(track.speed);
  const fastest = Math.min(TOP_SPEED, Math.max(pace, CRUISE) * 1.6 + 2);
  return drawn + way * Math.min(fastest, Math.max(0, pace + gap / CATCH_UP_S)) * seconds;
}

/** Where a bus off the line is drawn at `now`: carried on from its last report by the velocity it had, eased in from where it was drawn before. */
export function place(track: Track, now: number): { at: LngLat; bearing: number } {
  const target = { at: moveBy(track.fix, track.east, track.north, coasted(track, now)), bearing: track.bearing };
  if (!track.from) return target;
  const k = Math.min(1, (now - track.settleAt) / SETTLE_MS);
  const eased = k * k * (3 - 2 * k);
  return { at: [track.from[0] + (target.at[0] - track.from[0]) * eased, track.from[1] + (target.at[1] - track.from[1]) * eased], bearing: target.bearing };
}
