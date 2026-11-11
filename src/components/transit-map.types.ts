import { systems } from "@/theme/colors";
import type { Bus, RouteRef, Stop, System } from "@/transit/types";

export interface TripLeg {
  kind: "walk" | "ride";
  path: [number, number][];
}

export interface MapHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  fit: (coords: [number, number][]) => void;
}

export interface TransitMapProps {
  center: { lat: number; lon: number };
  zoom?: number;
  /** Each stop is ringed in the colour of the busiest kind of route that calls there, from its routes or `system`. */
  stops?: (Pick<Stop, "id" | "name" | "kind" | "lat" | "lon"> & { routes?: Pick<RouteRef, "system">[]; system?: System })[];
  buses?: (Bus & { system?: System; code?: string })[];
  path?: [number, number][];
  /** The stretch of the path still to be driven to the stop; drawn strong, with the rest of the path faint. */
  approach?: [number, number][];
  /** A trip: each bus it takes drawn as a line along its route, and each walk dotted, since it is drawn straight. */
  legs?: TripLeg[];
  /** Draw each bus's route code beside it, for maps that hold more than one route. */
  showCodes?: boolean;
  /** The bus the rider is following: drawn larger, above the rest. */
  focusBusId?: string | null;
  system?: System;
  showUser?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
  onStopPress?: (id: string) => void;
}

/** Walks are dots: a short dash with round ends, then a gap, both in line widths. */
export const WALK_DASH = [0.1, 2.2];

export const tripData = (legs: TripLeg[]) => ({
  type: "FeatureCollection" as const,
  features: legs
    .filter((l) => l.path.length > 1)
    .map((l) => ({ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: l.path }, properties: { kind: l.kind } })),
});

/** Which kind of route a stop is known for when several call there: a trunk station before a feeder stop. */
const RANK: System[] = ["troncal", "transmicable", "dual", "alimentador", "zonal_urbano", "zonal_complementario", "zonal_especial", "other"];

/** The ring colour of a stop on the map, or null to draw it in ink. */
export function stopColor(stop: { routes?: Pick<RouteRef, "system">[]; system?: System }, fallback?: System): string | null {
  const here = new Set(stop.routes?.map((r) => r.system));
  const system = stop.system ?? RANK.find((s) => here.has(s)) ?? fallback;
  return system && system !== "other" ? systems[system].dot : null;
}

/** Who the map is from. It sits on the map in plain sight in place of an info button, and reads the same in every language. */
export const MAP_CREDIT = "© OpenStreetMap · © CARTO";
