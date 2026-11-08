import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

const KEY = "onboarded.v1";
const listeners = new Set<() => void>();
let done = Storage.getItemSync(KEY) === "1";

export function useOnboarded(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => done,
  );
}

export function finishOnboarding() {
  done = true;
  Storage.setItemSync(KEY, "1");
  listeners.forEach((l) => l());
}
