import { bogota } from "./bogota";
import type { Box, City } from "./types";

export type { Box, City, Point, TransitSource } from "./types";

/** The city this build serves. There is one for now; riders will choose once there are more. */
export const city: City = bogota;

const within = (box: Box, lat: number, lon: number) => lat > box.south && lat < box.north && lon > box.west && lon < box.east;

/** The rider is in the city, close enough to list the stops around them. */
export const inCity = (lat: number, lon: number) => within(city.area, lat, lon);

/** The map's limits in the order MapLibre takes them: west, south, east, north. */
export const mapBounds = (box: Box = city.bounds): [number, number, number, number] => [box.west, box.south, box.east, box.north];
