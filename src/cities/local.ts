import { ApiError } from "@/lib/http";
import type { Arrival, Feed, Nearby, Place, PlaceKind, RouteDetail, RouteRef, SearchResult, Stop, StopDetail, System } from "@/transit/types";

import { metres, plan } from "./planner";
import { buildStreets, type Streets, type StreetsData } from "./streets";
import type { Point, TransitSource } from "./types";

/**
 * A city answered on the phone from its published timetable, made by scripts/gtfs-to-city.mjs. The timetable is
 * read the first time the city is used and kept in memory: the web fetches it, the app carries it inside, so it
 * works with no signal. Nothing here is live: every time is from the timetable, and the feed says so.
 */

type Day = "weekday" | "saturday" | "sunday";

export interface CityData {
  version: 1;
  city: string;
  source: { name: string; url: string; license: string };
  validUntil: string | null;
  /** id, name, lat, lon, station (1) or stop (0), wheelchair accessible (1) */
  stops: [string, string, number, number, 0 | 1, 0 | 1][];
  /** id, code, name, system */
  routes: [string, string, string, System][];
  /**
   * route index, stop indexes in order, minutes from the first stop to each one, departures from the first stop
   * by day, and the line it is drawn with in `paths` (-1, or absent, to draw it from stop to stop)
   */
  patterns: [number, number[], number[], Partial<Record<Day, number[]>>, number?][];
  /** Route lines along the streets, as encoded polylines. */
  paths?: string[];
  /** Places from OpenStreetMap: name, lat, lon, kind, and the neighbourhood it is in (an index here, or -1). */
  places?: [string, number, number, PlaceKind, number][];
  /**
   * Neighbourhoods: a name and its outlines as encoded polylines, or only a name where OpenStreetMap has no
   * outline. A place's last field indexes this list; without it (older files), the places list itself.
   */
  areas?: [string, ...string[]][];
}

interface Pattern {
  route: number;
  stops: number[];
  offsets: number[];
  departures: Partial<Record<Day, number[]>>;
  perWeek: number;
  /** Along the streets, lon/lat; null when the pattern is drawn from stop to stop. */
  line: [number, number][] | null;
}

interface Index {
  data: CityData;
  feed: Feed;
  stops: Omit<Stop, "distanceM">[];
  stopById: Map<string, number>;
  routes: RouteRef[];
  routeById: Map<string, number>;
  patterns: Pattern[];
  /** For each stop: the patterns that call there and where in the pattern. */
  calls: { pattern: number; at: number }[][];
  places: (Omit<Place, "distanceM"> & { words: string; core: string })[];
  /** The neighbourhoods OpenStreetMap has an outline for, as lon/lat rings. */
  outlines: { name: string; rings: [number, number][][] }[];
  /** Each pattern's trips for one day, today's and then tomorrow's, kept for the day they were worked out for. */
  trips: { day: string; list: number[][] } | null;
}

const NEARBY_M = 700;
const NEARBY_MAX = 25;
const SEARCH_MAX = 15;
const ARRIVALS_MAX = 30;
const ZONE = "America/Bogota";

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/** Letters and digits only, so "cc viva" finds "C. C. Viva". */
const compact = (text: string) => plain(text).replace(/[^\p{L}\p{N}]+/gu, "");

/** What a place is called without the word that says what kind it is: "C. C. Viva" is "Viva". */
const GENERIC = /^(c\.?\s*c\.?|centro comercial|barrio|urbanizacion|hospital|clinica|colegio|universidad|parque|estadio|supermercado|iglesia|parroquia)\s+/;
const core = (name: string) => compact(plain(name).replace(GENERIC, ""));

/** Among places that match as well, the kinds people most often go to first. */
const KIND_ORDER: Record<PlaceKind, number> = { address: 0, mall: 1, transit: 2, education: 3, park: 4, neighbourhood: 5, health: 6, other: 7 };

