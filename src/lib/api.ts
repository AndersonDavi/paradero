import { focusManager, keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

import type { ReportInput, ReportResult } from "@/transit/report";
import type { Health, Nearby, RouteDetail, SearchResult, Stop, StopDetail } from "@/transit/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? `http_${res.status}`);
  }
  return res.json() as Promise<T>;
}

const LIVE = 20_000;

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: () => get<Health>("/api/health"), refetchInterval: 60_000 });
}

export function useNearby(point: { lat: number; lon: number } | null) {
  const lat = point?.lat.toFixed(3);
  const lon = point?.lon.toFixed(3);
  return useQuery({
    queryKey: ["nearby", lat, lon],
    queryFn: () => get<Nearby>(`/api/nearby?lat=${lat}&lon=${lon}`),
    enabled: !!point,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["search", q.toLowerCase()],
    queryFn: () => get<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30 * 60_000,
  });
}

const stopQuery = (id: string) => ({ queryKey: ["stop", id], queryFn: () => get<StopDetail>(`/api/stops/${id}`), staleTime: 15_000 });
const routeQuery = (id: string) => ({ queryKey: ["route", id], queryFn: () => get<RouteDetail>(`/api/routes/${id}`), staleTime: 15_000 });

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
