import { streets, timetable } from "./barranquilla-timetable";
import { localSource } from "./local";
import type { City } from "./types";

/**
 * Transmetro, Barranquilla and Soledad, from the community GTFS in ColombiaInfo/ColombiaGTFS (CC BY-SA 4.0),
 * turned into public/cities/barranquilla.json by scripts/gtfs-to-city.mjs. It is a timetable from 2016–2017
 * and Transmetro publishes no live positions, so every time is marked as scheduled and the feed shows its age.
 */
export const barranquilla: City = {
  id: "barranquilla",
  name: "Barranquilla",
  operator: "Transmetro",
  network: null,
  systemNames: { troncal: "Transmetro" },
  // Barrio Abajo, by the Centro: where the map opens, and what a rider outside the city is shown.
  center: { lat: 10.9869, lon: -74.7835 },
  area: { west: -74.92, south: 10.84, east: -74.72, north: 11.06 },
  bounds: { west: -75.0, south: 10.78, east: -74.65, north: 11.12 },
  // Gran Malecón runs on special dates and hours only.
  specialRoutes: ["GM"],
  examples: ["S1", "R10", "A3-4", "Portal de Soledad", "C. C. Viva", "Universidad del Norte"],
  card: false,
  source: localSource(timetable, streets),
};
