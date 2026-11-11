#!/usr/bin/env node
/**
 * Turns a city's GTFS into the compact file the app downloads for a city it reads on the phone
 * (src/cities/local.ts). Trips that run the same stops with the same times between them become one
 * pattern with a list of departures, which keeps a whole city's timetable to a few hundred kilobytes.
 *
 *   node scripts/gtfs-to-city.mjs <city> <folder with the GTFS .txt files> public/cities/<city>.json [osm lines] [osm places] [newer stops] [osm areas]
 *
 * Platforms that belong to a station are folded into the station, as riders name them. When the GTFS has no
 * shapes, pass the route lines from scripts/osm-route-lines.mjs: each pattern is then drawn along the streets
 * of the OpenStreetMap route that fits its stops best, cut from its first stop to its last. A pattern that no
 * line fits is drawn stop to stop.
 *
 * A city can also pass a newer list of each route's stops in order, without times (for Barranquilla,
 * Transmetro's "Paraderos del Sistema" on datos.gov.co, 2020). Routes the timetable lacks are added from it with
 * their stops and no departures, so riders find them and see where they go, marked as having no timetable.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CITIES = {
  barranquilla: {
    source: {
      name: "ColombiaGTFS, Barranquilla - Transmetro",
      url: "https://github.com/ColombiaInfo/ColombiaGTFS",
      license: "CC BY-SA 4.0",
    },
    // Transmetro: the A and U routes feed the trunk from the neighbourhoods; R, S and B run on the trunk.
    system: (code) => (/^[AU]/.test(code) ? "alimentador" : /^[RSB]/.test(code) ? "troncal" : "other"),
    newer: {
      name: "Transmetro, Paraderos del Sistema (datos.gov.co, 2020)",
      url: "https://www.datos.gov.co/d/hxy3-94yh",
      license: "Datos abiertos del Gobierno de Colombia",
      // Routes whose code is a name in that list, by the code riders see on the bus.
      codes: { Gran: "GM" },
    },
    // Weekday, Saturday and Sunday timetables, as the feed names them.
    services: { H: "weekday", S: "saturday", D: "sunday" },
  },
};

const [cityId, folder, out, osmFile, placesFile, newerFile, areasFile] = process.argv.slice(2);
const city = CITIES[cityId];
if (!city || !folder || !out) {
  console.error(`Usage: node scripts/gtfs-to-city.mjs <${Object.keys(CITIES).join("|")}> <gtfs folder> <out.json>`);
  process.exit(1);
}

/** GTFS is CSV with quoted fields that may hold commas. */
function table(name) {
  const text = readFileSync(join(folder, `${name}.txt`), "utf8").replace(/^﻿/, "");
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') (cell += '"'), i++;
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") cells.push(cell), (cell = "");
      else cell += c;
    }
    cells.push(cell);
    rows.push(cells);
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const minutes = (hms) => {
  const [h, m] = hms.split(":").map(Number);
  return h * 60 + m;
};
const round = (n) => Math.round(Number(n) * 1e6) / 1e6;

const rawStops = table("stops");
const parentOf = new Map(rawStops.filter((s) => s.parent_station).map((s) => [s.stop_id, s.parent_station]));
const own = (id) => parentOf.get(id) ?? id;

const stops = [];
const stopIndex = new Map();
for (const s of rawStops) {
  if (s.parent_station) continue;
  stopIndex.set(s.stop_id, stops.length);
  stops.push([s.stop_id, s.stop_name, round(s.stop_lat), round(s.stop_lon), s.location_type === "1" ? 1 : 0, s.wheelchair_boarding === "1" ? 1 : 0]);
}

const routes = [];
const routeIndex = new Map();
for (const r of table("routes")) {
  const code = r.route_short_name || r.route_id;
  routeIndex.set(r.route_id, routes.length);
  routes.push([r.route_id, code, r.route_long_name || code, city.system(code)]);
}

