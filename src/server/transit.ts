import { humanizeAlert } from "@/transit/alerts";
import { dedupeRoutes, describeRoute } from "@/transit/codes";
import type { Alert, Arrival, Bus, Feed, Health, IncomingBus, Nearby, RouteDetail, SearchResult, Stop, StopDetail } from "@/transit/types";
import type { z } from "zod";

import { cached, croma, isLive } from "./croma";
import * as s from "./schemas";

const MINUTE = 60_000;

const nearbyCache = cached<Nearby>(5 * MINUTE);
const searchCache = cached<SearchResult>(30 * MINUTE);
const stopCache = cached<z.infer<typeof s.stopLookup>>(6 * 60 * MINUTE);
const arrivalsCache = cached<z.infer<typeof s.arrivals>>(15_000);
const alertsCache = cached<Alert[]>(2 * MINUTE);
const routeCache = cached<Omit<RouteDetail, "buses" | "feed" | "alerts">>(60 * MINUTE);
const busesCache = cached<{ feed: Feed; buses: Bus[] }>(15_000);
const aroundCache = cached<z.infer<typeof s.vehicles>>(15_000);

function toStop(raw: z.infer<typeof s.stop>): Stop {
  return {
    id: raw.stop_id,
    name: raw.name,
    kind: raw.kind === "station" ? "station" : "stop",
    lat: raw.latitude,
    lon: raw.longitude,
    accessible: raw.wheelchair_boarding === "accessible",
    distanceM: raw.distance_m == null ? null : Math.round(raw.distance_m),
    routes: dedupeRoutes(
      raw.routes.map((r) => describeRoute({ id: r.route_id, shortName: r.short_name ?? null, longName: r.long_name ?? null, system: r.system ?? null })),
    ),
  };
}

function toAlerts(raw: z.infer<typeof s.alerts>): Alert[] {
  return raw.alerts.map((a) => {
    const routes = a.routes.flatMap((r) => (r.route_code ? [r.route_code] : []));
    const { title, detail } = humanizeAlert({ effect: a.effect ?? null, description: a.description ?? null, routes });
    return { id: a.alert_id, effect: a.effect ?? "unknown", title, detail, routes, until: a.active_periods[0]?.end ?? null };
  });
}

/** Nearest first, rounded to ~50 m so riders standing on the same corner share one answer. */
export function nearby(lat: number, lon: number): Promise<Nearby> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  return nearbyCache(key, async () => {
    const data = await croma("stops-search", { latitude: lat, longitude: lon, radius_m: 700, per_page: 25 }, s.stopsSearch);
    return { stops: data.stops.map(toStop) };
  });
}

export function search(query: string): Promise<SearchResult> {
  const q = query.trim().toLowerCase();
  return searchCache(q, async () => {
    const [stops, routes] = await Promise.all([
      croma("stops-search", { query: q, per_page: 15 }, s.stopsSearch),
      croma("routes-search", { query: q, per_page: 15 }, s.routesSearch),
    ]);
    return {
      stops: stops.stops.map(toStop),
      routes: dedupeRoutes(
        routes.routes.map((r) => describeRoute({ id: r.route_id, shortName: r.short_name ?? null, longName: r.long_name ?? null, system: r.system ?? null })),
      ),
    };
  });
}

function alertsFor(filter: { stop_id: string } | { route: string }): Promise<Alert[]> {
  return alertsCache(JSON.stringify(filter), async () => toAlerts(await croma("alerts", filter, s.alerts))).catch(() => []);
}

export async function stopDetail(stopId: string): Promise<StopDetail | null> {
  const [lookup, next, alerts] = await Promise.all([
    stopCache(stopId, () => croma("stop", { stop_id: stopId }, s.stopLookup)),
    arrivalsCache(stopId, () => croma("stop-arrivals", { stop_id: stopId, limit: 30 }, s.arrivals)),
    alertsFor({ stop_id: stopId }),
  ]);
  if (!lookup.found || !lookup.stop) return null;
  const stop = toStop(lookup.stop);
  const incoming = await incomingTo(stop, lookup.stop.routes.map((r) => r.route_id)).catch(() => []);

  const arrivals: Arrival[] = next.arrivals.map((a) => {
    const route = describeRoute({ id: a.route_id ?? "", shortName: a.route_code ?? null, longName: a.route_name ?? null, system: a.system ?? null });
    return {
      routeId: a.route_id ?? null,
      code: route.code,
      aliases: route.aliases,
      name: route.name,
      system: route.system,
      minutes: a.minutes_away ?? null,
      at: a.predicted_at ?? null,
      basis: a.basis,
      delaySeconds: a.delay_seconds ?? null,
      vehicle: a.vehicle_label ?? null,
    };
  });

  return {
    feed: { asOf: next.as_of, live: isLive(next.as_of, next.live) },
    stop,
    arrivals,
    incoming,
    alerts,
  };
}

