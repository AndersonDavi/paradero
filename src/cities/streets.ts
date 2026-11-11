import type { Point } from "./types";

/**
 * A city's walkable streets, from scripts/osm-streets.mjs, as a graph the phone can search: the walk from one
 * point to another along the streets, how long it is, and where an address ("Calle 45D # 1F-32") is. Everything
 * runs on the phone; nothing about where the rider is or what they type leaves it.
 */

export interface StreetsData {
  version: 1;
  names: string[];
  vertices: string;
  edges: number[];
  bends: string[];
  /** Pairs of edge and name index: other numbered names a stretch goes by. */
  aka?: number[];
}

export interface Address {
  point: Point;
  label: string;
  /** The cross street the address is counted from. */
  street: string;
}

export interface Streets {
  /** Metres walked from `from` to every vertex within `limit`, and how each was reached, for paths. */
  walkFrom(from: Point, limit: number): Walk;
  /** The vertex a point would walk onto, and how far it is. */
  snap(point: Point): { vertex: number; meters: number } | null;
  /** A walk's line from its start to the vertex, as lon/lat, ending at `end` when given. */
  line(walk: Walk, vertex: number, end?: Point): [number, number][];
  /** The point an address names, or null when its streets are not on the map. */
  /**
   * The places an address can be, nearest `near` first. Streets repeat their numbers (Barranquilla and Soledad
   * both have a Calle 30), so one address can name two corners far apart; each is offered.
   */
  addresses(query: string, near?: Point | null): Address[];
}

export interface Walk {
  start: Point;
  origin: number;
  snapM: number;
  dist: Float64Array;
  /** The edge each vertex was reached by, or -1. */
  via: Int32Array;
}

/** Google's encoded polyline, 5 decimals, as lat/lon pairs. */
function decode(text: string): [number, number][] {
  const out: [number, number][] = [];
  let lat = 0;
  let lon = 0;
  let i = 0;
  const next = () => {
    let shift = 0;
    let value = 0;
    let byte: number;
    do {
      byte = text.charCodeAt(i++) - 63;
      value |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  while (i < text.length) {
    lat += next();
    lon += next();
    out.push([lat / 1e5, lon / 1e5]);
  }
  return out;
}

const metres = (aLat: number, aLon: number, bLat: number, bLon: number) => Math.hypot((aLat - bLat) * 110_540, (aLon - bLon) * 111_320 * Math.cos((aLat * Math.PI) / 180));

/** How far a point may be from the nearest street and still walk onto it. */
const SNAP_M = 400;
/** The grid that finds the nearest vertex: cells of about 220 m. */
const CELL = 0.002;

/** A binary heap of vertices by distance, for Dijkstra. */
class Queue {
  private items: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, key: number) {
    const { items, keys } = this;
    let i = items.length;
    items.push(item);
    keys.push(key);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (keys[up] <= key) break;
      items[i] = items[up];
      keys[i] = keys[up];
      i = up;
    }
    items[i] = item;
    keys[i] = key;
  }
  pop(): [number, number] {
    const { items, keys } = this;
    const top: [number, number] = [items[0], keys[0]];
    const item = items.pop()!;
    const key = keys.pop()!;
    if (items.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= items.length) break;
        const r = l + 1;
        const c = r < items.length && keys[r] < keys[l] ? r : l;
        if (keys[c] >= key) break;
        items[i] = items[c];
        keys[i] = keys[c];
        i = c;
      }
      items[i] = item;
      keys[i] = key;
    }
    return top;
  }
}