const tripOf = new Map(table("trips").map((t) => [t.trip_id, t]));
const timesByTrip = new Map();
for (const st of table("stop_times")) {
  const list = timesByTrip.get(st.trip_id) ?? [];
  list.push(st);
  timesByTrip.set(st.trip_id, list);
}

const patterns = new Map();
let skipped = 0;
for (const [tripId, list] of timesByTrip) {
  const trip = tripOf.get(tripId);
  const service = trip && city.services[trip.service_id];
  if (!trip || !service || !routeIndex.has(trip.route_id)) {
    skipped++;
    continue;
  }
  list.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  const seq = [];
  const at = [];
  for (const st of list) {
    const stop = stopIndex.get(own(st.stop_id));
    const time = st.departure_time || st.arrival_time;
    if (stop === undefined || !time) continue;
    if (seq[seq.length - 1] === stop) continue;
    seq.push(stop);
    at.push(minutes(time));
  }
  if (seq.length < 2) {
    skipped++;
    continue;
  }
  const start = at[0];
  const offsets = at.map((t) => t - start);
  const key = `${trip.route_id}|${seq.join(",")}|${offsets.join(",")}`;
  const pattern = patterns.get(key) ?? { route: routeIndex.get(trip.route_id), stops: seq, offsets, departures: {} };
  (pattern.departures[service] ??= []).push(start);
  patterns.set(key, pattern);
}

// ---- Routes from a newer list of stops, without times ----

let added = 0;
if (newerFile && city.newer) {
  const rows = JSON.parse(readFileSync(newerFile, "utf8"));
  const known = new Set(routes.map((r) => r[1]));
  const byRoute = new Map();
  for (const row of rows) {
    const list = byRoute.get(row.nombre_ruta) ?? [];
    list.push(row);
    byRoute.set(row.nombre_ruta, list);
  }
  const plain = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const far = (a, b) => Math.hypot((a[0] - b[0]) * 110_540, (a[1] - b[1]) * 111_320 * Math.cos((a[0] * Math.PI) / 180));
  /** The timetable's own stop when this one is it: the same name close by, or any stop a few metres away. */
  const stopFor = (row, newId) => {
    const at = [Number(row.coordenada_y), Number(row.coordenada_x)];
    const name = plain(row.nombre_parada);
    let best = -1;
    let bestM = Infinity;
    stops.forEach((s, i) => {
      const m = far(at, [s[2], s[3]]);
      const fits = (plain(s[1]) === name && m < 150) || m < 25;
      if (fits && m < bestM) [best, bestM] = [i, m];
    });
    if (best >= 0) return best;
    stops.push([newId, row.nombre_parada.trim(), round(at[0]), round(at[1]), 0, 0]);
    stopIndex.set(newId, stops.length - 1);
    return stops.length - 1;
  };
  for (const [name, list] of byRoute) {
    const first = name.split(" ")[0];
    const code = city.newer.codes[first] ?? first;
    if (known.has(code)) continue;
    list.sort((a, b) => Number(a.secuencia_parada) - Number(b.secuencia_parada));
    const id = `newer-${code}`;
    routeIndex.set(id, routes.length);
    // "A1-2 Carrera 8" is code and name; a route listed only by its name ("Gran Malecon") keeps the whole name.
    const label = code === first ? name.slice(first.length).trim() : name;
    routes.push([id, code, label || code, city.system(code)]);
    known.add(code);
    const seq = list.map((row) => stopFor(row, `newer-${code}-${row.secuencia_parada}`)).filter((s, i, all) => i === 0 || all[i - 1] !== s);
    // No times: offsets are a guess from the distance at a bus's pace, and there are no departures to plan with.
    const offsets = [0];
    for (let i = 1; i < seq.length; i++) {
      const [a, b] = [stops[seq[i - 1]], stops[seq[i]]];
      offsets.push(offsets[i - 1] + Math.max(1, Math.round(far([a[2], a[3]], [b[2], b[3]]) / 300)));
    }
    patterns.set(`${id}|${seq.join(",")}`, { route: routeIndex.get(id), stops: seq, offsets, departures: {} });
    added++;
  }
}

