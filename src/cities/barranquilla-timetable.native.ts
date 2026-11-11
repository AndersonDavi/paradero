import type { CityData } from "./local";
import type { StreetsData } from "./streets";

/**
 * The app carries the timetable inside, so it works with no signal and needs no server. It is read only when
 * Barranquilla is used.
 */
export const timetable = () => import("../../public/cities/barranquilla.json").then((m) => m.default as unknown as CityData);

/** The streets, carried inside too, read only to plan a trip or find an address. */
export const streets = () => import("../../public/cities/barranquilla-streets.json").then((m) => m.default as unknown as StreetsData);
