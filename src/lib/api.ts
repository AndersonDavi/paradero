import { focusManager, keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

import { city } from "@/cities";
import type { ReportInput, ReportResult } from "@/transit/report";
import type { Journey, Nearby, SearchResult, Stop } from "@/transit/types";

import { ApiError } from "./http";

export { ApiError };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      staleTime: 10_000,
    },
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}

const LIVE = 20_000;

// Every answer comes from the city's own source, read when asked so a change of city takes effect at once; its id
// is in each key so two cities never share a cached answer.
const source = () => city.source;

export function useHealth() {
  return useQuery({ queryKey: ["health", city.id], queryFn: () => source().health(), refetchInterval: 60_000 });
}

export function useNearby(point: { lat: number; lon: number } | null) {
  // Rounded to a block before it goes anywhere: the rider's exact position never leaves the phone.
  const lat = point ? Math.round(point.lat * 1000) / 1000 : null;
  const lon = point ? Math.round(point.lon * 1000) / 1000 : null;
  return useQuery({
    queryKey: ["nearby", city.id, lat, lon],
    queryFn: () => source().nearby({ lat: lat ?? 0, lon: lon ?? 0 }),
    enabled: !!point,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useSearch(query: string, near?: { lat: number; lon: number } | null) {
  const q = query.trim();
  // Rounded to a block, like nearby: enough to list the closest places first.
  const at = near ? { lat: Math.round(near.lat * 1000) / 1000, lon: Math.round(near.lon * 1000) / 1000 } : null;
  return useQuery({
    queryKey: ["search", city.id, q.toLowerCase(), at?.lat, at?.lon],
    queryFn: () => source().search(q, at),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30 * 60_000,
  });
}

const stopQuery = (id: string) => ({ queryKey: ["stop", city.id, id], queryFn: () => source().stop(id), staleTime: 15_000 });
const routeQuery = (id: string) => ({ queryKey: ["route", city.id, id], queryFn: () => source().route(id), staleTime: 15_000 });

export function prefetchStop(id: string) {
  void queryClient.prefetchQuery(stopQuery(id));
}

export function prefetchRoute(id: string) {
  void queryClient.prefetchQuery(routeQuery(id));
}

/** A stop we already know from a list, so its screen can open with a name and a map instead of a blank. */
export function knownStop(id: string | undefined): Stop | undefined {
  if (!id) return undefined;
  for (const [, data] of queryClient.getQueriesData<Nearby | SearchResult>({ predicate: (q) => q.queryKey[0] === "nearby" || q.queryKey[0] === "search" })) {
    const hit = data?.stops.find((s) => s.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useStop(id: string | undefined) {
  return useQuery({ ...stopQuery(id ?? ""), enabled: !!id, refetchInterval: LIVE });
}

export function useRoute(id: string | undefined) {
  return useQuery({ ...routeQuery(id ?? ""), enabled: !!id, refetchInterval: LIVE });
}

/** Every stop in the city, when its stops are on the phone; empty otherwise. Read once. */
export function useEveryStop() {
  return useQuery({
    queryKey: ["everyStop", city.id],
    queryFn: () => source().everyStop?.() ?? Promise.resolve([]),
    enabled: typeof source().everyStop === "function",
    staleTime: Infinity,
  });
}

/** Whether this city can plan a trip on the phone. */
export const canPlan = () => typeof source().plan === "function";

/**
 * Ways from where the rider is to a place. Worked out on the phone from the timetable, so the exact position is
 * used and never sent anywhere. Worked out again every minute, as the next bus changes.
 */
export function usePlan(from: { lat: number; lon: number } | null, to: { lat: number; lon: number } | null) {
  return useQuery({
    queryKey: ["plan", city.id, from?.lat, from?.lon, to?.lat, to?.lon],
    queryFn: () => source().plan!(from!, to!),
    enabled: canPlan() && !!from && !!to,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export interface TripStop {
  lat: number;
  lon: number;
  /** Minutes the rider stays at the stop before this one, before setting off again. */
  stay: number;
}

/**
 * A trip with stops, worked out leg by leg on the phone: the ways to the first stop, and from there, the soonest
 * way on to each next one, leaving when the rider arrives plus the time they stay. `chosen` is the way to the
 * first stop the rider picked, which sets when every later leg leaves.
 */
export function useTrip(from: { lat: number; lon: number } | null, stops: TripStop[], chosen: number) {
  return useQuery({
    queryKey: ["trip", city.id, from?.lat, from?.lon, stops.map((s) => `${s.lat},${s.lon},${s.stay}`).join("|"), chosen],
    queryFn: async () => {
      const plan = source().plan!;
      const first = await plan(from!, stops[0]);
      const then: (Journey | null)[] = [];
      let arrives = first.journeys[Math.min(chosen, first.journeys.length - 1)]?.arrives ?? null;
      for (let i = 1; i < stops.length; i++) {
        if (!arrives) {
          then.push(null);
          continue;
        }
        const leave = new Date(Date.parse(arrives) + stops[i].stay * 60_000).toISOString();
        const leg = (await plan(stops[i - 1], stops[i], leave)).journeys[0] ?? null;
        then.push(leg);
        arrives = leg?.arrives ?? null;
      }
      return { feed: first.feed, first: first.journeys, then };
    },
    enabled: canPlan() && !!from && stops.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export async function sendReport(input: ReportInput): Promise<ReportResult> {
  const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? `http_${res.status}`);
  }
  return res.json() as Promise<ReportResult>;
}
