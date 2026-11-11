#!/usr/bin/env node
/**
 * Downloads the bus route relations OpenStreetMap has for a city, with their ways, so that
 * scripts/gtfs-to-city.mjs can draw each route along its streets when the GTFS has no shapes.
 *
 *   node scripts/osm-route-lines.mjs barranquilla <out.json>
 *
 * The lines are © OpenStreetMap contributors (ODbL); the app already credits OpenStreetMap on every map.
 */
import { writeFileSync } from "node:fs";

const CITIES = {
  barranquilla: { box: [10.85, -74.92, 11.06, -74.72], network: "Transmetro" },
};

const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

const [cityId, out] = process.argv.slice(2);
const city = CITIES[cityId];
if (!city || !out) {
  console.error(`Usage: node scripts/osm-route-lines.mjs <${Object.keys(CITIES).join("|")}> <out.json>`);
  process.exit(1);
}

const [s, w, n, e] = city.box;
const query = `[out:json][timeout:120];relation["type"="route"]["route"="bus"](${s},${w},${n},${e});out geom;`;

let body = null;
// The public servers turn work away when busy; each one gets a few tries, waiting longer every time.
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

const network = new RegExp(city.network, "i");
const routes = body.elements
  .filter((r) => network.test(JSON.stringify(r.tags ?? {})))
  .map((r) => ({
    id: r.id,
    ref: r.tags.ref ?? null,
    name: r.tags.name ?? null,
    // Only the ways the bus drives on; platforms and stops are members too.
    ways: r.members.filter((m) => m.type === "way" && !/platform|stop/.test(m.role) && m.geometry).map((m) => m.geometry.map((p) => [p.lon, p.lat])),
  }))
  .filter((r) => r.ways.length > 0);

writeFileSync(out, JSON.stringify({ city: cityId, fetched: new Date().toISOString(), routes }));
console.log(`${cityId}: ${routes.length} route relations from OpenStreetMap`);
