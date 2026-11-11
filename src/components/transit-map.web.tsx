// The stylesheet import is typed by expo/types, which expo-env.d.ts only brings in after `expo start`; CI typechecks without it.
/// <reference types="expo/types" />
import "maplibre-gl/dist/maplibre-gl.css";

import { Asset } from "expo-asset";
import type { ExpressionSpecification, GeoJSONSource, LayerSpecification, Map as MapLibreMap, Point } from "maplibre-gl";
import { forwardRef, useContext, useEffect, useEffectEvent, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { mapBounds } from "@/cities";
import { useAccessibility } from "@/lib/accessibility";
import { useLocation } from "@/lib/location";
import { useMovingBuses } from "@/lib/moving-buses";
import { systems, usePalette, type Palette } from "@/theme/colors";
import { space } from "@/theme/tokens";

import { SheetCover } from "./sheet-cover";
import { Text } from "./text";
import { MAP_CREDIT, stopColor, stopPaint, stopsInOrder, tripData, WALK_DASH, type MapHandle, type TransitMapProps } from "./transit-map.types";

/**
 * The same map as the app, drawn in the browser with MapLibre GL JS. It reads the same props and draws the
 * same layers as transit-map.tsx, so a screen looks and behaves alike on the web, iOS and Android.
 */

const STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

/** Room left around what is framed on a map that sits above its sheet: clear of the header buttons, and wide enough that a bus at the edge is drawn whole. */
const FIT_MARGIN = { top: 76, right: 56, bottom: 88, left: 56 };
/** With no inset given, the frame itself has to leave room for a sheet over the lower map. */
const FIT_UNDER_SHEET = { top: 60, right: 40, bottom: 320, left: 40 };
const NO_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

/** A stop is small on screen; a click this close to one still opens it, as a tap does in the app. */
const HITBOX = 22;

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

/** The rider's own position, in the blue every map uses for "you are here". */
const USER_DOT = "#1A73E8";
const USER_RING = "#FFFFFF";

type Collection = GeoJSON.FeatureCollection | GeoJSON.Feature;
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const points = <T extends { lat: number; lon: number }>(items: T[], props: (item: T) => Record<string, unknown>): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: items.map((item) => ({ type: "Feature", geometry: { type: "Point", coordinates: [item.lon, item.lat] }, properties: props(item) })),
});

const line = (coords?: [number, number][]): Collection =>
  coords && coords.length > 1 ? { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} } : EMPTY;

/** Each bus picture at the size that suits this screen, loaded once for every map on the page. */
let busImages: Promise<{ id: string; image: HTMLImageElement; pixelRatio: number }[]> | null = null;
function loadBusImages() {
  busImages ??= Promise.all(
    Object.entries(BUS_IMAGES).map(async ([id, source]) => {
      const asset = Asset.fromModule(source);
      const image = new window.Image();
      image.src = asset.uri;
      await image.decode();
      return { id, image, pixelRatio: asset.width ? image.naturalWidth / asset.width : 1 };
    }),
  ).catch((error: unknown) => {
    busImages = null;
    throw error;
  });
  return busImages;
}

/** What the layers need to be drawn again from scratch: after a change of theme, the base map comes back without them. */
interface Scene {
  p: Palette;
  quiet: boolean;
  showCodes: boolean;
  lit: number | null;
  data: Record<SourceId, Collection>;
}

type SourceId = "path" | "approach" | "trip" | "stops" | "buses" | "user";
const SOURCES: SourceId[] = ["path", "approach", "trip", "stops", "buses", "user"];

type ZoomWidth = ["interpolate", ["linear"], ["zoom"], number, number, number, number];
const LINE_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 1.25, 16, 3];
const CASING_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 6];
const GLOW_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 14];
const WALK_WIDTH: ZoomWidth = ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 5];
const ROUND = { "line-cap": "round", "line-join": "round" } as const;

const FILL_MS = 1_600;
const FILL_HOLD_MS = 900;
/** The line fills in twice to catch the eye, then stays as it is. */
const FILL_TIMES = 2;
const FILL_FRAME_MS = 50;
/** How soft the leading edge of the fill is, as a share of the line. */
const FILL_EDGE = 0.1;

const fill = (p: Palette, lit: number | null): ExpressionSpecification => ["interpolate", ["linear"], ["-", ["line-progress"], lit ?? 2], 0, p.ink, FILL_EDGE, p.faint];