/** "Calle 45D # 1F-32", "Cra 46 84-10": worth reading the streets for. */
const ADDRESS_LIKE = /^\s*(av(enida)?\.?\s+)?(calle|cll?|carrera|cra|kra|kr|cr|diagonal|dg|transversal|tv)\.?\s*\d+\w*\s*(#|no|con|x|\s)\s*\w*\d/i;

/** The city's clock: which timetable runs today and how many minutes of it have gone by. */
function cityClock(now: Date): { day: Day; tomorrow: Day; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = part("weekday");
  const dayOf = (w: string): Day => (w === "Sat" ? "saturday" : w === "Sun" ? "sunday" : "weekday");
  const next: Record<string, string> = { Mon: "Tue", Tue: "Wed", Wed: "Thu", Thu: "Fri", Fri: "Sat", Sat: "Sun", Sun: "Mon" };
  return { day: dayOf(weekday), tomorrow: dayOf(next[weekday] ?? "Mon"), minute: Number(part("hour")) * 60 + Number(part("minute")) };
}

/** Google's encoded polyline, 5 decimals, back to lon/lat pairs. */
function decode(text: string): [number, number][] {
  const out: [number, number][] = [];
  let lat = 0;
  let lon = 0;
  let i = 0;
  const next = () => {
    let shift = 0;
    let value = 0;
    let byte: number;
    do {
      byte = text.charCodeAt(i++) - 63;
      value |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  while (i < text.length) {
    lat += next();
    lon += next();
    out.push([lon / 1e5, lat / 1e5]);
  }
  return out;
}

const hhmm = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

function build(data: CityData): Index {
  const routes: RouteRef[] = data.routes.map(([id, code, name, system]) => ({ id, feedCode: code, code, aliases: [code], name, system, variant: null }));
  const lines = (data.paths ?? []).map(decode);
  const patterns: Pattern[] = data.patterns.map(([route, stops, offsets, departures, path = -1]) => ({
    route,
    stops,
    offsets,
    departures,
    perWeek: (departures.weekday?.length ?? 0) * 5 + (departures.saturday?.length ?? 0) + (departures.sunday?.length ?? 0),
    line: lines[path] ?? null,
  }));
  const calls: Index["calls"] = data.stops.map(() => []);
  patterns.forEach((p, pattern) => p.stops.forEach((stop, at) => calls[stop].push({ pattern, at })));

  const stops = data.stops.map(([id, name, lat, lon, station, accessible], i) => {
    const serving = [...new Set(calls[i].map((c) => patterns[c.pattern].route))].map((r) => routes[r]);
    serving.sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
    return { id, name, kind: station ? ("station" as const) : ("stop" as const), lat, lon, accessible: accessible === 1, routes: serving };
  });

  const raw = data.places ?? [];
  const areaName = (i: number) => (data.areas ? data.areas[i]?.[0] : raw[i]?.[0]) ?? null;
  const places = raw.map(([name, lat, lon, kind, area], i) => ({ id: `place-${i}`, name, lat, lon, kind, area: areaName(area), words: compact(name), core: core(name) }));
  const outlines = (data.areas ?? []).flatMap(([name, ...rings]) => (rings.length ? [{ name, rings: rings.map(decode) }] : []));

  // The timetable's own date: shown as "last updated", so a rider can tell how old it is.
  const asOf = data.validUntil ? `${data.validUntil}T00:00:00-05:00` : new Date(0).toISOString();
  return {
    data,
    feed: { asOf, live: false },
    stops,
    stopById: new Map(stops.map((s, i) => [s.id, i])),
    routes,
    routeById: new Map(routes.map((r, i) => [r.id, i])),
    patterns,
    calls,
    places,
    outlines,
    trips: null,
  };
}

/** Whether a point is inside a ring, by counting the ring's edges a line from it crosses. */
function inside(point: Point, ring: [number, number][]): boolean {
  let crossed = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point.lat !== yj > point.lat && point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) crossed = !crossed;
  }
  return crossed;
}

/**
 * The neighbourhood a point is in: the outline that holds it, or, where OpenStreetMap has none, the nearest
 * neighbourhood by name, within a walk.
 */
function neighbourhoodOf(index: Index, point: Point): string | null {
  const holder = index.outlines.find((o) => o.rings.some((ring) => inside(point, ring)));
  if (holder) return holder.name;
  let best: { name: string; m: number } | null = null;
  for (const p of index.places) {
    if (p.kind !== "neighbourhood") continue;
    const m = metres(point, p);
    if (m < 1500 && (!best || m < best.m)) best = { name: p.name, m };
  }
  return best?.name ?? null;
}

/** Each pattern's trips from its first stop: today's, then tomorrow's, so a trip late at night can still be planned. */
function tripsFor(index: Index, now: Date): number[][] {
  const { day, tomorrow } = cityClock(now);
  const key = `${day}:${tomorrow}`;
  if (index.trips?.day !== key) {
    const list = index.patterns.map((p) => [...(p.departures[day] ?? []), ...(p.departures[tomorrow] ?? []).map((m) => m + 24 * 60)].sort((a, b) => a - b));
    index.trips = { day: key, list };
  }
  return index.trips.list;
}

function arrivalsAt(index: Index, stop: number, now: Date): Arrival[] {
  const clock = cityClock(now);
  const found: { minute: number; route: RouteRef }[] = [];
  for (const { pattern, at } of index.calls[stop]) {
    const p = index.patterns[pattern];
    if (at === p.stops.length - 1) continue; // The last stop of a trip is where the bus ends, not one to wait for.
    const route = index.routes[p.route];
    for (const start of p.departures[clock.day] ?? []) {
      const minute = start + p.offsets[at];
      if (minute >= clock.minute) found.push({ minute, route });
    }
    for (const start of p.departures[clock.tomorrow] ?? []) found.push({ minute: start + p.offsets[at] + 24 * 60, route });
  }
  found.sort((a, b) => a.minute - b.minute);
  const startOfMinute = Math.floor(now.getTime() / 60_000) * 60_000;
  return found.slice(0, ARRIVALS_MAX).map(({ minute, route }) => {
    const minutes = minute - clock.minute;
    return {
      routeId: route.id,
      code: route.code,
      aliases: route.aliases,
      name: route.name,
      system: route.system,
      minutes,
      at: new Date(startOfMinute + minutes * 60_000).toISOString(),
      basis: "scheduled",
      delaySeconds: null,
      vehicle: null,
      plate: null,
    };
  });
}

const pathOf = (index: Index, p: Pattern): [number, number][] => p.line ?? p.stops.map((s) => [index.stops[s].lon, index.stops[s].lat]);

export function localSource(read: () => Promise<CityData>, readStreets?: () => Promise<StreetsData>): TransitSource {
  let loading: Promise<Index> | null = null;
  let streetsLoading: Promise<Streets> | null = null;
  // The streets are the biggest file: read only to plan a trip or find an address, and a trip still plans with
  // straight walks if they cannot be read.
  const streets = (): Promise<Streets | null> => {
    if (!readStreets) return Promise.resolve(null);
    streetsLoading ??= readStreets()
      .then(buildStreets)
      .catch((error: unknown) => {
        streetsLoading = null;
        throw error;
      });
    return streetsLoading.catch(() => null);
  };
  const load = () => {
    loading ??= read()
      .then(build)
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
    return loading;
  };

  return {
    async health() {
      return { feed: (await load()).feed };
    },

    async nearby(point) {
      const index = await load();
      const stops: Nearby["stops"] = index.stops
        .map((s) => ({ ...s, distanceM: Math.round(metres(point, s)) }))
        .filter((s) => s.distanceM <= NEARBY_M)
        .sort((a, b) => a.distanceM - b.distanceM)
        .slice(0, NEARBY_MAX);
      return { stops };
    },

    async search(query, near) {
      const index = await load();
      const q = plain(query);
      const words = compact(query);
      const far = (p: Point) => (near ? Math.round(metres(near, p)) : null);
      // A route's code first, then its name; exact codes ahead of codes that only start the same.
      const routes = index.routes
        .map((r) => ({ r, rank: plain(r.code) === q ? 0 : plain(r.code).startsWith(q) ? 1 : plain(r.name).includes(q) ? 2 : 9 }))
        .filter((x) => x.rank < 9)
        .sort((a, b) => a.rank - b.rank || a.r.code.localeCompare(b.r.code, "es", { numeric: true }))
        .slice(0, SEARCH_MAX)
        .map((x) => x.r);
      const stops: SearchResult["stops"] = index.stops
        .filter((s) => plain(s.name).includes(q))
        .sort((a, b) => Number(b.kind === "station") - Number(a.kind === "station") || a.name.localeCompare(b.name, "es"))
        .slice(0, SEARCH_MAX)
        .map((s) => ({ ...s, distanceM: far(s) }));
      // The place called just what was typed first ("viva" is C. C. Viva), then names that start with it, then
      // names with a word that does; among those, the kinds people go to most, then the closest.
      const places: Place[] = words.length < 2 ? [] : index.places
        .map((p) => ({
          p,
          rank: p.core === words || p.words === words ? 0 : p.words.startsWith(words) || p.core.startsWith(words) ? 1 : plain(p.name).split(/\s+/).some((w) => compact(w).startsWith(words)) ? 2 : p.words.includes(words) ? 3 : 9,
        }))
        .filter((x) => x.rank < 9)
        .map(({ p, rank }) => ({ rank, place: { id: p.id, name: p.name, kind: p.kind, lat: p.lat, lon: p.lon, area: p.area, distanceM: far(p) } }))
        .sort(
          (a, b) =>
            a.rank - b.rank ||
            (near ? (a.place.distanceM ?? 0) - (b.place.distanceM ?? 0) : KIND_ORDER[a.place.kind] - KIND_ORDER[b.place.kind]) ||
            a.place.name.localeCompare(b.place.name, "es"),
        )
        .slice(0, SEARCH_MAX)
        .map((x) => x.place);
      // An address goes first: whoever types one knows exactly where they are going.
      if (ADDRESS_LIKE.test(query)) {
        const map = await streets();
        const found = map?.addresses(query, near) ?? [];
        places.unshift(
          ...found.map((a, i) => ({
            id: `address-${i}-${a.point.lat.toFixed(5)},${a.point.lon.toFixed(5)}`,
            name: a.label,
            kind: "address" as const,
            lat: a.point.lat,
            lon: a.point.lon,
            area: neighbourhoodOf(index, a.point),
            distanceM: far(a.point),
          })),
        );
      }
      return { stops, routes, places };
    },

    async everyStop() {
      return (await load()).stops;
    },

    async plan(from, to) {
      const index = await load();
      const now = new Date();
      const clock = cityClock(now);
      const startOfMinute = Math.floor(now.getTime() / 60_000) * 60_000;
      const map = await streets();
      const journeys = plan(
        index,
        tripsFor(index, now),
        from,
        to,
        { minute: clock.minute, at: (minute) => new Date(startOfMinute + (minute - clock.minute) * 60_000).toISOString() },
        map,
      );
      return { feed: index.feed, journeys };
    },

    async stop(id): Promise<StopDetail> {
      const index = await load();
      const i = index.stopById.get(id);
      if (i === undefined) throw new ApiError(404, "not_found");
      return { feed: index.feed, stop: { ...index.stops[i], distanceM: null }, arrivals: arrivalsAt(index, i, new Date()), incoming: [], alerts: [] };
    },

    async route(id): Promise<RouteDetail> {
      const index = await load();
      const r = index.routeById.get(id);
      if (r === undefined) throw new ApiError(404, "not_found");
      const own = index.patterns.filter((p) => p.route === r).sort((a, b) => b.perWeek - a.perWeek);
      const main = own[0];
      const weekday = own.flatMap((p) => p.departures.weekday ?? []);
      return {
        feed: index.feed,
        route: {
          ...index.routes[r],
          firstDeparture: weekday.length ? hhmm(Math.min(...weekday)) : null,
          lastDeparture: weekday.length ? hhmm(Math.max(...weekday)) : null,
          tripsPerWeek: own.reduce((sum, p) => sum + p.perWeek, 0),
        },
        // The timetable has no drawn shapes, so a route is drawn from stop to stop.
        path: main ? pathOf(index, main) : [],
        patterns: own.slice(0, 4).map((p) => ({ path: pathOf(index, p), stops: p.stops.map((s) => index.stops[s].id) })),
        stops: main ? main.stops.map((s) => ({ id: index.stops[s].id, name: index.stops[s].name, lat: index.stops[s].lat, lon: index.stops[s].lon })) : [],
        buses: [],
        alerts: [],
      };
    },
  };
}
