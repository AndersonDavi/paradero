import Storage from "@/lib/storage";
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

/** A place the rider goes to: Casa, Trabajo, or one they named by saving it. */
export interface SavedPlace {
  type: "place";
  id: string;
  name: string;
  /** Home and work are kept apart: there is one of each, and they come first. */
  label: "home" | "work" | null;
  lat: number;
  lon: number;
}

/** A trip the rider makes often. From null is from wherever they are when they open it. */
export interface SavedTrip {
  type: "trip";
  id: string;
  from: { name: string; lat: number; lon: number } | null;
  to: { name: string; lat: number; lon: number };
}

export type Saved = SavedStop | SavedRoute | SavedPlace | SavedTrip;

/** One id per point, so the same place saved twice is one place. */
const at = (p: { lat: number; lon: number }) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
export const placeId = at;
export const tripId = (from: { lat: number; lon: number } | null, to: { lat: number; lon: number }) => `${from ? at(from) : "here"}>${at(to)}`;

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

/**
 * Saves a place, or changes what it is. Saving one as home or work takes that label from any other place; saving it
 * again as what it already is removes it.
 */
export function setPlace(place: { name: string; lat: number; lon: number }, label: SavedPlace["label"]): boolean {
  const id = placeId(place);
  const current = snapshot.find((s): s is SavedPlace => s.type === "place" && s.id === id);
  if (current && current.label === label) {
    write(snapshot.filter((s) => !(s.type === "place" && s.id === id)));
    return false;
  }
  const others = snapshot.filter((s) => !(s.type === "place" && s.id === id)).map((s) => (s.type === "place" && label && s.label === label ? { ...s, label: null } : s));
  write([...others, { type: "place", id, name: place.name, label, lat: place.lat, lon: place.lon }]);
  return true;
}

export function toggleTrip(from: SavedTrip["from"], to: SavedTrip["to"]): boolean {
  const id = tripId(from, to);
  if (snapshot.some((s) => s.type === "trip" && s.id === id)) {
    write(snapshot.filter((s) => !(s.type === "trip" && s.id === id)));
    return false;
  }
  write([...snapshot, { type: "trip", id, from, to }]);
  return true;
}

/** Home first, then work, then the rest in the order they were saved. */
export function placesInOrder(saved: Saved[]): SavedPlace[] {
  const rank = (p: SavedPlace) => (p.label === "home" ? 0 : p.label === "work" ? 1 : 2);
  return saved.filter((s): s is SavedPlace => s.type === "place").sort((a, b) => rank(a) - rank(b));
}

export function removeSaved(item: Saved) {
  write(snapshot.filter((s) => !(s.type === item.type && s.id === item.id)));
}
