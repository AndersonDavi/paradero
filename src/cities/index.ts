import { useSyncExternalStore } from "react";

import Storage from "@/lib/storage";
import type { System } from "@/transit/types";

import { barranquilla } from "./barranquilla";
import { bogota } from "./bogota";
import type { Box, City, CityId } from "./types";

export type { Box, City, CityId, Point, TransitSource } from "./types";

export const cities: Record<CityId, City> = { bogota, barranquilla };

const KEY = "city.v1";
const isCity = (id: unknown): id is CityId => typeof id === "string" && id in cities;
const saved = Storage.getItemSync(KEY);
const built = process.env.EXPO_PUBLIC_CITY;
const listeners = new Set<() => void>();

/**
 * The city the rider chose, kept on the phone. Before they choose, the one this build was made for
 * (EXPO_PUBLIC_CITY), or Bogotá. A live binding: every module reads the current city; screens that draw it
 * subscribe with useCity.
 */
export let city: City = isCity(saved) ? cities[saved] : isCity(built) ? cities[built] : bogota;

export function chooseCity(id: CityId) {
  if (city.id === id) return;
  city = cities[id];
  Storage.setItemSync(KEY, id);
  listeners.forEach((l) => l());
}

export function useCity(): City {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => city,
  );
}

const within = (box: Box, lat: number, lon: number) => lat > box.south && lat < box.north && lon > box.west && lon < box.east;

/** The rider is in the city, close enough to list the stops around them. */
export const inCity = (lat: number, lon: number) => within(city.area, lat, lon);

/** The map's limits in the order MapLibre takes them: west, south, east, north. */
export const mapBounds = (box: Box = city.bounds): [number, number, number, number] => [box.west, box.south, box.east, box.north];

/** A system as riders of this city call it: its proper name there, or the generic word in the rider's language. */
export const systemName = (system: System, words: Record<System, string>) => city.systemNames[system] ?? words[system];
