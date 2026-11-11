import { httpSource } from "./http";
import type { City } from "./types";

/** TransMilenio, SITP, alimentadores and TransMiCable, read through Croma on the server. */
export const bogota: City = {
  id: "bogota",
  name: "Bogotá",
  // Chapinero: where the map opens, and what a rider outside the city is shown.
  center: { lat: 4.6486, lon: -74.0628 },
  area: { west: -74.3, south: 4.4, east: -73.95, north: 4.85 },
  bounds: { west: -74.45, south: 4.3, east: -73.85, north: 4.95 },
  card: true,
  source: httpSource,
};
