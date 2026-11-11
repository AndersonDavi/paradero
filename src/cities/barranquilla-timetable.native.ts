import type { CityData } from "./local";

/**
 * The app carries the timetable inside, so it works with no signal and needs no server. It is read only when
 * Barranquilla is used.
 */
export const timetable = () => import("../../public/cities/barranquilla.json").then((m) => m.default as unknown as CityData);