const TYPES: [RegExp, string][] = [
  [/^(calle|cll?|cl)$/, "calle"],
  [/^(carrera|cra|kra|kr|cr|crr)$/, "carrera"],
  [/^(diagonal|diag|dg)$/, "diagonal"],
  [/^(transversal|transv|tv|tr)$/, "transversal"],
  [/^(avenida|av)$/, "avenida"],
];
const CROSS: Record<string, string[]> = {
  calle: ["carrera", "transversal", "diagonal"],
  diagonal: ["carrera", "transversal"],
  carrera: ["calle", "diagonal", "transversal"],
  transversal: ["calle", "diagonal"],
  avenida: ["calle", "carrera", "diagonal", "transversal"],
};

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/** "Calle 45 D", "Cl. 45D" and "calle 45d" are one street: "calle 45d". Null for a name that is not numbered. */
export function streetKey(name: string): string | null {
  // "Avenida Calle 72" is Calle 72: the avenue says it is a wide one, the rest is its number.
  const m = plain(name)
    .replace(/^(avenida|av\.?)\s+(?=(calle|carrera|diagonal|transversal)\s)/, "")
    .match(/^([a-z]+)\.?\s*(\d+)\s*([a-z])?\s*(bis)?\s*([a-z])?(?:\s|$)/);
  if (!m) return null;
  const type = TYPES.find(([re]) => re.test(m[1]))?.[1];
  return type ? `${type} ${m[2]}${m[3] ?? ""}${m[4] ? "bis" : ""}${m[5] ?? ""}` : null;
}

/** Orders numbered streets as their numbers run: 45 < 45A < 45B < 46. */
const rank = (key: string) => {
  const m = key.match(/(\d+)([a-z]*)/);
  return m ? Number(m[1]) * 100 + (m[2] ? m[2].charCodeAt(0) - 96 : 0) : 0;
};

/**
 * "Calle 45D # 1F-32", "Cl 45D 1F 32", "Calle 30 con Carrera 21": a street, the cross street (its kind may be
 * named), and how many metres from that corner.
 */
