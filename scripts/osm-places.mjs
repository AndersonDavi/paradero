#!/usr/bin/env node
/**
 * Downloads the places a rider would ask how to get to (malls, hospitals, universities, parks, neighbourhoods)
 * from OpenStreetMap, so scripts/gtfs-to-city.mjs can keep them in the city's file and search them on the phone.
 *
 *   node scripts/osm-places.mjs barranquilla <out.json>
 *
 * The places are © OpenStreetMap contributors (ODbL); the app already credits OpenStreetMap on every map.
 */
import { writeFileSync } from "node:fs";

const CITIES = {
  barranquilla: { box: [10.84, -74.95, 11.1, -74.7] },
};

const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

const [cityId, out] = process.argv.slice(2);
const city = CITIES[cityId];
if (!city || !out) {
  console.error(`Usage: node scripts/osm-places.mjs <${Object.keys(CITIES).join("|")}> <out.json>`);
  process.exit(1);
}

/** What kind of place each tag is, in the few kinds the app has a word and an icon for. */
const KINDS = [
  ["mall", (t) => t.shop === "mall" || t.shop === "department_store" || t.shop === "supermarket" || t.amenity === "marketplace"],
  ["health", (t) => ["hospital", "clinic"].includes(t.amenity) || t.healthcare === "hospital" || t.healthcare === "clinic"],
  ["education", (t) => ["university", "college", "school"].includes(t.amenity)],
  ["park", (t) => ["park", "stadium", "sports_centre"].includes(t.leisure) || t.tourism === "zoo"],
  ["neighbourhood", (t) => ["neighbourhood", "suburb", "quarter", "town", "village"].includes(t.place)],
  ["transit", (t) => t.amenity === "bus_station" || t.aeroway === "aerodrome"],
  ["other", (t) => ["townhall", "library", "theatre", "cinema", "place_of_worship", "police", "courthouse", "arts_centre"].includes(t.amenity) || ["museum", "attraction", "hotel"].includes(t.tourism) || t.historic === "monument"],
];

const [s, w, n, e] = city.box;
const box = `(${s},${w},${n},${e})`;
const query = `[out:json][timeout:120];(
  nwr["name"]["shop"~"^(mall|department_store|supermarket)$"]${box};
  nwr["name"]["amenity"~"^(hospital|clinic|university|college|school|marketplace|bus_station|townhall|library|theatre|cinema|place_of_worship|police|courthouse|arts_centre)$"]${box};
  nwr["name"]["healthcare"~"^(hospital|clinic)$"]${box};
  nwr["name"]["leisure"~"^(park|stadium|sports_centre)$"]${box};
  nwr["name"]["tourism"~"^(museum|attraction|hotel|zoo)$"]${box};
  nwr["name"]["historic"="monument"]${box};
  nwr["name"]["aeroway"="aerodrome"]${box};
  node["name"]["place"~"^(neighbourhood|suburb|quarter|town|village)$"]${box};
);out center tags;`;

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

const round = (x) => Math.round(x * 1e5) / 1e5;
const seen = new Map();
for (const el of body.elements) {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const name = tags.name?.trim();
  if (!name || lat == null || lon == null) continue;
  const kind = KINDS.find(([, test]) => test(tags))?.[0] ?? "other";
  // The same place is often mapped twice (a building and a point in it): keep one per name and block.
  const key = `${name.toLowerCase()}|${Math.round(lat * 200)}|${Math.round(lon * 200)}`;
  if (!seen.has(key)) seen.set(key, [name, round(lat), round(lon), kind]);
}

const places = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0], "es"));
writeFileSync(out, JSON.stringify(places));
const count = {};
for (const p of places) count[p[3]] = (count[p[3]] ?? 0) + 1;
console.log(`${places.length} places`, count);
