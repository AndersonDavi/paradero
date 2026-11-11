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
  /** The bus's plate, to find it on the map. Absent from servers before 0.0.5. */
  plate?: string | null;
}

export interface Alert {
  id: string;
  effect: string;
  /** Spanish sentences, kept for app versions that predate translations. */
  title: string;
  detail: string;
  /** Where it happens, as stop names. Two places mean "between", one means "near". */
  places?: string[];
  /** TransMilenio's own words when it names no stops. Shown as written, like stop names. */
  note?: string | null;
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
  /** Every way the route runs, the busiest first: its line and its stops in order. Absent from servers before 0.0.5. */
  patterns?: { path: [number, number][]; stops: string[] }[];
  stops: { id: string; name: string; lat: number; lon: number }[];
  buses: Bus[];
  alerts: Alert[];
}

export interface Nearby {
  stops: Stop[];
}

export type PlaceKind = "mall" | "health" | "education" | "park" | "neighbourhood" | "transit" | "other";

/** Somewhere a rider wants to go that is not a stop: a mall, a hospital, a neighbourhood. Its name is never translated. */
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lon: number;
  /** The neighbourhood it is in, to tell apart two places with the same name. */
  area: string | null;
  distanceM: number | null;
}

export interface SearchResult {
  stops: Stop[];
  routes: RouteRef[];
  /** Only from cities that keep a list of places; absent elsewhere. */
  places?: Place[];
}

export interface PlanStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/** One stretch of a trip: on foot, or on one bus from one stop to another. Times are ISO. */
export type Leg =
  | { kind: "walk"; meters: number; minutes: number; from: PlanStop | null; to: PlanStop | null; path: [number, number][] }
  | { kind: "ride"; route: RouteRef; from: PlanStop; to: PlanStop; departs: string; arrives: string; stops: number; path: [number, number][] };

export interface Journey {
  departs: string;
  arrives: string;
  minutes: number;
  walkM: number;
  rides: number;
  legs: Leg[];
}

/** Ways to get from where the rider is to a place, the soonest arrival first. Empty when nothing gets there today. */
export interface Plan {
  feed: Feed;
  journeys: Journey[];
}

export interface Health {
  feed: Feed;
}
