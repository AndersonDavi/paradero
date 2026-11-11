import { focusManager, keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

import { city } from "@/cities";
import type { ReportInput, ReportResult } from "@/transit/report";
import type { Nearby, SearchResult, Stop } from "@/transit/types";

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

// Every answer comes from the city's own source; its id is in each key so two cities never share a cached answer.
const source = city.source;

export function useHealth() {
  return useQuery({ queryKey: ["health", city.id], queryFn: () => source.health(), refetchInterval: 60_000 });
}

export function useNearby(point: { lat: number; lon: number } | null) {
  // Rounded to a block before it goes anywhere: the rider's exact position never leaves the phone.
  const lat = point ? Math.round(point.lat * 1000) / 1000 : null;
  const lon = point ? Math.round(point.lon * 1000) / 1000 : null;
  return useQuery({
    queryKey: ["nearby", city.id, lat, lon],
    queryFn: () => source.nearby({ lat: lat ?? 0, lon: lon ?? 0 }),
    enabled: !!point,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["search", city.id, q.toLowerCase()],
    queryFn: () => source.search(q),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30 * 60_000,
  });
}

const stopQuery = (id: string) => ({ queryKey: ["stop", city.id, id], queryFn: () => source.stop(id), staleTime: 15_000 });
const routeQuery = (id: string) => ({ queryKey: ["route", city.id, id], queryFn: () => source.route(id), staleTime: 15_000 });

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

export async function sendReport(input: ReportInput): Promise<ReportResult> {
  const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? `http_${res.status}`);
  }
  return res.json() as Promise<ReportResult>;
}
