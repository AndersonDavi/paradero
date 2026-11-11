import { Camera, GeoJSONSource, Images, Layer, Map, UserLocation, type CameraRef } from "@maplibre/maplibre-react-native";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { mapBounds } from "@/cities";
import { useAccessibility } from "@/lib/accessibility";
import { useMovingBuses } from "@/lib/moving-buses";
import { systems, usePalette } from "@/theme/colors";
import { space } from "@/theme/tokens";

import { Text } from "./text";
import { MAP_CREDIT, tripData, WALK_DASH, type MapHandle, type TransitMapProps, type TripLeg } from "./transit-map.types";

const STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

/** Room left around what is framed on a map that sits above its sheet: clear of the header buttons, and wide enough that a bus at the edge is drawn whole. */
const FIT_MARGIN = { top: 76, right: 56, bottom: 88, left: 56 };
/** With no inset given, the frame itself has to leave room for a sheet over the lower map. */
const FIT_UNDER_SHEET = { top: 60, right: 40, bottom: 320, left: 40 };

/** A small bus seen from above in each system's colour, turned the way it runs. */
const BUS_IMAGES = {
  "bus-troncal": require("@/assets/images/map/bus-troncal.png"),
  "bus-dual": require("@/assets/images/map/bus-dual.png"),
  "bus-zonal_urbano": require("@/assets/images/map/bus-zonal_urbano.png"),
  "bus-alimentador": require("@/assets/images/map/bus-alimentador.png"),
  "bus-zonal_complementario": require("@/assets/images/map/bus-zonal_complementario.png"),
  "bus-zonal_especial": require("@/assets/images/map/bus-zonal_especial.png"),
  "bus-transmicable": require("@/assets/images/map/bus-transmicable.png"),
  "bus-other": require("@/assets/images/map/bus-other.png"),
};

const BUS_IMAGES_BY_SYSTEM = new Set(Object.keys(systems));

const points = <T extends { lat: number; lon: number }>(items: T[], props: (item: T) => Record<string, unknown>): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: items.map((item) => ({ type: "Feature", geometry: { type: "Point", coordinates: [item.lon, item.lat] }, properties: props(item) })),
});

export const TransitMap = forwardRef<MapHandle, TransitMapProps>(function TransitMap(
  { center, zoom = 15, stops = [], buses = [], path, approach, legs, system = "other", showUser = true, showCodes = false, focusBusId = null, padding, onStopPress },
  ref,
) {
  const p = usePalette();
  const { reduceMotion } = useAccessibility();
  const glide = reduceMotion ? 0 : 700;
  const camera = useRef<CameraRef>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lon, z = 16) => camera.current?.flyTo({ center: [lon, lat], zoom: z, duration: glide }),
    fit: (coords) => {
      if (coords.length < 2) return;
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      camera.current?.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], { padding: padding ? FIT_MARGIN : FIT_UNDER_SHEET, duration: glide });
    },
  }));

  const stopData = useMemo(() => points(stops, (s) => ({ id: s.id, name: s.name, station: s.kind === "station" })), [stops]);
  const ink = p.ink;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Map style={StyleSheet.absoluteFill} mapStyle={p.dark ? STYLES.dark : STYLES.light} logo={false} attribution={false} compass={false} touchPitch={false} contentInset={padding}>
        <Camera ref={camera} initialViewState={{ center: [center.lon, center.lat], zoom }} minZoom={10} maxBounds={mapBounds()} />

        {path && path.length > 1 && <RouteLine path={path} quiet={!!approach} />}
        {approach && approach.length > 1 && <Approach key={focusBusId ?? "none"} path={approach} still={reduceMotion} />}
        {legs && legs.length > 0 && <Trip legs={legs} />}

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
              // Zoomed out to a whole route, stops shrink to beads on the line so the buses stay the thing to look at.
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, ["case", ["get", "station"], 1.6, 1], 13, ["case", ["get", "station"], 4, 2.5], 17, ["case", ["get", "station"], 9, 6]],
              "circle-color": p.background,
              "circle-stroke-color": ink,
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, ["case", ["get", "station"], 1.2, 0.8], 13, ["case", ["get", "station"], 3, 2]],
            }}
          />
        </GeoJSONSource>

        <Images images={BUS_IMAGES} />
        {buses.length > 0 && <MovingBuses buses={buses} path={path} still={reduceMotion} showCodes={showCodes} focusBusId={focusBusId} />}

        {showUser && <UserLocation animated={!reduceMotion} accuracy />}
      </Map>
      <View pointerEvents="none" style={[styles.credit, { left: (padding?.left ?? 0) + space[3], bottom: (padding?.bottom ?? 0) + space[2] }]}>
        <Text variant="micro" tone="faint">
          {MAP_CREDIT}
        </Text>
      </View>
    </View>
  );
});

