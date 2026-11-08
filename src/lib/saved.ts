import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { RouteRef, Stop } from "@/transit/types";

export interface SavedStop {
  type: "stop";
  id: string;
  name: string;
  nickname: string | null;
  lat: number;
  lon: number;
  codes: string[];
}

export interface SavedRoute {
  type: "route";
  id: string;
  code: string;
  name: string;
  system: RouteRef["system"];
}

export type Saved = SavedStop | SavedRoute;

const KEY = "saved.v1";
const listeners = new Set<() => void>();

function read(): Saved[] {
  try {
    return JSON.parse(Storage.getItemSync(KEY) ?? "[]") as Saved[];
  } catch {
    return [];
  }
}

let snapshot = read();

function write(next: Saved[]) {
  snapshot = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSaved(): Saved[] {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function useIsSaved(type: Saved["type"], id: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => snapshot.some((s) => s.type === type && s.id === id));
}

export function toggleStop(stop: Stop) {
  if (snapshot.some((s) => s.type === "stop" && s.id === stop.id)) {
    write(snapshot.filter((s) => !(s.type === "stop" && s.id === stop.id)));
    return false;
  }
  write([
    ...snapshot,
    { type: "stop", id: stop.id, name: stop.name, nickname: null, lat: stop.lat, lon: stop.lon, codes: stop.routes.slice(0, 6).map((r) => r.code) },
  ]);
  return true;
}

export function toggleRoute(route: RouteRef) {
  if (snapshot.some((s) => s.type === "route" && s.id === route.id)) {
    write(snapshot.filter((s) => !(s.type === "route" && s.id === route.id)));
    return false;
  }
  write([...snapshot, { type: "route", id: route.id, code: route.code, name: route.name, system: route.system }]);
  return true;
}

export function renameStop(id: string, nickname: string | null) {
  write(snapshot.map((s) => (s.type === "stop" && s.id === id ? { ...s, nickname: nickname?.trim() || null } : s)));
}

export function removeSaved(item: Saved) {
  write(snapshot.filter((s) => !(s.type === item.type && s.id === item.id)));
}
