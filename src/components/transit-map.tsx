import { Camera, GeoJSONSource, Layer, Map, UserLocation, type CameraRef } from "@maplibre/maplibre-react-native";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";

import { usePalette } from "@/theme/colors";

import type { MapHandle, TransitMapProps } from "./transit-map.types";

const STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const points = <T extends { lat: number; lon: number }>(items: T[], props: (item: T) => Record<string, unknown>): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: items.map((item) => ({ type: "Feature", geometry: { type: "Point", coordinates: [item.lon, item.lat] }, properties: props(item) })),
});

export const TransitMap = forwardRef<MapHandle, TransitMapProps>(function TransitMap(
  { center, zoom = 15, stops = [], buses = [], path, system = "other", showUser = true, padding, onStopPress },
  ref,
) {
  const p = usePalette();
  const camera = useRef<CameraRef>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lon, z = 16) => camera.current?.flyTo({ center: [lon, lat], zoom: z, duration: 700 }),
    fit: (coords) => {
      if (coords.length < 2) return;
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      camera.current?.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], { padding: padding ?? { top: 60, right: 40, bottom: 320, left: 40 }, duration: 700 });
    },
  }));

  const stopData = useMemo(() => points(stops, (s) => ({ id: s.id, name: s.name, station: s.kind === "station" })), [stops]);
  const line = p.ink;
  const busData = useMemo(() => points(buses, (b) => ({ id: b.id })), [buses]);
  const ink = p.ink;

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={p.dark ? STYLES.dark : STYLES.light}
      logo={false}
      tintColor={p.faint}
      attributionPosition={{ bottom: 8, left: 8 }}
      compass={false}
      touchPitch={false}
      contentInset={padding}>
      <Camera ref={camera} initialViewState={{ center: [center.lon, center.lat], zoom }} minZoom={10} maxBounds={[-74.45, 4.3, -73.85, 4.95]} />

      {path && path.length > 1 && (
        <GeoJSONSource id="path" data={{ type: "Feature", geometry: { type: "LineString", coordinates: path }, properties: {} }}>
          <Layer id="path-casing" type="line" layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": p.background, "line-width": 9 }} />
          <Layer id="path-line" type="line" layout={{ "line-cap": "round", "line-join": "round" }} paint={{ "line-color": line, "line-width": 4.5 }} />
        </GeoJSONSource>
      )}

      <GeoJSONSource
        id="stops"
        data={stopData}
        hitbox={{ top: 22, right: 22, bottom: 22, left: 22 }}
        onPress={(e) => {
          const id = e.nativeEvent.features[0]?.properties?.id;
          if (typeof id === "string") onStopPress?.(id);
        }}>
        <Layer
          id="stops-dot"
          type="circle"
          paint={{
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, ["case", ["get", "station"], 4, 2.5], 17, ["case", ["get", "station"], 9, 6]],
            "circle-color": p.background,
            "circle-stroke-color": ink,
            "circle-stroke-width": ["case", ["get", "station"], 3, 2],
          }}
        />
      </GeoJSONSource>

      {buses.length > 0 && (
        <GeoJSONSource id="buses" data={busData}>
          <Layer id="buses-halo" type="circle" paint={{ "circle-radius": 11, "circle-color": line, "circle-opacity": 0.14 }} />
          <Layer id="buses-dot" type="circle" paint={{ "circle-radius": 5.5, "circle-color": line, "circle-stroke-color": p.background, "circle-stroke-width": 2 }} />
        </GeoJSONSource>
      )}

      {showUser && <UserLocation animated accuracy />}
    </Map>
  );
});