// ---- Drawing patterns along the streets ----

/** Metres on a flat map around the city: plenty for matching stops to a line a few hundred metres away. */
const LAT0 = (stops.reduce((sum, s) => sum + s[2], 0) / stops.length) * (Math.PI / 180);
const xy = ([lon, lat]) => [lon * Math.cos(LAT0) * 111_320, lat * 110_540];

/** A relation's ways joined end to end into one line, turning the ways that were mapped the other way round. */
function assemble(ways) {
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  let line = [...ways[0]];
  for (const way of ways.slice(1)) {
    const end = line[line.length - 1];
    if (same(end, way[0])) line.push(...way.slice(1));
    else if (same(end, way[way.length - 1])) line.push(...[...way].reverse().slice(1));
    else if (line.length === ways[0].length && (same(line[0], way[0]) || same(line[0], way[way.length - 1]))) {
      line = [...line].reverse();
      line.push(...(same(line[line.length - 1], way[0]) ? way.slice(1) : [...way].reverse().slice(1)));
    } else line.push(...way);
  }
  return line;
}

function toSegment(q, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / len)) : 0;
  return { t, dist: Math.hypot(q[0] - (a[0] + t * dx), q[1] - (a[1] + t * dy)) };
}

/** Douglas–Peucker: drops the points a rider could not tell apart on the map. */
function simplify(line, metres) {
  if (line.length < 3) return line;
  const p = line.map(xy);
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let max = metres;
    for (let i = a + 1; i < b; i++) {
      const d = toSegment(p[i], p[a], p[b]).dist;
      if (d > max) (max = d), (far = i);
    }
    if (far > 0) (keep[far] = 1), stack.push([a, far], [far, b]);
  }
  return line.filter((_, i) => keep[i]);
}

/** Where on the line a stop falls: the nearest segment, how far along it, and how far the stop is from it. */
function nearest(line, points, stop) {
  const q = xy(stop);
  let best = { seg: 0, t: 0, dist: Infinity };
  for (let i = 0; i < points.length - 1; i++) {
    const hit = toSegment(q, points[i], points[i + 1]);
    if (hit.dist < best.dist) best = { seg: i, t: hit.t, dist: hit.dist };
  }
  const [a, b] = [line[best.seg], line[best.seg + 1]];
  return { ...best, at: [a[0] + (b[0] - a[0]) * best.t, a[1] + (b[1] - a[1]) * best.t] };
}

/** How far along the line each of its points is, in metres. */
function lengths(points) {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return out;
}

const normalize = (code) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
const osmLines = osmFile
  ? JSON.parse(readFileSync(osmFile, "utf8")).routes.map((r) => {
      const line = simplify(assemble(r.ways), 4);
      const ref = r.ref ?? /\b([A-Z]\d*(?:-\d+)?)\b/.exec(r.name ?? "")?.[1] ?? "";
      const points = line.map(xy);
      return { ref: normalize(ref), line, points, cum: lengths(points) };
    })
  : [];

/** A stop this close to the line is on it. */
const ON_LINE_M = 60;
/** Between two stops the line may wind, but not wander off: at most this many times the straight distance, plus a block. */
const DETOUR = 3;
const DETOUR_EXTRA_M = 300;

/**
 * The pattern drawn stretch by stretch: between two stops that both sit on the line, along the line; anywhere
 * the timetable and the map disagree (a stop that moved, a street the route no longer takes), straight from
 * one stop to the next. Returns the drawing and how many of its stretches follow the streets.
 */
