import { get } from "@/lib/http";
import type { Health, Nearby, RouteDetail, SearchResult, StopDetail } from "@/transit/types";

import type { TransitSource } from "./types";

/** A city answered by Paradero's own API (src/app/api), which reads the operator's open data on the server. */
export const httpSource: TransitSource = {
  health: () => get<Health>("/api/health"),
  nearby: ({ lat, lon }) => get<Nearby>(`/api/nearby?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`),
  search: (query) => get<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`),
  stop: (id) => get<StopDetail>(`/api/stops/${id}`),
  route: (id) => get<RouteDetail>(`/api/routes/${id}`),
};
