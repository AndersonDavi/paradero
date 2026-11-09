import fs from "node:fs";
const trunk = JSON.parse(fs.readFileSync("routes.json"));
const zonal = JSON.parse(fs.readFileSync("zonal.json"));
const copy = {
  es: { title: "Sabe cuándo llega tu bus.", sub: "Paraderos, rutas y horarios de Bogotá.", card: "hero-card.png" },
  en: { title: "Know when your bus arrives.", sub: "Bogotá's stops, routes and timetables.", card: "hero-card-en.png" },
};
const C = { lat: 4.6585, lon: -74.0625 };
function map(W, H, k, lon0 = C.lon, cy = 0) {
  const ky = k / Math.cos((C.lat * Math.PI) / 180);
  const P = ([lon, lat]) => [(W / 2 + (lon - lon0) * k).toFixed(1), (H / 2 + cy - (lat - C.lat) * ky).toFixed(1)];
  const path = (c) => "M" + c.map((p) => P(p).join(" ")).join("L");
  const s = k / 10000;
  const z = zonal.map((r) => `<path d="${path(r.coords)}" stroke="#262626" stroke-width="${3 * s}"/>`).join("");
  const t = trunk.filter((r) => r.code !== "H15").map((r) => `<path d="${path(r.coords)}" stroke="#4d4d4d" stroke-width="${6 * s}"/>`).join("");
  const h = trunk.find((r) => r.code === "H15");
  const hl = `<path d="${path(h.coords)}" stroke="#fff" stroke-width="${9 * s}"/>` + h.stops.map((p) => { const [x, y] = P(p); return `<circle cx="${x}" cy="${y}" r="${11 * s}" fill="#0a0a0a" stroke="#fff" stroke-width="${5 * s}"/>`; }).join("");
  return `<svg width="${W}" height="${H}" style="position:absolute;inset:0" fill="none" stroke-linecap="round" stroke-linejoin="round">${z}${t}${hl}</svg>`;
}
const head = (W, H) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:G;src:url(Geist_500Medium.ttf);font-weight:500}
@font-face{font-family:G;src:url(Geist_600SemiBold.ttf);font-weight:600}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0a0a0a;color:#fff;font-family:G,sans-serif;-webkit-font-smoothing:antialiased}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 34% 46% at 50% 50%,rgba(10,10,10,.92),rgba(10,10,10,.55) 60%,rgba(10,10,10,0) 100%)}
.card{position:absolute;border-radius:56px;overflow:hidden;box-shadow:0 60px 160px rgba(0,0,0,.85),0 0 0 2px rgba(255,255,255,.08)}
.card img{width:100%;display:block}
</style>`;
for (const [lang, c] of Object.entries(copy)) {
  // Header 3840x1646, safe x1097-2743 y493-1154
  const cw = 1360, ch = Math.round((cw * 552) / 1222);
  fs.writeFileSync(`header-${lang}.html`, head(3840, 1646) + map(3840, 1646, 14000, -74.088) + `<div class=glow></div><div class=card style="left:${(3840 - cw) / 2}px;top:${(1646 - ch) / 2}px;width:${cw}px"><img src="../shots/${c.card}"></div>`);
  // Search 3840x2560, safe x836-3004 y765-1795
  const sw = 1240, sh = Math.round((sw * 552) / 1222);
  fs.writeFileSync(`search-${lang}.html`, head(3840, 2560) + map(3840, 2560, 15000, -74.085) + `<div class=glow style="background:radial-gradient(ellipse 36% 36% at 50% 50%,rgba(10,10,10,.95),rgba(10,10,10,.6) 60%,rgba(10,10,10,0) 100%)"></div>
<div style="position:absolute;left:836px;width:2168px;top:765px;height:1030px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
<h1 style="font-weight:600;font-size:150px;letter-spacing:-5px;line-height:1">${c.title}</h1>
<div class=card style="position:relative;margin-top:90px;width:${sw}px;height:${sh}px"><img src="../shots/${c.card}"></div></div>`);
}
