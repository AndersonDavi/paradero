import type { System } from "@/transit/types";

import { barranquilla } from "./barranquilla";
import { bogota } from "./bogota";
import type { Box, City, CityId } from "./types";

export type { Box, City, CityId, Point, TransitSource } from "./types";

export const cities: Record<CityId, City> = { bogota, barranquilla };

/**
 * The city this build serves: Bogotá, unless the build sets EXPO_PUBLIC_CITY. Riders will choose in the app
 * once there is a picker; until then a build is for one city.
 */
const chosen = process.env.EXPO_PUBLIC_CITY;
export const city: City = chosen && chosen in cities ? cities[chosen as CityId] : bogota;

const within = (box: Box, lat: number, lon: number) => lat > box.south && lat < box.north && lon > box.west && lon < box.east;

/** The rider is in the city, close enough to list the stops around them. */
export const inCity = (lat: number, lon: number) => within(city.area, lat, lon);

/** The map's limits in the order MapLibre takes them: west, south, east, north. */
export const mapBounds = (box: Box = city.bounds): [number, number, number, number] => [box.west, box.south, box.east, box.north];

/** A system as riders of this city call it: its proper name there, or the generic word in the rider's language. */
export const systemName = (system: System, words: Record<System, string>) => city.systemNames[system] ?? words[system];
