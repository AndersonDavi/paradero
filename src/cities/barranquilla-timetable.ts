import { get } from "@/lib/http";

import type { CityData } from "./local";

/** On the web the timetable is a file next to the site, fetched only when Barranquilla is used. */
export const timetable = () => get<CityData>("/cities/barranquilla.json");
