import { router } from "expo-router";

export interface PickedStop {
  name: string;
  lat: number;
  lon: number;
}

let waiting: ((stop: PickedStop) => void) | null = null;

/** Opens the screen to choose a stop to add to a trip; the trip hears back with the stop the rider chose. */
export function pickStop(then: (stop: PickedStop) => void) {
  waiting = then;
  router.push("/add-stop");
}

/** The rider chose: the trip that asked gets the stop, and the chooser closes. */
export function choose(stop: PickedStop) {
  waiting?.(stop);
  waiting = null;
  router.back();
}