/** Bottom to top, as in the app: the line under the stops, the stops under the buses, and the rider above all. */
function layers({ p, quiet, showCodes, lit }: Scene): LayerSpecification[] {
  const glow = p.dark ? 0.16 : 0.08;
  const focus: ExpressionSpecification = ["==", ["get", "focus"], 1];
  return [
    { id: "path-glow", type: "line", source: "path", layout: ROUND, paint: { "line-color": p.ink, "line-width": GLOW_WIDTH, "line-opacity": quiet ? 0 : glow, "line-blur": 5 } },
    { id: "path-casing", type: "line", source: "path", layout: ROUND, paint: { "line-color": p.background, "line-width": CASING_WIDTH, "line-opacity": quiet ? 0 : 0.9 } },
    { id: "path-line", type: "line", source: "path", layout: ROUND, paint: { "line-color": p.ink, "line-width": LINE_WIDTH, "line-opacity": quiet ? 0.16 : 1 } },
    { id: "approach-glow", type: "line", source: "approach", layout: ROUND, paint: { "line-color": p.ink, "line-width": GLOW_WIDTH, "line-opacity": glow, "line-blur": 5 } },
    { id: "approach-casing", type: "line", source: "approach", layout: ROUND, paint: { "line-color": p.background, "line-width": CASING_WIDTH, "line-opacity": 0.9 } },
    { id: "approach-line", type: "line", source: "approach", layout: ROUND, paint: { "line-color": p.ink, "line-width": LINE_WIDTH, "line-gradient": fill(p, lit) } },
    // A trip: the buses as solid lines along their routes, the walks between them as dots.
    { id: "trip-casing", type: "line", source: "trip", filter: ["==", ["get", "kind"], "ride"], layout: ROUND, paint: { "line-color": p.background, "line-width": CASING_WIDTH, "line-opacity": 0.9 } },
    { id: "trip-ride", type: "line", source: "trip", filter: ["==", ["get", "kind"], "ride"], layout: ROUND, paint: { "line-color": p.ink, "line-width": LINE_WIDTH } },
    { id: "trip-walk", type: "line", source: "trip", filter: ["==", ["get", "kind"], "walk"], layout: ROUND, paint: { "line-color": p.ink, "line-width": WALK_WIDTH, "line-dasharray": WALK_DASH } },
    {
      id: "stops-dot",
      type: "circle",
      source: "stops",
      paint: stopPaint(p.ink, p.background) as never,
    },
    {
      id: "buses-halo",
      type: "circle",
      source: "buses",
      filter: focus,
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 14, 16, 26], "circle-color": p.ink, "circle-opacity": p.dark ? 0.2 : 0.1, "circle-blur": 0.5 },
    },
    {
      id: "buses-icon",
      type: "symbol",
      source: "buses",
      layout: {
        "icon-image": ["get", "icon"],
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 11, ["case", focus, 0.6, 0.45], 16, ["case", focus, 1.5, 1.1]],
        "symbol-sort-key": ["get", "focus"],
      },
    },
    {
      id: "buses-code",
      type: "symbol",
      source: "buses",
      minzoom: 13,
      layout: {
        visibility: showCodes ? "visible" : "none",
        "text-field": ["get", "code"],
        "text-font": ["Open Sans Bold"],
        "text-size": ["case", focus, 12, 10],
        "text-offset": [0, 2.2],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true,
      },
      paint: { "text-color": p.text, "text-halo-color": p.background, "text-halo-width": 1.6 },
    },
    { id: "user-halo", type: "circle", source: "user", paint: { "circle-radius": 14, "circle-color": USER_DOT, "circle-opacity": 0.18 } },
    { id: "user-dot", type: "circle", source: "user", paint: { "circle-radius": 6, "circle-color": USER_DOT, "circle-stroke-color": USER_RING, "circle-stroke-width": 2 } },
  ];
}

/** Puts the transit layers on the base map, replacing any drawn before so they always follow the current scene. */
function install(map: MapLibreMap, scene: Scene) {
  const specs = layers(scene);
  for (const { id } of specs) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of SOURCES) {
    if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: scene.data[id], lineMetrics: id === "approach" });
    else (map.getSource(id) as GeoJSONSource).setData(scene.data[id]);
  }
  for (const spec of specs) map.addLayer(spec);
  void loadBusImages()
    .then((images) => {
      for (const { id, image, pixelRatio } of images) if (!map.hasImage(id)) map.addImage(id, image, { pixelRatio });
    })
    .catch(() => undefined);
}

type Edges = typeof FIT_MARGIN;

/**
 * The framing margins, shrunk on a short map. MapLibre adds them to the inset the screen gave the map, and on a
 * low window the two together can leave a route no room at all, so it is drawn at the widest zoom instead of framed.
 * The margins never take more than half of what the inset leaves.
 */
