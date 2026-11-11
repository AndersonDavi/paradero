import Storage from "@/lib/storage";
import { useSyncExternalStore } from "react";
import { Appearance as Native } from "react-native";

export type Appearance = "system" | "light" | "dark";
export type Contrast = "system" | "high";

const KEY = "appearance.v1";
const CONTRAST_KEY = "contrast.v1";
const listeners = new Set<() => void>();
const saved = Storage.getItemSync(KEY);
let current: Appearance = saved === "light" || saved === "dark" ? saved : "system";
let contrast: Contrast = Storage.getItemSync(CONTRAST_KEY) === "high" ? "high" : "system";

function apply(value: Appearance) {
  if (process.env.EXPO_OS === "web") return;
  Native.setColorScheme(value === "system" ? "unspecified" : value);
}

apply(current);

/** Light, dark, or whatever the phone uses. The phone decides until the rider picks. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function setAppearance(value: Appearance) {
  current = value;
  Storage.setItemSync(KEY, value);
  apply(value);
  listeners.forEach((l) => l());
}

/** High contrast follows the phone; the rider can also turn it on just for Paradero. */
export function useContrast(): Contrast {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => contrast,
  );
}

export function setContrast(value: Contrast) {
  contrast = value;
  Storage.setItemSync(CONTRAST_KEY, value);
  listeners.forEach((l) => l());
}

export type Clock = "12" | "24";

const CLOCK_KEY = "clock.v1";
let clock: Clock = Storage.getItemSync(CLOCK_KEY) === "24" ? "24" : "12";

/** Times read "5:10 p. m." unless the rider asks for "17:10". For formatting outside React. */
export const clockFormat = (): Clock => clock;

/** The rider's clock; screens that show times subscribe so they redraw when it changes. */
export function useClock(): Clock {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => clock,
  );
}

export function setClock(value: Clock) {
  clock = value;
  Storage.setItemSync(CLOCK_KEY, value);
  listeners.forEach((l) => l());
}
