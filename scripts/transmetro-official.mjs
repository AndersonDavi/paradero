#!/usr/bin/env node
/**
 * Transmetro's own routes, as its website publishes them: the routes from the site's public API, and each route's
 * stops in order, with their place, and its line, from the Google My Maps map the site embeds for it.
 *
 *   node scripts/transmetro-official.mjs <out.json>
 *
 * The API (https://apiwebtm.com, behind transmetro.gov.co) gives each route its name, its hours per kind of day as
 * text, its stops as text and the id of its map. The map, exported as KML, gives the stops as numbered points
 * ("3 - Carrera 13 con Calle 66") and the route as one or more lines. Nothing here has trip times.
 */
import { writeFileSync } from "node:fs";

const API = "https://apiwebtm.com";
const UA = { "User-Agent": "paradero-barranquilla (open data import)" };

const [out] = process.argv.slice(2);
if (!out) {
  console.error("Usage: node scripts/transmetro-official.mjs <out.json>");
  process.exit(1);
}

async function json(path) {
  const res = await fetch(`${API}/${path}`, { headers: UA });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function kml(mid) {
  const res = await fetch(`https://www.google.com/maps/d/kml?forcekml=1&mid=${encodeURIComponent(mid)}`, { headers: UA });
  if (!res.ok) throw new Error(`map ${mid}: ${res.status}`);
  return res.text();
}

const text = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
const coords = (s) =>
  s
    .trim()
    .split(/\s+/)
    .map((p) => p.split(",").map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map(([lon, lat]) => [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]);

/** A map's stops (numbered points, in their number's order) and lines, folder by folder. */
function parse(doc) {
  const stops = [];
  const lines = [];
  let order = 0;
  for (const folder of doc.split(/<Folder>/).slice(doc.includes("<Folder>") ? 1 : 0)) {
    const layer = text(/<name>([\s\S]*?)<\/name>/.exec(folder)?.[1] ?? "");
    for (const pm of folder.match(/<Placemark>[\s\S]*?<\/Placemark>/g) ?? []) {
      const name = text(/<name>([\s\S]*?)<\/name>/.exec(pm)?.[1] ?? "");
      // Most maps keep the stop's name, order and code in the point's data, not in its name.
      const data = Object.fromEntries(
        [...pm.matchAll(/<Data name="([^"]*)">\s*<value>([\s\S]*?)<\/value>/g)].map(([, k, v]) => [k.normalize("NFD").replace(/[^A-Za-z_]/g, "").toUpperCase(), text(v)]),
      );
      const field = (re) => Object.entries(data).find(([k]) => re.test(k))?.[1] ?? null;
      const point = /<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/.exec(pm);
      if (point) {
        const [lon, lat] = coords(point[1])[0] ?? [];
        // Some maps still carry Google's sample layer (the Eiffel Tower, Mount Fuji): only points around Barranquilla count.
        if (lon === undefined || !(lat > 10.7 && lat < 11.2 && lon > -75.1 && lon < -74.6)) continue;
        const numbered = /^\s*(\d+)\s*[-–.)]\s*(.+)$/.exec(name);
        const seq = numbered ? Number(numbered[1]) : Number(field(/^SECUEN/)) || null;
        // The stop's own name field first: on some maps every point is named after the route ("A3-4 Villa Sol").
        const label = (field(/^NOMBRE/) || (numbered ? numbered[2] : name) || "").replace(/\s+/g, " ").trim();
        stops.push({ n: seq, order: order++, name: label, code: field(/^COD_?PARADA/), status: field(/^ESTADO$/), lat, lon, layer });
      }
      for (const line of pm.match(/<LineString>[\s\S]*?<\/LineString>/g) ?? []) {
        const c = coords(/<coordinates>([\s\S]*?)<\/coordinates>/.exec(line)?.[1] ?? "");
        if (c.length > 1) lines.push({ name, layer, coords: c });
      }
    }
  }
  return { stops, lines };
}

const BROKEN = "�";
const WORDS = {
  [`aci${BROKEN}n`]: "ación",
  [`ci${BROKEN}n`]: "ción",
  [`V${BROKEN}a`]: "Vía",
  [`v${BROKEN}a`]: "vía",
  [`Ci${BROKEN}naga`]: "Ciénaga",
  [`Tibur${BROKEN}n`]: "Tiburón",
  [`Mallorqu${BROKEN}n`]: "Mallorquín",
  [`Ol${BROKEN}mpica`]: "Olímpica",
  [`Bol${BROKEN}var`]: "Bolívar",
  [`Mar${BROKEN}a`]: "María",
  [`Jes${BROKEN}s`]: "Jesús",
  [`Hip${BROKEN}dromo`]: "Hipódromo",
  [`Catedr${BROKEN}l`]: "Catedral",
  [`Gal${BROKEN}n`]: "Galán",
  [`Ramay${BROKEN}`]: "Ramayá",
  [`Chiquinquir${BROKEN}`]: "Chiquinquirá",
  [`Atl${BROKEN}ntico`]: "Atlántico",
  [`Malec${BROKEN}n`]: "Malecón",
  [`Sim${BROKEN}n`]: "Simón",
  [`Do${BROKEN}a`]: "Doña",
  [`Nari${BROKEN}o`]: "Nariño",
  [` ${BROKEN} `]: " - ",
};
function mend(name, list) {
  if (!name.includes(BROKEN)) return name;
  const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(BROKEN, ".")}$`, "i");
  const whole = list
    .split("\n")
    .map((s) => s.replace(/^\s*\d+\.\s*/, "").trim())
    .find((s) => pattern.test(s));
  if (whole) return whole;
  let out = name;
  for (const [bad, good] of Object.entries(WORDS)) out = out.replaceAll(bad, good);
  return out;
}

/** "A5-5 Manantial (opera con desvío)" is code A5-5; "U-30 Universidades" is U30; "Ruta Chévere" keeps its name. */
function codeOf(name) {
  const m = /^\s*([A-Z]{1,2}\d*[- ]?\d+)\b/i.exec(name);
  if (!m) return name.replace(/^\s*Ruta\s+/i, "").trim();
  const raw = m[1].toUpperCase().replace(/\s/g, "");
  return /^U-?30$/.test(raw) ? "U30" : raw.replace(/^([A-Z]+)-(\d+)$/, "$1$2");
}

const routes = [];
for (const [kind, path] of [["alimentadora", "rutas-alimentadoras?_limit=500"], ["troncal", "rutas-troncales?_limit=500"]]) {
  for (const r of await json(path)) {
    const name = r.name.replace(/\s+/g, " ").trim();
    const mid = (r.kml ?? "").split("&")[0].trim();
    let map = { stops: [], lines: [] };
    if (mid) {
      try {
        map = parse(await kml(mid));
      } catch (e) {
        console.error(`${name}: ${e.message}`);
      }
    }
    // Some maps lost their accents on the way ("Tibur�n"): the route's own stop list on the site has the
    // word whole, and a few common words are mended by hand.
    for (const s of map.stops) s.name = mend(s.name, r.paraderos ?? "");
    // A map whose points are all named after the route (A3-4) has them numbered: the site's list gives the names.
    const listed = (r.paraderos ?? "").split("\n").map((s) => s.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
    for (const s of map.stops) if (s.name === name.replace(/\s*\(.*$/, "").trim() && s.n && listed[s.n - 1]) s.name = listed[s.n - 1];
    routes.push({
      code: codeOf(name),
      name,
      kind,
      slug: r.Slug,
      // By the name the site shows: some addresses still say "suspendida" for a route that runs again (A3-4, R40).
      suspended: /suspendid/i.test(name),
      detour: /desv[ií]o/i.test(name),
      hours: { weekday: r.horario_lv ?? null, saturday: r.horario_sab ?? null, sunday: r.horario_dom ?? null, text: r.horario ?? null },
      stopList: (r.paraderos ?? "").split("\n").map((s) => s.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean),
      updatedAt: r.updated_at,
      map: mid || null,
      ...map,
    });
    console.error(`${kind} ${codeOf(name)}: ${map.stops.length} stops, ${map.lines.length} lines`);
  }
}

writeFileSync(out, JSON.stringify({ retrievedAt: new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10), source: "https://transmetro.gov.co", routes }, null, 1));
console.log(`${routes.length} routes`);
