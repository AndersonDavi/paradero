#!/usr/bin/env node
/**
 * Downloads the streets a rider can walk from OpenStreetMap and keeps them as a small graph, so the phone can
 * draw a walk along the streets, time it by the streets, and find an address ("Calle 45D # 1F-32") at the corner
 * of its two streets, all without sending anything anywhere.
 *
 *   node scripts/osm-streets.mjs barranquilla public/cities/barranquilla-streets.json
 *
 * The file holds the corners and dead ends (vertices), the stretches of street between them (edges) with their
 * length and street name, and each stretch's bends as an encoded polyline. Only the largest connected network is
 * kept, so a walk never starts on an island it cannot leave. © OpenStreetMap contributors (ODbL).
 */
import { writeFileSync } from "node:fs";

const CITIES = {
  barranquilla: { box: [10.84, -74.95, 11.08, -74.72] },
};

const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const WALKABLE = "trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|pedestrian|footway|path|steps";

const [cityId, out] = process.argv.slice(2);
const city = CITIES[cityId];
if (!city || !out) {
  console.error(`Usage: node scripts/osm-streets.mjs <${Object.keys(CITIES).join("|")}> <out.json>`);
  process.exit(1);
}

const [s, w, n, e] = city.box;
const query = `[out:json][timeout:180];way["highway"~"^(${WALKABLE})$"]["access"!~"^(private|no)$"]["foot"!="no"](${s},${w},${n},${e});out body;>;out skel qt;`;

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

const nodes = new Map();
const ways = [];
for (const el of body.elements) {
  if (el.type === "node") nodes.set(el.id, [el.lat, el.lon]);
  else if (el.type === "way") ways.push(el);
}

// A node is a vertex where a walk can turn: where ways meet, and where a way ends.
const uses = new Map();
for (const way of ways) for (const id of way.nodes) uses.set(id, (uses.get(id) ?? 0) + 1);
const isVertex = (way, i) => i === 0 || i === way.nodes.length - 1 || uses.get(way.nodes[i]) > 1;

const metres = (a, b) => Math.hypot((a[0] - b[0]) * 110_540, (a[1] - b[1]) * 111_320 * Math.cos((a[0] * Math.PI) / 180));

const vertexOf = new Map();
const vertices = [];
const vertex = (id) => {
  if (!vertexOf.has(id)) {
    vertexOf.set(id, vertices.length);
    vertices.push(nodes.get(id));
  }
  return vertexOf.get(id);
};

const names = [""];
const nameOf = new Map([["", 0]]);
const name = (text) => {
  const key = (text ?? "").trim();
  if (!nameOf.has(key)) {
    nameOf.set(key, names.length);
    names.push(key);
  }
  return nameOf.get(key);
};

// Other names a stretch goes by ("Avenida Murillo" is also "Calle 45" along part of it), so an address can find
// it by either. Kept per stretch: a long avenue takes a different number in each neighbourhood.
const NUMBERED = /^(avenida\s+)?(calle|carrera|diagonal|transversal)\s+\d/i;

let edges = [];
for (const way of ways) {
  if (way.nodes.some((id) => !nodes.has(id))) continue;
  const label = name(way.tags?.name);
  const others = ["alt_name", "official_name", "old_name", "loc_name", "short_name"]
    .flatMap((key) => (way.tags?.[key] ?? "").split(";"))
    .map((text) => text.trim())
    .filter((text) => NUMBERED.test(text) && text !== way.tags?.name)
    .map((text) => name(text.replace(/oneway=.*$/, "").trim()));
  let from = 0;
  for (let i = 1; i < way.nodes.length; i++) {
    if (!isVertex(way, i)) continue;
    const line = way.nodes.slice(from, i + 1).map((id) => nodes.get(id));
    let length = 0;
    for (let k = 1; k < line.length; k++) length += metres(line[k - 1], line[k]);
    const u = vertex(way.nodes[from]);
    const v = vertex(way.nodes[i]);
    if (u !== v) edges.push({ u, v, length, name: label, others, bends: simplify(line).slice(1, -1) });
    from = i;
  }
}

// Only the largest network: the rest are islands (a footway in a park, a street cut off by the box).
const parent = vertices.map((_, i) => i);
const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
for (const { u, v } of edges) parent[find(u)] = find(v);
const size = new Map();
vertices.forEach((_, i) => size.set(find(i), (size.get(find(i)) ?? 0) + 1));
const main = [...size.entries()].sort((a, b) => b[1] - a[1])[0][0];
const keep = vertices.map((_, i) => find(i) === main);

// Vertices in a grid order, so neighbours sit close in the list and the edges' indexes stay short.
const order = vertices
  .map((p, i) => ({ p, i }))
  .filter(({ i }) => keep[i])
  .sort((a, b) => Math.floor(a.p[0] * 200) - Math.floor(b.p[0] * 200) || a.p[1] - b.p[1]);
const renumber = new Map(order.map(({ i }, k) => [i, k]));
edges = edges.filter((e) => keep[e.u]).map((e) => ({ ...e, u: renumber.get(e.u), v: renumber.get(e.v) }));
edges.sort((a, b) => a.u - b.u || a.v - b.v);

/** Douglas–Peucker at 3 m: a walk's bends without every point the mapper clicked. */
function simplify(line) {
  if (line.length < 3) return line;
  const keepPoint = new Array(line.length).fill(false);
  keepPoint[0] = keepPoint[line.length - 1] = true;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let farM = 3;
    for (let i = a + 1; i < b; i++) {
      const d = offLine(line[i], line[a], line[b]);
      if (d > farM) [far, farM] = [i, d];
    }
    if (far >= 0) {
      keepPoint[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return line.filter((_, i) => keepPoint[i]);
}

function offLine(p, a, b) {
  const k = Math.cos((a[0] * Math.PI) / 180) * 111_320;
  const [px, py, ax, ay, bx, by] = [p[1] * k, p[0] * 110_540, a[1] * k, a[0] * 110_540, b[1] * k, b[0] * 110_540];
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Google's encoded polyline, 5 decimals, lat before lon. */
function encode(points) {
  let out = "";
  let [lastLat, lastLon] = [0, 0];
  const put = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };
  for (const [lat, lon] of points) {
    const [la, lo] = [Math.round(lat * 1e5), Math.round(lon * 1e5)];
    put(la - lastLat);
    put(lo - lastLon);
    [lastLat, lastLon] = [la, lo];
  }
  return out;
}

const data = {
  version: 1,
  source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright", license: "ODbL" },
  names,
  // Every vertex, in order, as one encoded polyline.
  vertices: encode(order.map(({ p }) => p)),
  // For each edge: the gap from the previous edge's first vertex, the second vertex relative to the first,
  // its length in metres, and its street name's index. Small numbers keep the file small.
  edges: edges.flatMap((e, i) => [e.u - (i ? edges[i - 1].u : 0), e.v - e.u, Math.round(e.length), e.name]),
  // Numbered names some stretches also go by: pairs of edge index and name index.
  aka: edges.flatMap((e, i) => e.others.flatMap((other) => [i, other])),
  // The bends of each edge, from its first vertex towards its second, or "" when it runs straight.
  bends: edges.map((e) => (e.bends.length ? encode(e.bends) : "")),
};

const json = JSON.stringify(data);
writeFileSync(out, json);
console.log(`${cityId}: ${order.length} vertices, ${edges.length} edges, ${names.length} street names, ${edges.filter((e) => e.others.length).length} stretches with other names, ${(json.length / 1024).toFixed(0)} KB (largest network: ${size.get(main)} of ${vertices.length} vertices)`);
