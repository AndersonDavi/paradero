import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

import { queryClient } from "./api";

export const BOGOTA = { lat: 4.6486, lon: -74.0628 };

export type LocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "outside" }
  | { status: "ready"; lat: number; lon: number };

export const inBogota = (lat: number, lon: number) => lat > 4.4 && lat < 4.85 && lon > -74.3 && lon < -73.95;

/** A fix this fresh is good enough to list nearby stops. */
const RECENT = 2 * 60_000;
/** Android can wait minutes for a new fix indoors; after this, the last known one will do. */
const PATIENCE = 8_000;

function within<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([work.catch(() => null), new Promise<null>((done) => setTimeout(() => done(null), ms))]);
}

/** Reads the position only if the rider already said yes. Asking is always an explicit tap. */
async function locate(): Promise<{ lat: number; lon: number } | null> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  if (!granted) return null;
  const position = Platform.OS === "android" ? await locateAndroid() : await locateIos();
  return position ? { lat: position.coords.latitude, lon: position.coords.longitude } : null;
}

async function locateIos() {
  const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
  return fresh ?? (await Location.getLastKnownPositionAsync());
}

async function locateAndroid() {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT }).catch(() => null);
  return recent ?? (await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), PATIENCE)) ?? (await Location.getLastKnownPositionAsync().catch(() => null));
}

/** Shows the system prompt, or opens Settings when the rider said no before and iOS won't ask again. */
export async function askForLocation(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    await queryClient.invalidateQueries({ queryKey: ["location"] });
    return true;
  }
  if (!current.canAskAgain) {
    await Linking.openSettings();
    return false;
  }
  const { granted } = await Location.requestForegroundPermissionsAsync();
  await queryClient.invalidateQueries({ queryKey: ["location"] });
  return granted;
}

export function useLocation() {
  const query = useQuery({ queryKey: ["location"], queryFn: locate, staleTime: 2 * 60_000, retry: false });
  const state: LocationState = query.isPending
    ? { status: "loading" }
    : !query.data
      ? { status: "denied" }
      : inBogota(query.data.lat, query.data.lon)
        ? { status: "ready", ...query.data }
        : { status: "outside" };
  return { state, retry: askForLocation };
}
