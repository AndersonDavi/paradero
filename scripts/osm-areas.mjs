#!/usr/bin/env node
/**
 * Downloads the outlines of a city's neighbourhoods from OpenStreetMap, so the app can say which neighbourhood a
 * place or an address is in by the outline it falls inside, not by the nearest neighbourhood name on the map.
 *
 *   node scripts/osm-areas.mjs barranquilla <out.json>
 *
 * Writes [{ name, rings: [[[lon, lat], ...], ...] }], each outline simplified to a few metres. The outlines are
 * © OpenStreetMap contributors (ODbL); the app already credits OpenStreetMap on every map.
 */
import { writeFileSync } from "node:fs";

const CITIES = {
  // Barranquilla and Soledad map their barrios as administrative areas of level 9 or 10.
  barranquilla: { box: [10.84, -74.95, 11.08, -74.72], levels: "9|10" },
};

const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

const [cityId, out] = process.argv.slice(2);
const city = CITIES[cityId];
if (!city || !out) {
  console.error(`Usage: node scripts/osm-areas.mjs <${Object.keys(CITIES).join("|")}> <out.json>`);
  process.exit(1);
}

const [s, w, n, e] = city.box;
const query = `[out:json][timeout:180];relation["boundary"="administrative"]["admin_level"~"^(${city.levels})$"]["name"](${s},${w},${n},${e});out geom;`;

let body = null;
const attempts = SERVERS.flatMap((server) => [0, 30, 90].map((wait) => ({ server, wait })));
for (const { server, wait } of attempts) {
  if (body) break;
  if (wait) await new Promise((done) => setTimeout(done, wait * 1000));
  try {
    const res = await fetch(server, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "paradero-scripts/1.0 (+https://github.com/croma-labs/paradero)" }, body: `data=${encodeURIComponent(query)}` });
    if (res.ok) {
      body = await res.json();
      break;
    }
    console.error(`${server}: HTTP ${res.status}`);
  } catch (error) {
    console.error(`${server}: ${error.message}`);
  }
}
if (!body) {
  console.error("No Overpass server answered. Try again in a few minutes.");
  process.exit(1);
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/** The outer ways of a relation joined end to end into closed rings. */
function rings(relation) {
  const pieces = relation.members.filter((m) => m.type === "way" && m.role !== "inner" && m.geometry).map((m) => m.geometry.map((p) => [p.lon, p.lat]));
  const done = [];
  while (pieces.length) {
    let ring = pieces.shift();
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        const end = ring[ring.length - 1];
        if (same(end, piece[0])) ring = [...ring, ...piece.slice(1)];
        else if (same(end, piece[piece.length - 1])) ring = [...ring, ...[...piece].reverse().slice(1)];
        else continue;
        pieces.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4) done.push(simplify(ring));
  }
  return done;
}

/** Douglas–Peucker at 6 m: an outline that still puts a corner house in the right barrio. */
function simplify(line) {
  const k = Math.cos((line[0][1] * Math.PI) / 180) * 111_320;
  const xy = line.map(([lon, lat]) => [lon * k, lat * 110_540]);
  const keep = new Array(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let farM = 6;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i];
      const [ax, ay] = xy[a];
      const [bx, by] = xy[b];
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > farM) [far, farM] = [i, d];
    }
    if (far >= 0) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return line.filter((_, i) => keep[i]).map(([lon, lat]) => [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
}

const areas = body.elements
  .filter((el) => el.type === "relation")
  .map((el) => ({ name: el.tags.name.trim(), level: Number(el.tags.admin_level), rings: rings(el) }))
  .filter((a) => a.rings.length)
  // The smaller level wins where both are mapped: a barrio inside a larger locality.
  .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, "es"))
  .map(({ name, rings }) => ({ name, rings }));

writeFileSync(out, JSON.stringify(areas));
console.log(`${cityId}: ${areas.length} neighbourhoods, ${areas.reduce((sum, a) => sum + a.rings.reduce((k, r) => k + r.length, 0), 0)} points`);