/** Buses within ~3 km on a route that serves this stop: the "which one comes first" view riders asked for. */
async function incomingTo(stop: Stop, routeIds: string[]): Promise<IncomingBus[]> {
  const serving = new Set(routeIds);
  const around = await aroundCache(`${stop.lat.toFixed(3)},${stop.lon.toFixed(3)}`, () =>
    croma("vehicles", { latitude: stop.lat, longitude: stop.lon, radius_m: 3000, per_page: 300 }, s.vehicles),
  );
  return around.vehicles
    .filter((v) => v.route_id && serving.has(v.route_id))
    .slice(0, 40)
    .map((v) => {
      const route = describeRoute({ id: v.route_id ?? "", shortName: v.route_code ?? null, longName: v.route_name ?? null, system: v.system ?? null });
      return {
        id: v.vehicle_id ?? v.label ?? `${v.latitude},${v.longitude}`,
        lat: v.latitude,
        lon: v.longitude,
        nextStop: v.stop_name ?? null,
        plate: v.license_plate ?? null,
        reportedAt: v.reported_at ?? null,
        code: route.code,
        system: route.system,
      };
    });
}

async function loadRoute(routeId: string) {
  const data = await croma("route", { route_id: routeId, include_geometry: true }, s.route);
  if (!data.found || !data.route) return null;
  const r = data.route;
  const main = [...r.patterns].sort((a, b) => b.trips_per_week - a.trips_per_week)[0];
  const ref = describeRoute({ id: r.route_id, shortName: r.short_name ?? null, longName: r.long_name ?? null, system: r.system ?? null });

  const hours = await croma("routes-search", { query: r.short_name ?? "", per_page: 10 }, s.routesSearch).catch(() => null);
  const own = hours?.routes.find((x) => x.route_id === r.route_id);

  return {
    route: {
      ...ref,
      firstDeparture: own?.first_departure?.slice(0, 5) ?? null,
      lastDeparture: own?.last_departure?.slice(0, 5) ?? null,
      tripsPerWeek: own?.trips_per_week ?? null,
    },
    path: (main?.geometry?.coordinates ?? []).map((c) => [c[0], c[1]] as [number, number]),
    stops: (main?.stops ?? []).flatMap((st) =>
      st.latitude == null || st.longitude == null ? [] : [{ id: st.stop_id, name: st.name ?? "Paradero", lat: st.latitude, lon: st.longitude }],
    ),
  };
}

function busesOn(code: string) {
  return busesCache(code, async () => {
    const first = await croma("vehicles", { route: code, per_page: 200 }, s.vehicles);
    const rest = await Promise.all(
      Array.from({ length: Math.min(first.total_pages, 4) - 1 }, (_, i) => croma("vehicles", { route: code, per_page: 200, page: i + 2 }, s.vehicles)),
    );
    const buses = [first, ...rest].flatMap((page) =>
      page.vehicles.map((v) => ({
        id: v.vehicle_id ?? v.label ?? `${v.latitude},${v.longitude}`,
        lat: v.latitude,
        lon: v.longitude,
        nextStop: v.stop_name ?? null,
        plate: v.license_plate ?? null,
        reportedAt: v.reported_at ?? null,
      })),
    );
    return { feed: { asOf: first.as_of, live: isLive(first.as_of, first.live) }, buses };
  });
}

export async function routeDetail(routeId: string): Promise<RouteDetail | null> {
  const base = await routeCache(routeId, async () => {
    const loaded = await loadRoute(routeId);
    if (!loaded) throw new Error("not_found");
    return loaded;
  }).catch((e: Error) => {
    if (e.message === "not_found") return null;
    throw e;
  });
  if (!base) return null;

  const code = base.route.feedCode;
  const [{ feed, buses }, alerts] = await Promise.all([busesOn(code), alertsFor({ route: code })]);
  return { ...base, feed, buses, alerts };
}

export async function health(): Promise<Health> {
  const { feed } = await busesCache("__health", async () => {
    const data = await croma("vehicles", { per_page: 1 }, s.vehicles);
    return { feed: { asOf: data.as_of, live: isLive(data.as_of, data.live) }, buses: [] };
  });
  return { feed };
}