function roomy(map: MapLibreMap, margin: Edges): Edges {
  const { top = 0, right = 0, bottom = 0, left = 0 } = map.getPadding();
  const inset = { top, right, bottom, left };
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  // The margins give way so the route keeps at least three quarters of what the inset leaves.
  const fit = (size: number, a: number, b: number) => Math.min(1, Math.max(0, size / 4) / Math.max(1, a + b));
  const tall = fit(height - inset.top - inset.bottom, margin.top, margin.bottom);
  const wide = fit(width - inset.left - inset.right, margin.left, margin.right);
  return { top: margin.top * tall, right: margin.right * wide, bottom: margin.bottom * tall, left: margin.left * wide };
}

function setData(map: MapLibreMap | null, id: SourceId, data: Collection) {
  (map?.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}

/** The browser's own "reduce motion" setting; the app reads the phone's through useAccessibility. */
function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  // The page is first drawn on the server, where there is no window to ask.
  const [reduce, setReduce] = useState(() => typeof window !== "undefined" && (window.matchMedia?.(query).matches ?? false));
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const change = () => setReduce(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduce;
}

/** How far the way in has filled, from the bus to the stop; null once it stays drawn whole. */
function useFill(still: boolean, restartOn: string): number | null {
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
  }, [still, restartOn]);
  return still ? null : at;
}