const ADDRESS =
  /^\s*(?:avenida\s+|av\.?\s+)?([a-z]+)\.?\s*(\d+\s*[a-z]?(?:\s*bis)?(?:\s*[a-z](?![a-z]))?)\s*(?:#|no\.?|n°|nº|nro\.?|numero|con|x|y)?\s*(?:(?:calle|carrera|cra|kra|kr|cr|cll?|diagonal|dg|transversal|tv)\.?\s*)?(\d+\s*[a-z]?(?:\s*bis)?)\s*(?:-?\s*(\d+))?\s*$/;

export function buildStreets(data: StreetsData): Streets {
  const points = decode(data.vertices);
  const n = points.length;
  const lat = new Float64Array(n);
  const lon = new Float64Array(n);
  points.forEach(([a, b], i) => {
    lat[i] = a;
    lon[i] = b;
  });
  const m = data.edges.length / 4;
  const eu = new Int32Array(m);
  const ev = new Int32Array(m);
  const elen = new Float64Array(m);
  const ename = new Int32Array(m);
  let u = 0;
  for (let i = 0; i < m; i++) {
    u += data.edges[i * 4];
    eu[i] = u;
    ev[i] = u + data.edges[i * 4 + 1];
    elen[i] = Math.max(1, data.edges[i * 4 + 2]);
    ename[i] = data.edges[i * 4 + 3];
  }

  // Each vertex's edges, packed: the edges of vertex v are adj[start[v] .. start[v + 1]).
  const degree = new Int32Array(n + 1);
  for (let i = 0; i < m; i++) {
    degree[eu[i] + 1]++;
    degree[ev[i] + 1]++;
  }
  for (let v = 0; v < n; v++) degree[v + 1] += degree[v];
  const start = degree;
  const fill = start.slice(0, n);
  const adj = new Int32Array(2 * m);
  for (let i = 0; i < m; i++) {
    adj[fill[eu[i]]++] = i;
    adj[fill[ev[i]]++] = i;
  }

  const grid = new Map<string, number[]>();
  const cellOf = (a: number, b: number) => `${Math.floor(a / CELL)}:${Math.floor(b / CELL)}`;
  for (let v = 0; v < n; v++) {
    const key = cellOf(lat[v], lon[v]);
    const list = grid.get(key);
    if (list) list.push(v);
    else grid.set(key, [v]);
  }

  function snap(point: Point) {
    const ci = Math.floor(point.lat / CELL);
    const cj = Math.floor(point.lon / CELL);
    let best = -1;
    let bestM = SNAP_M;
    for (let di = -2; di <= 2; di++) {
      for (let dj = -2; dj <= 2; dj++) {
        for (const v of grid.get(`${ci + di}:${cj + dj}`) ?? []) {
          const d = metres(point.lat, point.lon, lat[v], lon[v]);
          if (d < bestM) [best, bestM] = [v, d];
        }
      }
    }
    return best >= 0 ? { vertex: best, meters: bestM } : null;
  }

  function walkFrom(from: Point, limit: number): Walk {
    const dist = new Float64Array(n).fill(Infinity);
    const via = new Int32Array(n).fill(-1);
    const at = snap(from);
    if (!at) return { start: from, origin: -1, snapM: 0, dist, via };
    dist[at.vertex] = at.meters;
    const queue = new Queue();
    queue.push(at.vertex, at.meters);
    while (queue.size) {
      const [v, d] = queue.pop();
      if (d > dist[v]) continue;
      if (d > limit) break;
      for (let k = start[v]; k < start[v + 1]; k++) {
        const e = adj[k];
        const w = eu[e] === v ? ev[e] : eu[e];
        const nd = d + elen[e];
        if (nd < dist[w]) {
          dist[w] = nd;
          via[w] = e;
          queue.push(w, nd);
        }
      }
    }
    return { start: from, origin: at.vertex, snapM: at.meters, dist, via };
  }

  /** An edge's points from vertex `from` to its other end, bends included. */
  function edgeLine(e: number, from: number): [number, number][] {
    const bends = data.bends[e] ? decode(data.bends[e]) : [];
    const pts: [number, number][] = [[lat[eu[e]], lon[eu[e]]], ...bends, [lat[ev[e]], lon[ev[e]]]];
    return eu[e] === from ? pts : pts.reverse();
  }

  function line(walk: Walk, vertex: number, end?: Point): [number, number][] {
    const back: [number, number][] = [];
    let v = vertex;
    let guard = 0;
    while (walk.via[v] >= 0 && guard++ < 10_000) {
      const e = walk.via[v];
      const w = eu[e] === v ? ev[e] : eu[e];
      const seg = edgeLine(e, w);
      for (let i = seg.length - 1; i > 0; i--) back.push(seg[i]);
      v = w;
    }
    back.push([lat[v], lon[v]]);
    const out = back.reverse().map(([a, b]) => [b, a] as [number, number]);
    out.unshift([walk.start.lon, walk.start.lat]);
    if (end) out.push([end.lon, end.lat]);
    return out;
  }

  // Each numbered street's edges, built the first time an address is asked for.
  let byStreet: Map<string, number[]> | null = null;
  const streetEdges = () => {
    if (!byStreet) {
      byStreet = new Map();
      const keys = data.names.map((name) => (name ? streetKey(name) : null));
      const add = (key: string | null, e: number) => {
        if (!key) return;
        const list = byStreet!.get(key);
        if (!list) byStreet!.set(key, [e]);
        else if (list[list.length - 1] !== e) list.push(e);
      };
      for (let e = 0; e < m; e++) add(keys[ename[e]], e);
      const aka = data.aka ?? [];
      for (let i = 0; i < aka.length; i += 2) add(keys[aka[i + 1]], aka[i]);
    }
    return byStreet;
  };

  function addresses(query: string, near?: Point | null): Address[] {
    const q = plain(query).replace(/#\s*#/g, "#").replace(/\s+/g, " ").trim();
    const parts = q.match(ADDRESS);
    if (!parts) return [];
    const type = TYPES.find(([re]) => re.test(parts[1]))?.[1];
    if (!type) return [];
    const main = streetKey(`${type} ${parts[2]}`);
    const streets = streetEdges();
    const mainEdges = main ? streets.get(main) : undefined;
    if (!mainEdges) return [];
    const onMain = new Set<number>();
    for (const e of mainEdges) onMain.add(eu[e]).add(ev[e]);

    // Every corner where the main street meets the cross street, by any kind of cross street.
    const found: { corner: number; crossKey: string; crossEdges: number[] }[] = [];
    for (const cross of CROSS[type]) {
      const crossKey = streetKey(`${cross} ${parts[3]}`);
      const crossEdges = crossKey ? streets.get(crossKey) : undefined;
      if (!crossKey || !crossEdges) continue;
      const corners = new Set(crossEdges.flatMap((e) => [eu[e], ev[e]]).filter((v) => onMain.has(v)));
      if (!corners.size) {
        const close = nearCorner(mainEdges, crossEdges);
        if (close !== undefined) corners.add(close);
      }
      for (const corner of corners) found.push({ corner, crossKey, crossEdges });
    }
    // One per place: corners a few blocks apart are the same address mapped twice, not two places.
    const far = (v: number) => (near ? metres(near.lat, near.lon, lat[v], lon[v]) : 0);
    found.sort((a, b) => far(a.corner) - far(b.corner));
    const apart: typeof found = [];
    for (const f of found) if (apart.every((g) => metres(lat[f.corner], lon[f.corner], lat[g.corner], lon[g.corner]) > 1000)) apart.push(f);

    const title = (text: string) => text.replace(/\s+/g, "").toUpperCase();
    const label = `${type[0].toUpperCase()}${type.slice(1)} ${title(parts[2])} # ${title(parts[3])}${parts[4] ? `-${parts[4]}` : ""}`;
    // "# 1F-32": 32 m along the main street from the corner of 1F, towards the cross streets that come after it.
    const offset = Math.min(Number(parts[4] ?? 0), 300);
    return apart.slice(0, 3).map(({ corner, crossKey, crossEdges }) => ({
      point: offset ? along(corner, new Set(mainEdges), rank(crossKey), offset) : { lat: lat[corner], lon: lon[corner] },
      label,
      street: data.names[ename[crossEdges[0]]],
    }));
  }

  /**
   * Where two streets cross without sharing a vertex (a divided avenue, a roundabout), the main street's vertex
   * closest to the cross street, when they come within a few metres.
   */
  function nearCorner(mainEdges: number[], crossEdges: number[]): number | undefined {
    const cross = crossEdges.flatMap((e) => [eu[e], ev[e]]);
    let best: number | undefined;
    let bestM = 40;
    for (const e of mainEdges) {
      for (const v of [eu[e], ev[e]]) {
        for (const w of cross) {
          const d = metres(lat[v], lon[v], lat[w], lon[w]);
          if (d < bestM) [best, bestM] = [v, d];
        }
      }
    }
    return best;
  }

  /** From a corner, `meters` along the main street, heading where the cross streets' numbers grow. */
  function along(corner: number, main: Set<number>, crossRank: number, meters: number): Point {
    const keys = data.names.map((name) => (name ? streetKey(name) : null));
    let best: { path: number[]; grows: boolean } | null = null;
    for (let k = start[corner]; k < start[corner + 1]; k++) {
      const first = adj[k];
      if (!main.has(first)) continue;
      // Follow the street until a corner with another numbered street says which way the numbers run.
      const path = [first];
      let v = eu[first] === corner ? ev[first] : eu[first];
      let grows: boolean | null = null;
      for (let steps = 0; steps < 20 && grows === null; steps++) {
        for (let j = start[v]; j < start[v + 1]; j++) {
          const key = keys[ename[adj[j]]];
          if (key && !main.has(adj[j])) grows = rank(key) > crossRank;
        }
        const next = Array.from(adj.subarray(start[v], start[v + 1])).find((e) => main.has(e) && e !== path[path.length - 1]);
        if (next === undefined) break;
        path.push(next);
        v = eu[next] === v ? ev[next] : eu[next];
      }
      if (grows && !best?.grows) best = { path, grows };
      else if (!best) best = { path, grows: !!grows };
    }
    if (!best) return { lat: lat[corner], lon: lon[corner] };
    let v = corner;
    let left = meters;
    for (const e of best.path) {
      const pts = edgeLine(e, v);
      for (let i = 1; i < pts.length; i++) {
        const d = metres(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
        if (d >= left) {
          const t = left / d;
          return { lat: pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), lon: pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]) };
        }
        left -= d;
      }
      v = eu[e] === v ? ev[e] : eu[e];
    }
    return { lat: lat[v], lon: lon[v] };
  }

  return { walkFrom, snap, line, addresses };
}