type ZoomWidth = ["interpolate", ["linear"], ["zoom"], number, number, number, number];
const LINE_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 1.25, 16, 3];
const CASING_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 6];
const ROUND = { "line-cap": "round", "line-join": "round" } as const;
/** The line is drawn under the stops, and so under the buses: a bus rides on its line. */
const UNDER = "stops-dot";

/** The way a route runs. It stays ink and quiet, colour is for the buses on it; with a way in drawn over it, it steps back. */
function RouteLine({ path, quiet }: { path: [number, number][]; quiet: boolean }) {
  const p = usePalette();
  return (
    <GeoJSONSource id="path" data={{ type: "Feature", geometry: { type: "LineString", coordinates: path }, properties: {} }}>
      {!quiet && (
        <Layer
          id="path-glow"
          type="line"
          beforeId={UNDER}
          layout={ROUND}
          paint={{ "line-color": p.ink, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 14], "line-opacity": p.dark ? 0.16 : 0.08, "line-blur": 5 }}
        />
      )}
      <Layer id="path-casing" type="line" beforeId={UNDER} layout={ROUND} paint={{ "line-color": p.background, "line-width": CASING_WIDTH, "line-opacity": quiet ? 0 : 0.9 }} />
      <Layer id="path-line" type="line" beforeId={UNDER} layout={ROUND} paint={{ "line-color": p.ink, "line-width": LINE_WIDTH, "line-opacity": quiet ? 0.16 : 1 }} />
    </GeoJSONSource>
  );
}

const WALK_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 5];

/** A trip: the buses as solid lines along their routes, the walks between them as dots. */
function Trip({ legs }: { legs: TripLeg[] }) {
  const p = usePalette();
  const data = useMemo(() => tripData(legs), [legs]);
  return (
    <GeoJSONSource id="trip" data={data}>
      <Layer id="trip-casing" type="line" beforeId={UNDER} filter={["==", ["get", "kind"], "ride"]} layout={ROUND} paint={{ "line-color": p.background, "line-width": CASING_WIDTH, "line-opacity": 0.9 }} />
      <Layer id="trip-ride" type="line" beforeId={UNDER} filter={["==", ["get", "kind"], "ride"]} layout={ROUND} paint={{ "line-color": p.ink, "line-width": LINE_WIDTH }} />
      <Layer id="trip-walk" type="line" beforeId={UNDER} filter={["==", ["get", "kind"], "walk"]} layout={ROUND} paint={{ "line-color": p.ink, "line-width": WALK_WIDTH, "line-dasharray": WALK_DASH }} />
    </GeoJSONSource>
  );
}

const FILL_MS = 1_600;
const FILL_HOLD_MS = 900;
/** The line fills in twice to catch the eye, then stays as it is. */
const FILL_TIMES = 2;
const FILL_FRAME_MS = 50;
/** How soft the leading edge of the fill is, as a share of the line. */
const FILL_EDGE = 0.1;

