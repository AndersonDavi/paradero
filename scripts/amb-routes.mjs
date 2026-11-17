#!/usr/bin/env node
/**
 * Barranquilla's city bus routes (transporte público colectivo), as the Área Metropolitana de Barranquilla publishes
 * them: one KMZ per route in https://www.ambq.gov.co/ruta-de-buses/<company>/<code>.kmz. Each holds the route's line
 * and little else: no stops, since a city bus stops where a rider hails it, and no times.
 *
 *   node scripts/amb-routes.mjs <out.json>
 *
 * A route in two files ("A1-4106 A.kmz", "A1-4106 B.kmz") is one route each way. Lines the AMB labels as a proposal
 * ("PROPUESTA SODIS 2024", "Propuesta C21") are kept and marked, so the app can leave them out until they are confirmed.
 */
import { writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const ROOT = "https://www.ambq.gov.co/ruta-de-buses/";
const UA = { "User-Agent": "paradero-barranquilla (open data import)" };

const [out] = process.argv.slice(2);
if (!out) {
  console.error("Usage: node scripts/amb-routes.mjs <out.json>");
  process.exit(1);
}

const page = async (url) => {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
};
const links = (html, base) => [...html.matchAll(/href="([^"?#]+)"/g)].map(([, h]) => new URL(h, base).href).filter((h) => h.startsWith(base) && h !== base);

/** The KML inside a KMZ: a zip whose entries are read by their local headers. */
function kmlOf(buf) {
  let p = 0;
  while (p + 30 <= buf.length && buf.readUInt32LE(p) === 0x04034b50) {
    const method = buf.readUInt16LE(p + 8);
    const size = buf.readUInt32LE(p + 18);
    const nameLen = buf.readUInt16LE(p + 26);
    const extra = buf.readUInt16LE(p + 28);
    const name = buf.subarray(p + 30, p + 30 + nameLen).toString("utf8");
    const data = buf.subarray(p + 30 + nameLen + extra, p + 30 + nameLen + extra + size);
    if (name.endsWith(".kml")) return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    p += 30 + nameLen + extra + size;
  }
  return buf.toString("utf8");
}

const coords = (s) =>
  s
    .trim()
    .split(/\s+/)
    .map((c) => c.split(",").map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map(([lon, lat]) => [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);

const routes = [];
for (const dir of links(await page(ROOT), ROOT).filter((h) => h.endsWith("/"))) {
  const company = decodeURIComponent(dir.slice(ROOT.length, -1));
  for (const file of links(await page(dir), dir).filter((h) => /\.km[lz]$/i.test(h))) {
    const base = decodeURIComponent(file.slice(dir.length)).replace(/\.km[lz]$/i, "");
    // "B17-4163", "A1-4106 B", "C2-B-4187": the code riders see, the AMB's number and the way.
    const m = /^([A-Z]+\d+[A-Z]?(?:-B)?)-(\d{4})(?:\s+([AB]))?$/i.exec(base);
    const res = await fetch(file, { headers: UA });
    if (!res.ok) {
      console.error(`${base}: ${res.status}`);
      continue;
    }
    const kml = /\.kmz$/i.test(file) ? kmlOf(Buffer.from(await res.arrayBuffer())) : await res.text();
    const layer = /<SimpleData name="layer">([^<]*)<\/SimpleData>/.exec(kml)?.[1] ?? null;
    const lines = [...kml.matchAll(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/g)].map(([, c]) => coords(c)).filter((l) => l.length > 1);
    routes.push({
      file: base,
      code: m ? m[1].toUpperCase() : base,
      number: m ? m[2] : null,
      way: m?.[3]?.toUpperCase() ?? null,
      company,
      layer,
      proposal: /propuesta/i.test(layer ?? ""),
      updated: res.headers.get("last-modified"),
      lines,
    });
    console.error(`${company} ${base}: ${lines.length} lines, ${lines.reduce((n, l) => n + l.length, 0)} points${/propuesta/i.test(layer ?? "") ? " (proposal)" : ""}`);
  }
}
writeFileSync(out, JSON.stringify({ retrievedAt: new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10), source: ROOT, routes }));
console.log(`${routes.length} route files`);