export const TransitMap = forwardRef<MapHandle, TransitMapProps>(function TransitMap(
  { center, zoom = 15, stops = [], buses = [], path, approach, legs, system, showUser = true, showCodes = false, focusBusId = null, padding: own, onStopPress },
  ref,
) {
  // Under a sheet, what it covers is part of the inset: the map frames its route in the part left to see.
  const cover = useContext(SheetCover);
  const padding = useMemo(() => (own ? { ...own, bottom: own.bottom + cover } : undefined), [own, cover]);
  const p = usePalette();
  const { reduceMotion } = useAccessibility();
  const still = usePrefersReducedMotion() || reduceMotion;
  const glide = still ? 0 : 700;
  const { state: location } = useLocation();

  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const stopData = useMemo(() => points(stopsInOrder(stops), (s) => ({ id: s.id, name: s.name, station: s.kind === "station", color: stopColor(s, system), tone: s.tone ?? "plain" })), [stops, system]);
  const pathData = useMemo(() => line(path), [path]);
  const hasApproach = !!approach && approach.length > 1;
  const approachData = useMemo(() => line(approach), [approach]);
  const tripLines = useMemo<Collection>(() => (legs?.length ? tripData(legs) : EMPTY), [legs]);

  const fixes = useMemo(() => buses.map((b) => ({ id: b.id, lat: b.lat, lon: b.lon, reportedAt: b.reportedAt, code: b.code, system: b.system, onItsWay: b.id === focusBusId })), [buses, focusBusId]);
  const moving = useMovingBuses(fixes, path, still);
  const busData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: moving.map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: b.at },
        properties: { id: b.id, bearing: b.bearing, code: b.code ?? "", icon: `bus-${b.system && BUS_IMAGES_BY_SYSTEM.has(b.system) ? b.system : "other"}`, focus: b.id === focusBusId ? 1 : 0 },
      })),
    }),
    [moving, focusBusId],
  );

  const userLat = location.status === "ready" ? location.lat : null;
  const userLon = location.status === "ready" ? location.lon : null;
  const userData = useMemo(() => (showUser && userLat !== null && userLon !== null ? points([{ lat: userLat, lon: userLon }], () => ({})) : EMPTY), [showUser, userLat, userLon]);

  // As in the app, the fill plays each time a way in appears or the rider follows another bus.
  const lit = useFill(still, hasApproach ? (focusBusId ?? "none") : "");
  // usePalette hands back a new object on every render; the layers only need drawing again when a colour they use changes.
  const colours = [p.dark, p.ink, p.background, p.faint, p.text].join("|");

  // The map lives outside React; it reads the latest scene and handlers from here whenever it needs them.
  const scene: Scene = { p, quiet: hasApproach, showCodes, lit, data: { path: pathData, approach: approachData, trip: tripLines, stops: stopData, buses: busData, user: userData } };
  const inset = padding ?? NO_INSET;
  const latest = useRef({ scene, onStopPress, inset });
  useLayoutEffect(() => {
    latest.current = { scene, onStopPress, inset };
  });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let map: MapLibreMap | null = null;
    let resize: ResizeObserver | null = null;
    let gone = false;

    // MapLibre only runs in a browser, and it is large: it loads apart from the page, once a map is on screen.
    void import("maplibre-gl").then((maplibregl) => {
      if (gone) return;
      const m = new maplibregl.Map({
        container: element,
        style: latest.current.scene.p.dark ? STYLES.dark : STYLES.light,
        center: [center.lon, center.lat],
        zoom,
        minZoom: 10,
        maxBounds: mapBounds(),
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      // Screens hide the map from screen readers and list everything on it in the sheet; the canvas stays out of the tab order too.
      m.getCanvas().tabIndex = -1;
      m.on("style.load", () => install(m, latest.current.scene));
      m.setPadding(latest.current.inset);

      const hit = (point: Point) =>
        m.getLayer("stops-dot")
          ? m.queryRenderedFeatures(
              [
                [point.x - HITBOX, point.y - HITBOX],
                [point.x + HITBOX, point.y + HITBOX],
              ],
              { layers: ["stops-dot"] },
            )[0]
          : undefined;
      m.on("click", (e) => {
        const id = hit(e.point)?.properties?.id;
        if (typeof id === "string") latest.current.onStopPress?.(id);
      });
      m.on("mousemove", (e) => {
        m.getCanvas().style.cursor = latest.current.onStopPress && hit(e.point) ? "pointer" : "";
      });

      // The sheet over the map changes its size without the window changing.
      resize = new ResizeObserver(() => m.resize());
      resize.observe(element);
      map = m;
      mapRef.current = m;
      pending.current?.(m);
      pending.current = null;
    });

    return () => {
      gone = true;
      resize?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // The camera starts where the screen first asks; screens give the map a new key to start somewhere else, as in the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light and dark use different base maps; the transit layers come back on top through "style.load".
  const dark = p.dark;
  const firstStyle = useRef(true);
  useEffect(() => {
    if (firstStyle.current) {
      firstStyle.current = false;
      return;
    }
    mapRef.current?.setStyle(dark ? STYLES.dark : STYLES.light, { diff: false });
  }, [dark]);

  // Higher contrast, a way in appearing or leaving, or route codes turned on: same base map, layers drawn again.
  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) install(map, latest.current.scene);
  }, [colours, hasApproach, showCodes]);

  useEffect(() => setData(mapRef.current, "stops", stopData), [stopData]);
  useEffect(() => setData(mapRef.current, "path", pathData), [pathData]);
  useEffect(() => setData(mapRef.current, "approach", approachData), [approachData]);
  useEffect(() => setData(mapRef.current, "trip", tripLines), [tripLines]);
  useEffect(() => setData(mapRef.current, "buses", busData), [busData]);
  useEffect(() => setData(mapRef.current, "user", userData), [userData]);
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("approach-line")) map.setPaintProperty("approach-line", "line-gradient", fill(latest.current.scene.p, lit));
  }, [colours, lit]);

  useEffect(() => {
    mapRef.current?.setPadding({ top: inset.top, right: inset.right, bottom: inset.bottom, left: inset.left });
  }, [inset.top, inset.right, inset.bottom, inset.left]);

  // Screens frame the route as soon as they open, often before MapLibre has loaded; the last such ask waits for the map.
  const pending = useRef<((map: MapLibreMap) => void) | null>(null);

  // What the screen last asked to frame, framed again when the map changes size (the sheet over it moved).
  const framed = useRef<[number, number][] | null>(null);
  const height = useRef(0);
  const frame = (map: MapLibreMap, coords: [number, number][], duration: number) => {
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: roomy(map, padding ? FIT_MARGIN : FIT_UNDER_SHEET), duration, essential: true },
    );
  };
  const resized = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    const map = mapRef.current;
    if (map && height.current && Math.abs(h - height.current) > 1) {
      map.resize();
      if (framed.current) frame(map, framed.current, glide);
    }
    height.current = h;
  };

  // The sheet moved: glide to keep what was framed in the part of the map left to see.
  const reframe = useEffectEvent(() => {
    const map = mapRef.current;
    if (map && framed.current) frame(map, framed.current, glide);
  });
  useEffect(() => reframe(), [cover]);

  useImperativeHandle(ref, () => {
    const camera = (go: (map: MapLibreMap, duration: number) => void) => {
      if (mapRef.current) go(mapRef.current, glide);
      else pending.current = (map) => go(map, 0);
    };
    return {
      flyTo: (lat, lon, z = 16) => {
        framed.current = null;
        camera((map, duration) => {
          if (duration === 0) map.jumpTo({ center: [lon, lat], zoom: z });
          else map.flyTo({ center: [lon, lat], zoom: z, duration, essential: true });
        });
      },
      fit: (coords) => {
        if (coords.length < 2) return;
        framed.current = coords;
        camera((map, duration) => frame(map, coords, duration));
      },
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={resized}>
      <div ref={container} style={canvas} />
      <View pointerEvents="none" style={[styles.credit, { left: inset.left + space[3], bottom: inset.bottom + space[2] }]}>
        <Text variant="micro" tone="faint">
          {MAP_CREDIT}
        </Text>
      </View>
    </View>
  );
});

const canvas = { position: "absolute", inset: 0 } as const;

const styles = StyleSheet.create({
  credit: { position: "absolute" },
});
