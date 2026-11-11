import type { Health, Nearby, RouteDetail, SearchResult, StopDetail } from "@/transit/types";

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
 * Where a city's buses, stops and routes come from. The screens only ever ask these five things, so a city can
 * answer from Paradero's API on the server or from data kept on the phone, and the screens stay the same.
 */
export interface TransitSource {
  health(): Promise<Health>;
  /** The point is already rounded to a block (3 decimals), so it can leave the phone. */
  nearby(point: Point): Promise<Nearby>;
  search(query: string): Promise<SearchResult>;
  stop(id: string): Promise<StopDetail>;
  route(id: string): Promise<RouteDetail>;
}

export interface City {
  id: string;
  name: string;
  /** Where the map opens, and the neighbourhood shown to a rider who is not in the city. */
  center: Point;
  /** A rider inside this box is in the city, and sees the stops around them. */
  area: Box;
  /** The map never pans past this box. */
  bounds: Box;
  /** The city's fare card can be read over NFC, as TuLlave in Bogotá. */
  card: boolean;
  source: TransitSource;
}
