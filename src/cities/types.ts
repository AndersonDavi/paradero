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
  /** The city's fare card can be read over NFC, as TuLlave in Bogotá. */
  card: boolean;
  source: TransitSource;
}
