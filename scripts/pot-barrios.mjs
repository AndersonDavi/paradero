#!/usr/bin/env node
/**
 * Barranquilla's barrios as the city's own plan draws them (POT, "Barrios de Barranquilla según POT", datos.gov.co
 * qui6-qeux, Alcaldía de Barranquilla, CC BY-SA 4.0), joined with the OpenStreetMap outlines of everything around
 * it that the plan does not cover, such as Soledad. Writes the same shape as scripts/osm-areas.mjs, so
 * scripts/gtfs-to-city.mjs takes it as its areas file.
 *
 *   node scripts/pot-barrios.mjs <pot barrios.geojson> <osm areas.json> <out.json> [osm places.json]
 *
 * The plan writes names in capitals without accents ("SIMON BOLIVAR"): a barrio takes OpenStreetMap's spelling when
 * the two are the same name, and otherwise is written the way a rider reads it ("Las Granjas").
 */
import { readFileSync, writeFileSync } from "node:fs";

const [potFile, osmFile, out, placesFile] = process.argv.slice(2);
if (!potFile || !osmFile || !out) {
  console.error("Usage: node scripts/pot-barrios.mjs <pot barrios.geojson> <osm areas.json> <out.json>");
  process.exit(1);
}

const pot = JSON.parse(readFileSync(potFile, "utf8")).features;
const osm = JSON.parse(readFileSync(osmFile, "utf8"));

const plain = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const SMALL = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);
const titled = (s) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join(" ")
    .replace(/\b(Ii|Iii|Iv|Vi|Vii)\b/g, (r) => r.toUpperCase());
// OpenStreetMap's spelling, from its outlines and, when given, its neighbourhood names (scripts/osm-places.mjs).
const named = placesFile ? JSON.parse(readFileSync(placesFile, "utf8")).filter((p) => p[3] === "neighbourhood").map((p) => p[0]) : [];
const spelled = new Map([...named, ...osm.map((a) => a.name)].map((n) => [plain(n), n]));

/** Douglas–Peucker on a ring, in metres around the city: a few metres is all a barrio's edge needs. */
const LAT0 = Math.cos((10.97 * Math.PI) / 180);
function simplify(ring, metres) {
  if (ring.length < 4) return ring;
  const p = ring.map(([lon, lat]) => [lon * LAT0 * 111_320, lat * 110_540]);
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let max = metres;
    for (let i = a + 1; i < b; i++) {
      const [ax, ay] = p[a];
      const [bx, by] = p[b];
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((p[i][0] - ax) * dx + (p[i][1] - ay) * dy) / len)) : 0;
      const d = Math.hypot(p[i][0] - (ax + t * dx), p[i][1] - (ay + t * dy));
      if (d > max) (max = d), (far = i);
    }
    if (far > 0) (keep[far] = 1), stack.push([a, far], [far, b]);
  }
  return ring.filter((_, i) => keep[i]).map(([lon, lat]) => [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
}

const inside = ([lon, lat], ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

const barrios = pot
  .filter((f) => f.properties.nombre)
  .map((f) => {
    const polygons = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    const name = spelled.get(plain(f.properties.nombre)) ?? titled(f.properties.nombre.trim());
    // Outer rings only: a barrio's holes are other barrios, which have their own outline.
    return { name, rings: polygons.map((poly) => simplify(poly[0], 3)).filter((r) => r.length >= 4) };
  });

// The plan covers the district of Barranquilla: OpenStreetMap's outlines fill in the rest (Soledad, Puerto Colombia).
const potRings = barrios.flatMap((b) => b.rings);
const centre = (ring) => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
const around = osm.filter((a) => !a.rings.some((ring) => potRings.some((r) => inside(centre(ring), r))));

const areas = [...barrios, ...around];
writeFileSync(out, JSON.stringify(areas));
console.log(`${barrios.length} POT barrios, ${around.length} OpenStreetMap outlines around them (of ${osm.length}), ${areas.reduce((n, a) => n + a.rings.reduce((m, r) => m + r.length, 0), 0)} points`);
