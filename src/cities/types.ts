import type { Health, Nearby, Plan, RouteDetail, SearchResult, Stop, StopDetail, System } from "@/transit/types";

export type CityId = "bogota" | "barranquilla";

export interface Point {
  lat: number;
  lon: number;
}

/** A box on the map, west to east and south to north. */
export interface Box {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Where a city's buses, stops and routes come from. The screens only ever ask these things, so a city can
 * answer from Paradero's API on the server or from data kept on the phone, and the screens stay the same.
 */
export interface TransitSource {
  health(): Promise<Health>;
  /** The point is already rounded to a block (3 decimals), so it can leave the phone. */
  nearby(point: Point): Promise<Nearby>;
  /** `near` is rounded to a block too; a city that knows places lists the closest ones first. */
  search(query: string, near?: Point | null): Promise<SearchResult>;
  stop(id: string): Promise<StopDetail>;
  route(id: string): Promise<RouteDetail>;
  /**
   * Ways to get from one point to another by bus, for a city whose timetable is on the phone. The rider's
   * position is used exactly, so a city whose answers come from a server leaves this out.
   */
  plan?(from: Point, to: Point, at?: string): Promise<Plan>;
  /** Every stop in the city, for a city whose stops are on the phone: drawn faint around the ones a screen is about. */
  everyStop?(): Promise<Omit<Stop, "distanceM">[]>;
}

/** What a credited dataset gives the app, in the words the about screen uses for it. */
export type CreditKind = "routes" | "timetable" | "stops" | "cityBuses" | "barrios" | "streets" | "theft" | "fares";

export interface City {
  id: CityId;
  name: string;
  /** Who runs the buses, by its own name, which no language translates: "TransMilenio", "Transmetro". */
  operator: string;
  /** The network a street stop belongs to, if riders call it by one ("Paradero SITP"); null for a plain stop. */
  network: string | null;
  /** Systems a rider knows by a proper name in this city, ahead of the generic words in src/i18n. */
  systemNames: Partial<Record<System, string>>;
  /** Where the map opens, and the neighbourhood shown to a rider who is not in the city. */
  center: Point;
  /** A rider inside this box is in the city, and sees the stops around them. */
  area: Box;
  /** The map never pans past this box. */
  bounds: Box;
  /** Routes that run only on some days and at some hours the operator has not published, by the code riders see. */
  specialRoutes?: string[];
  /** What the search screen offers to try before the rider types: routes, stations and places riders know. */
  examples: string[];
  /**
   * What one ride costs, by kind of route, on ordinary days and on Sundays and holidays. Only confirmed fares are
   * shown; the others are kept here until a source confirms them.
   */
  fares?: { systems: System[]; amount: number; holiday: number; since: string; confirmed: boolean; source: string }[];
  /**
   * Barrios with the most theft from persons, by the name the city's neighbourhoods go by, and where the figures come
   * from: a trip that gets on, gets off or ends in one says so. Only from figures a rider could check; a barrio is
   * never marked on hearsay.
   */
  theft?: { areas: string[]; source: string; url: string };
  /**
   * Every dataset the city's routes, maps and warnings are built from, with what it gives and its license, so the
   * about screen can credit each one as its license asks.
   */
  credits?: { gives: CreditKind; name: string; license: string | null; url: string }[];
  /** The city's fare card can be read over NFC, as TuLlave in Bogotá. */
  card: boolean;
  source: TransitSource;
}
