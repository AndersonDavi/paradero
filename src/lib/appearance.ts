import Storage from "expo-sqlite/kv-store";
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