function drawAlong(candidate, reversed, coords) {
  const line = reversed ? [...candidate.line].reverse() : candidate.line;
  const points = reversed ? [...candidate.points].reverse() : candidate.points;
  const cum = lengths(points);
  const total = cum[cum.length - 1];
  const last = points.length - 2;
  const ring = Math.hypot(points[0][0] - points[last + 1][0], points[0][1] - points[last + 1][1]) < 50;
  const stopsXY = coords.map(xy);
  const pos = (h) => cum[h.seg] + h.t * (cum[h.seg + 1] - cum[h.seg]);
  const at = (h) => {
    const [a, b] = [line[h.seg], line[h.seg + 1]];
    return [a[0] + (b[0] - a[0]) * h.t, a[1] + (b[1] - a[1]) * h.t];
  };

  /**
   * The next place the line passes a stop, searching forward from where the bus is. A route often comes back
   * down the same street, so the stop takes the first pass by it, never a later one.
   */
  function ahead(from, q, limit) {
    let found = null;
    for (let step = 0; step <= last; step++) {
      const seg = from.seg + step;
      if (seg > last && !ring) break;
      const s = seg % (last + 1);
      const travelled = seg > last ? total - pos(from) + cum[s] : cum[s] - pos(from);
      if (travelled > limit) break;
      const hit = toSegment(q, points[s], points[s + 1]);
      if (step === 0 && hit.t < from.t) continue;
      if (hit.dist <= ON_LINE_M) {
        if (!found || hit.dist < found.dist) found = { seg: s, t: hit.t, dist: hit.dist, wrapped: seg > last };
      } else if (found) break;
    }
    return found;
  }

  // Where the bus may start: each pass of the line by the first stop.
  const starts = [];
  for (let s = 0; s <= last; s++) {
    const hit = toSegment(stopsXY[0], points[s], points[s + 1]);
    if (hit.dist > ON_LINE_M) continue;
    const prev = starts[starts.length - 1];
    if (prev && prev.seg === s - 1) {
      if (hit.dist < prev.dist) starts[starts.length - 1] = { seg: s, t: hit.t, dist: hit.dist };
    } else starts.push({ seg: s, t: hit.t, dist: hit.dist });
  }

  let best = null;
  for (const start of starts.length ? starts.slice(0, 4) : [null]) {
    const path = [start ? at(start) : coords[0]];
    let here = start;
    let along = 0;
    for (let i = 1; i < coords.length; i++) {
      const straight = Math.hypot(stopsXY[i][0] - stopsXY[i - 1][0], stopsXY[i][1] - stopsXY[i - 1][1]);
      const next = here ? ahead(here, stopsXY[i], DETOUR * straight + DETOUR_EXTRA_M) : null;
      if (next) {
        const inner = next.wrapped ? [...line.slice(here.seg + 1), ...line.slice(1, next.seg + 1)] : line.slice(here.seg + 1, next.seg + 1);
        path.push(...inner, at(next));
        along++;
        here = next;
      } else {
        // Off the line here: straight to the stop, and look for the line again from the stop onwards.
        const again = nearest(line, points, coords[i]);
        path.push(again.dist <= ON_LINE_M ? again.at : coords[i]);
        here = again.dist <= ON_LINE_M ? again : here;
      }
    }
    if (!best || along > best.along) best = { path, along };
  }
  return best;
}

function streetPath(pattern) {
  const coords = pattern.stops.map((i) => [stops[i][3], stops[i][2]]);
  const code = normalize(routes[pattern.route][1]);
  const stretches = coords.length - 1;
  const pick = (lines, share) => {
    let best = null;
    for (const candidate of lines) {
      for (const reversed of [false, true]) {
        const drawn = drawAlong(candidate, reversed, coords);
        if (drawn.along >= share * stretches && (!best || drawn.along > best.along)) best = drawn;
      }
    }
    return best;
  };
  // The route's own line first; another route's line only when it carries nearly the whole pattern.
  const best = pick(osmLines.filter((l) => l.ref === code), 0.5) ?? pick(osmLines, 0.8);
  if (process.env.DEBUG_LINES) console.error(`${routes[pattern.route][1]}: ${best ? `${best.along}/${stretches}` : "none"}`);
  return best?.path ?? null;
}

