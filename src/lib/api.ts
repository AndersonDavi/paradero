import { focusManager, keepPreviousData, QueryClient, useQuery } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

import type { Health, Nearby, RouteDetail, SearchResult, StopDetail } from "@/transit/types";

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

export function useStop(id: string | undefined) {
  return useQuery({
    queryKey: ["stop", id],
    queryFn: () => get<StopDetail>(`/api/stops/${id}`),
    enabled: !!id,
    refetchInterval: LIVE,
  });
}

export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: ["route", id],
    queryFn: () => get<RouteDetail>(`/api/routes/${id}`),
    enabled: !!id,
    refetchInterval: LIVE,
  });
}
