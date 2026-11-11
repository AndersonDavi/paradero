import { systems } from "@/theme/colors";
import type { Bus, RouteRef, Stop, System } from "@/transit/types";

/**
 * How a stop is drawn. Plain: ringed in its kind of route's colour. Focus: the stop the screen is about, or where a
 * rider gets on or off, filled in its colour and larger. Pass: a stop a bus calls at on the way, a small white dot.
 * Faint: every other stop, there to find but out of the way.
 */
export type StopTone = "plain" | "focus" | "pass" | "faint";

export type MapStop = Pick<Stop, "id" | "name" | "kind" | "lat" | "lon"> & { routes?: Pick<RouteRef, "system">[]; system?: System; tone?: StopTone };

/** Stops in the order they are drawn, faint ones under the rest and the focus on top. */
const TONE_ORDER: Record<StopTone, number> = { faint: 0, pass: 1, plain: 2, focus: 3 };
export const stopsInOrder = (stops: MapStop[]) => [...stops].sort((a, b) => TONE_ORDER[a.tone ?? "plain"] - TONE_ORDER[b.tone ?? "plain"]);

type Expression = unknown[];

/** The stop layer's paint, the same on the phone and the web. */
export function stopPaint(ink: string, background: string): Record<string, Expression> {
  const tone = ["coalesce", ["get", "tone"], "plain"];
  const size = (focus: number, pass: number, faint: number, station: number, stop: number) => ["match", tone, "focus", focus, "pass", pass, "faint", faint, ["case", ["get", "station"], station, stop]];
  return {
    // Zoomed out to a whole route, stops shrink to beads on the line so the buses stay the thing to look at.
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, size(3, 1, 1, 1.6, 1), 13, size(6, 2.5, 2.5, 4, 2.5), 17, size(11, 5, 5, 9, 6)],
    "circle-color": ["match", tone, "focus", ["coalesce", ["get", "color"], ink], background],
    // A faint stop keeps its kind's colour, only quieter, so trunk and feeder stops still read apart.
    "circle-stroke-color": ["match", tone, "focus", ink, "pass", ink, ["coalesce", ["get", "color"], ink]],
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, size(1.5, 0.8, 0.8, 1.2, 0.8), 13, size(3, 2, 1.6, 3, 2)],
    "circle-opacity": ["match", tone, "faint", 0.7, 1],
    "circle-stroke-opacity": ["match", tone, "faint", 0.7, 1],
  };
}

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
  stops?: MapStop[];
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
