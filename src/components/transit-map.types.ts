import type { Bus, Stop, System } from "@/transit/types";

export interface MapHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  fit: (coords: [number, number][]) => void;
}

export interface TransitMapProps {
  center: { lat: number; lon: number };
  zoom?: number;
  stops?: Pick<Stop, "id" | "name" | "kind" | "lat" | "lon">[];
  buses?: (Bus & { system?: System })[];
  path?: [number, number][];
  system?: System;
  showUser?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
  onStopPress?: (id: string) => void;
}
