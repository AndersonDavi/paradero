import { streets, timetable } from "./barranquilla-timetable";
import { localSource } from "./local";
import type { City } from "./types";

/**
 * Transmetro, Barranquilla and Soledad: the routes, stops and first and last buses Transmetro publishes, with the
 * frequencies of the community GTFS in ColombiaInfo/ColombiaGTFS (CC BY-SA 4.0), the Área Metropolitana's city bus
 * lines and the POT's barrios, turned into public/cities/barranquilla.json by scripts/gtfs-to-city.mjs. Transmetro
 * publishes no live positions, so every time is marked as scheduled and approximate.
 */
export const barranquilla: City = {
  id: "barranquilla",
  name: "Barranquilla",
  operator: "Transmetro",
  network: null,
  // City buses, the Área Metropolitana's transporte público colectivo, are known by that word.
  systemNames: { troncal: "Transmetro", zonal_urbano: "Bus urbano" },
  // Barrio Abajo, by the Centro: where the map opens, and what a rider outside the city is shown.
  center: { lat: 10.9869, lon: -74.7835 },
  area: { west: -74.92, south: 10.84, east: -74.72, north: 11.06 },
  bounds: { west: -75.0, south: 10.78, east: -74.65, north: 11.12 },
  // Gran Malecón runs on special dates and hours only.
  specialRoutes: ["GM"],
  examples: ["S1", "R10", "A3-4", "Portal de Soledad", "C. C. Viva", "Universidad del Norte"],
  fares: [
    // Transmetro, trunk and feeders, from 19 January 2026 (Área Metropolitana de Barranquilla, as the press reported it).
    {
      systems: ["troncal", "alimentador"],
      amount: 3700,
      holiday: 3800,
      since: "2026-01-19",
      confirmed: true,
      source: "https://www.elespectador.com/colombia/barranquilla/pasaje-de-transmetro-y-transporte-publico-colectivo-en-barranquilla-2026/",
    },
    // City buses: the same figures were reported, but they wait for the AMB's own act before riders see them.
    { systems: ["zonal_urbano"], amount: 3700, holiday: 3800, since: "2026-01-19", confirmed: false, source: "pending: AMB resolution" },
  ],
  // The barrios with the most theft from persons ("atracos") in 2024-2026, by Policía Nacional (DIJIN) microdata as
  // Gabriel Olier analysed them: over 300 cases in the period, or a forecast of over 35 for July to September 2026,
  // or a hot spot at 99%. Figures are provisional; the list is checked again when newer ones are published.
  theft: {
    areas: [
      "Centro",
      "Barrio Centro",
      "Barrio Abajo",
      "El Prado",
      "Alto Prado",
      "Boston",
      "Ciudadela 20 de Julio",
      "Simón Bolívar",
      "La Ceiba",
      "El Carmen",
      "Rebolo",
      "El Bosque",
      "El Recreo",
      "La Concepción",
      "Riomar",
      "Barrio Riomar",
      "Villanueva",
      "San Roque",
    ],
    source: "Policía Nacional (DIJIN), 2024–2026, análisis de Gabriel Olier",
    url: "https://gabrielolier.substack.com/p/el-plan-esta-en-los-datos-donde-sera",
  },
  credits: [
    { gives: "routes", name: "Transmetro", license: null, url: "https://transmetro.gov.co" },
    { gives: "timetable", name: "ColombiaGTFS (ColombiaInfo)", license: "CC BY-SA 4.0", url: "https://github.com/ColombiaInfo/ColombiaGTFS" },
    { gives: "stops", name: "Transmetro, datos.gov.co", license: null, url: "https://www.datos.gov.co/d/hxy3-94yh" },
    { gives: "cityBuses", name: "Área Metropolitana de Barranquilla", license: null, url: "https://www.ambq.gov.co/ruta-de-buses/" },
    { gives: "barrios", name: "Alcaldía de Barranquilla, datos.gov.co", license: "CC BY-SA 4.0", url: "https://www.datos.gov.co/d/qui6-qeux" },
    { gives: "streets", name: "© OpenStreetMap contributors", license: "ODbL", url: "https://www.openstreetmap.org/copyright" },
    { gives: "theft", name: "Policía Nacional (DIJIN), Gabriel Olier", license: null, url: "https://gabrielolier.substack.com/p/el-plan-esta-en-los-datos-donde-sera" },
    { gives: "fares", name: "Área Metropolitana de Barranquilla, en El Espectador", license: null, url: "https://www.elespectador.com/colombia/barranquilla/pasaje-de-transmetro-y-transporte-publico-colectivo-en-barranquilla-2026/" },
  ],
  card: false,
  source: localSource(timetable, streets),
};
