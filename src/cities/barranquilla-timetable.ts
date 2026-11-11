import { get } from "@/lib/http";

import type { CityData } from "./local";
import type { StreetsData } from "./streets";

/** On the web the timetable is a file next to the site, fetched only when Barranquilla is used. */
export const timetable = () => get<CityData>("/cities/barranquilla.json");

/** The streets, fetched only to plan a trip or find an address. */
export const streets = () => get<StreetsData>("/cities/barranquilla-streets.json");
