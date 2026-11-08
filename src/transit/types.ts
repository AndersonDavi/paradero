export const SYSTEMS = [
  "troncal",
  "dual",
  "zonal_urbano",
  "alimentador",
  "zonal_complementario",
  "zonal_especial",
  "transmicable",
  "other",
] as const;

export type System = (typeof SYSTEMS)[number];

export type Basis = "predicted" | "estimated" | "scheduled";

export interface Feed {
  asOf: string;
  live: boolean;
}

export interface RouteRef {
  id: string;
  feedCode: string;
  code: string;
  aliases: string[];
  name: string;
  system: System;
  variant: string | null;
}

export interface Stop {
  id: string;
  name: string;
  kind: "station" | "stop";
  lat: number;
  lon: number;
  accessible: boolean;
  distanceM: number | null;
  routes: RouteRef[];
}

export interface Arrival {
  routeId: string | null;
  code: string;
  aliases: string[];
  name: string;
  system: System;
  minutes: number | null;
  at: string | null;
  basis: Basis;
  delaySeconds: number | null;
  vehicle: string | null;
}

export interface Alert {
  id: string;
  effect: string;
  title: string;
  detail: string;
  routes: string[];
  until: string | null;
}

export interface Bus {
  id: string;
  lat: number;
  lon: number;
  nextStop: string | null;
  plate: string | null;
  reportedAt: string | null;
}

export interface IncomingBus extends Bus {
  code: string;
  system: System;
}

export interface StopDetail {
  feed: Feed;
  stop: Stop;
  arrivals: Arrival[];
  incoming: IncomingBus[];
  alerts: Alert[];
}

export interface RouteDetail {
  feed: Feed;
  route: RouteRef & {
    firstDeparture: string | null;
    lastDeparture: string | null;
    tripsPerWeek: number | null;
  };
  path: [number, number][];
  stops: { id: string; name: string; lat: number; lon: number }[];
  buses: Bus[];
  alerts: Alert[];
}

export interface Nearby {
  stops: Stop[];
}

export interface SearchResult {
  stops: Stop[];
  routes: RouteRef[];
}

export interface Health {
  feed: Feed;
}