/** The stretch a bus still has to drive to the stop. On appearing it fills in from the bus to the stop, the way the bus will come. */
function Approach({ path, still }: { path: [number, number][]; still: boolean }) {
  const p = usePalette();
  const [at, setAt] = useState<number | null>(null);

  useEffect(() => {
    if (still) return;
    const began = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - began;
      const k = (elapsed % (FILL_MS + FILL_HOLD_MS)) / FILL_MS;
      const done = elapsed >= FILL_TIMES * (FILL_MS + FILL_HOLD_MS);
      setAt(k < 1 && !done ? (1 + FILL_EDGE) * (1 - (1 - k) ** 2) - FILL_EDGE : null);
      if (done) clearInterval(timer);
    }, FILL_FRAME_MS);
    return () => clearInterval(timer);
  }, [still]);

  const lit = still ? null : at;
  return (
    <GeoJSONSource id="approach" lineMetrics data={{ type: "Feature", geometry: { type: "LineString", coordinates: path }, properties: {} }}>
      <Layer
        id="approach-glow"
        type="line"
        beforeId={UNDER}
        layout={ROUND}
        paint={{ "line-color": p.ink, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 14], "line-opacity": p.dark ? 0.16 : 0.08, "line-blur": 5 }}
      />
      <Layer id="approach-casing" type="line" beforeId={UNDER} layout={ROUND} paint={{ "line-color": p.background, "line-width": CASING_WIDTH, "line-opacity": 0.9 }} />
      <Layer
        id="approach-line"
        type="line"
        beforeId={UNDER}
        layout={ROUND}
        paint={{
          "line-color": p.ink,
          "line-width": LINE_WIDTH,
          "line-gradient": ["interpolate", ["linear"], ["-", ["line-progress"], lit ?? 2], 0, p.ink, FILL_EDGE, p.faint],
        }}
      />
    </GeoJSONSource>
  );
}

/** The buses, each drawn as a small bus turned the way it runs, moving between reports. */
function MovingBuses({
  buses,
  path,
  still,
  showCodes,
  focusBusId,
}: {
  buses: NonNullable<TransitMapProps["buses"]>;
  path?: [number, number][];
  still: boolean;
  showCodes: boolean;
  focusBusId: string | null;
}) {
  const p = usePalette();
  const fixes = useMemo(() => buses.map((b) => ({ id: b.id, lat: b.lat, lon: b.lon, reportedAt: b.reportedAt, code: b.code, system: b.system, onItsWay: b.id === focusBusId })), [buses, focusBusId]);
  const moving = useMovingBuses(fixes, path, still);
  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: moving.map((b) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: b.at },
      properties: { id: b.id, bearing: b.bearing, code: b.code ?? "", icon: `bus-${b.system && BUS_IMAGES_BY_SYSTEM.has(b.system) ? b.system : "other"}`, focus: b.id === focusBusId ? 1 : 0 },
    })),
  };
  return (
    <GeoJSONSource id="buses" data={data}>
      <Layer
        id="buses-halo"
        type="circle"
        filter={["==", ["get", "focus"], 1]}
        paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 14, 16, 26], "circle-color": p.ink, "circle-opacity": p.dark ? 0.2 : 0.1, "circle-blur": 0.5 }}
      />
      <Layer
        id="buses-icon"
        type="symbol"
        layout={{
          "icon-image": ["get", "icon"],
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 11, ["case", ["==", ["get", "focus"], 1], 0.6, 0.45], 16, ["case", ["==", ["get", "focus"], 1], 1.5, 1.1]],
          "symbol-sort-key": ["get", "focus"],
        }}
      />
      {showCodes && (
        <Layer
          id="buses-code"
          type="symbol"
          minzoom={13}
          layout={{
            "text-field": ["get", "code"],
            "text-font": ["Open Sans Bold"],
            "text-size": ["case", ["==", ["get", "focus"], 1], 12, 10],
            "text-offset": [0, 2.2],
            "text-anchor": "top",
            "text-allow-overlap": false,
            "text-optional": true,
          }}
          paint={{ "text-color": p.text, "text-halo-color": p.background, "text-halo-width": 1.6 }}
        />
      )}
    </GeoJSONSource>
  );
}

const styles = StyleSheet.create({
  credit: { position: "absolute" },
});
