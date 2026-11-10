import type { Bus, Stop, System } from "@/transit/types";

export interface MapHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  fit: (coords: [number, number][]) => void;
}

export interface TransitMapProps {
  center: { lat: number; lon: number };
  zoom?: number;
  stops?: Pick<Stop, "id" | "name" | "kind" | "lat" | "lon">[];
  buses?: (Bus & { system?: System; code?: string })[];
  path?: [number, number][];
  /** The stretch of the path still to be driven to the stop; drawn strong, with the rest of the path faint. */
  approach?: [number, number][];
  /** Draw each bus's route code beside it, for maps that hold more than one route. */
  showCodes?: boolean;
  /** The bus the rider is following: drawn larger, above the rest. */
  focusBusId?: string | null;
  system?: System;
  showUser?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
  onStopPress?: (id: string) => void;
}
