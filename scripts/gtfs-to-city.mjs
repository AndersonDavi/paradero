#!/usr/bin/env node
/**
 * Turns a city's GTFS into the compact file the app downloads for a city it reads on the phone
 * (src/cities/local.ts). Trips that run the same stops with the same times between them become one
 * pattern with a list of departures, which keeps a whole city's timetable to a few hundred kilobytes.
 *
 *   node scripts/gtfs-to-city.mjs <city> <folder with the GTFS .txt files> public/cities/<city>.json [osm lines]
 *
 * Platforms that belong to a station are folded into the station, as riders name them. When the GTFS has no
 * shapes, pass the route lines from scripts/osm-route-lines.mjs: each pattern is then drawn along the streets
 * of the OpenStreetMap route that fits its stops best, cut from its first stop to its last. A pattern that no
 * line fits is drawn stop to stop.
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
    // Transmetro: the A and U routes feed the trunk from the neighbourhoods; the rest run on the trunk.
    system: (code) => (/^[AU]/.test(code) ? "alimentador" : "troncal"),
    // Weekday, Saturday and Sunday timetables, as the feed names them.
    services: { H: "weekday", S: "saturday", D: "sunday" },
  },
};

const [cityId, folder, out, osmFile] = process.argv.slice(2);
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
};

const json = JSON.stringify(data);
writeFileSync(out, json);
console.log(`${cityId}: ${stops.length} stops, ${routes.length} routes, ${data.patterns.length} patterns from ${timesByTrip.size - skipped} trips (${skipped} skipped), ${drawn} drawn along streets, ${(json.length / 1024).toFixed(0)} KB`);