/** Google's encoded polyline at 5 decimals: a whole route line in a few hundred characters. */
function encode(line) {
  let text = "";
  let prev = [0, 0];
  for (const [lon, lat] of line) {
    const now = [Math.round(lat * 1e5), Math.round(lon * 1e5)];
    for (const k of [0, 1]) {
      let v = now[k] - prev[k];
      v = v < 0 ? ~(v << 1) : v << 1;
      while (v >= 0x20) (text += String.fromCharCode((0x20 | (v & 0x1f)) + 63)), (v >>= 5);
      text += String.fromCharCode(v + 63);
    }
    prev = now;
  }
  return text;
}

const paths = [];
const pathIndex = new Map();
let drawn = 0;
function pathOf(pattern) {
  if (!osmLines.length) return -1;
  const key = `${pattern.route}|${pattern.stops.join(",")}`;
  if (!pathIndex.has(key)) {
    const line = streetPath(pattern);
    pathIndex.set(key, line ? paths.push(encode(line)) - 1 : -1);
  }
  const index = pathIndex.get(key);
  if (index >= 0) drawn++;
  return index;
}

const data = {
  version: 1,
  city: cityId,
  source: city.source,
  newer: added ? { name: city.newer.name, url: city.newer.url, license: city.newer.license } : null,
  lines: osmLines.length ? { name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright", license: "ODbL" } : null,
  validUntil: (() => {
    const ends = table("calendar").map((c) => c.end_date).sort();
    const end = ends[ends.length - 1];
    return end ? `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}` : null;
  })(),
  stops,
  routes,
  patterns: [...patterns.values()].map((p) => [
    p.route,
    p.stops,
    p.offsets,
    Object.fromEntries(Object.entries(p.departures).map(([day, list]) => [day, [...new Set(list)].sort((a, b) => a - b)])),
    pathOf(p),
  ]),
  paths,
  ...placesAndAreas(),
};

/**
 * Places a rider can ask how to get to, from scripts/osm-places.mjs: name, lat, lon, kind, and the neighbourhood
 * it is in (an index into `areas`, or -1), so two supermarkets with the same name can be told apart.
 *
 * `areas` are the neighbourhoods, from scripts/osm-areas.mjs: a name and its outlines as encoded polylines. A place
 * is in the outline that holds it; where OpenStreetMap has no outline, in the nearest neighbourhood by name, which
 * is then an area with no outline.
 */
function placesAndAreas() {
  if (!placesFile) return {};
  const list = JSON.parse(readFileSync(placesFile, "utf8"));
  const outlines = areasFile ? JSON.parse(readFileSync(areasFile, "utf8")) : [];
  const areas = outlines.map((a) => [a.name, ...a.rings.map((ring) => encode(ring.map(([lon, lat]) => [lon, lat])))]);
  const byName = new Map(areas.map((a, i) => [a[0], i]));
  const named = list.filter((p) => p[3] === "neighbourhood");
  const metres = (a, b) => Math.hypot((a[1] - b[1]) * 110_540, (a[2] - b[2]) * 111_320 * Math.cos((a[1] * Math.PI) / 180));
  const inside = (lon, lat, ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const areaOf = (p) => {
    const holder = outlines.findIndex((a) => a.rings.some((ring) => inside(p[2], p[1], ring)));
    if (holder >= 0) return holder;
    let near = null;
    let best = 1200;
    for (const n of named) {
      const d = metres(p, n);
      if (d < best) [best, near] = [d, n[0]];
    }
    if (!near) return -1;
    if (!byName.has(near)) {
      byName.set(near, areas.length);
      areas.push([near]);
    }
    return byName.get(near);
  };
  const places = list.map((p) => [p[0], p[1], p[2], p[3], p[3] === "neighbourhood" ? -1 : areaOf(p)]);
  return { places, areas };
}

const json = JSON.stringify(data);
writeFileSync(out, json);
console.log(`${cityId}: ${stops.length} stops, ${added} routes added without times, ${data.places?.length ?? 0} places, ${routes.length} routes, ${data.patterns.length} patterns from ${timesByTrip.size - skipped} trips (${skipped} skipped), ${drawn} drawn along streets, ${(json.length / 1024).toFixed(0)} KB`);
