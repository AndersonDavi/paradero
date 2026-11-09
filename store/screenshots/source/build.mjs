import fs from "node:fs";
const P = process.env.HOME + "/hackathons/paradero/src/components";
const croma = fs.readFileSync(P + "/croma-mark.tsx", "utf8");
const SYMBOL = croma.match(/const SYMBOL = "([^"]+)"/)[1];
const WORDMARK = croma.match(/const WORDMARK = "([^"]+)"/)[1];
const pm = fs.readFileSync(P + "/paradero-mark.tsx", "utf8");
const RING = [...pm.matchAll(/\[([\d.]+), ([\d.]+), ([\d.]+)\]/g)].map((m) => m.slice(1).map(Number));

const paradero = (size, color, ring) => `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs><mask id="sign" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="black"/><rect x="300" y="170" width="424" height="424" rx="104" fill="white"/><rect x="376" y="246" width="272" height="252" rx="58" fill="black"/><rect x="410" y="284" width="204" height="102" rx="22" fill="white"/><circle cx="440" cy="448" r="19" fill="white"/><circle cx="584" cy="448" r="19" fill="white"/><rect x="404" y="486" width="46" height="52" rx="14" fill="black"/><rect x="574" y="486" width="46" height="52" rx="14" fill="black"/><rect x="484" y="594" width="56" height="250" rx="28" fill="white"/></mask></defs>${RING.map(([x, y, r]) => `<rect x="${x - 5}" y="${y - 26}" width="10" height="52" rx="5" fill="${ring}" transform="rotate(${r} ${x} ${y})"/>`).join("")}<rect width="1024" height="1024" fill="${color}" mask="url(#sign)"/></svg>`;
const wordmark = (h, c) => `<svg height="${h}" width="${(h * 1785.9) / 317.6}" viewBox="0 0 1785.9 317.6"><path d="${WORDMARK}" fill="${c}"/></svg>`;
const symbol = (s, c) => `<svg width="${s}" height="${(s * 50.824) / 57.4629}" viewBox="0 0 57.4629 50.824"><path d="${SYMBOL}" fill="${c}" stroke="${c}" stroke-width="0.5"/></svg>`;

const copy = JSON.parse(fs.readFileSync(new URL("./copy.json", import.meta.url)));
const base = `<style>
@font-face{font-family:G;src:url(Geist_400Regular.ttf);font-weight:400}
@font-face{font-family:G;src:url(Geist_500Medium.ttf);font-weight:500}
@font-face{font-family:G;src:url(Geist_600SemiBold.ttf);font-weight:600}
@font-face{font-family:M;src:url(GeistMono_500Medium.ttf)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1320px;height:2868px;overflow:hidden;background:#0a0a0a;color:#fff;font-family:G,"Hiragino Sans","PingFang SC",sans-serif;-webkit-font-smoothing:antialiased}
.pad{position:absolute;inset:0;padding:190px 110px 140px}
.eyebrow{font-family:M,monospace;font-size:34px;letter-spacing:7px;text-transform:uppercase;color:#8a8a8a}
h1{font-weight:600;font-size:176px;line-height:.98;letter-spacing:-7px}
.sub{font-size:52px;line-height:1.3;color:#a3a3a3;letter-spacing:-1px;max-width:1040px}
.foot{position:absolute;left:110px;right:110px;bottom:130px;display:flex;justify-content:space-between;align-items:flex-end}
.fine{font-size:34px;line-height:1.4;color:#8a8a8a}
</style>`;

for (const [lang, c] of Object.entries(copy)) {
  const cjk = /ja|zh/.test(lang);
  const h1 = cjk ? 'style="font-size:128px;letter-spacing:-2px;line-height:1.15"' : "";
  const hero = `<!doctype html><meta charset=utf-8>${base}<div class=pad>
${paradero(150, "#fff", "#fff")}
<div class=eyebrow style="margin-top:70px">${c.heroEyebrow}</div>
<h1 ${h1} style="margin-top:36px">${c.heroTitle}</h1>
<p class=sub style="margin-top:44px">${c.heroSub}</p>
<div style="position:relative;margin-top:90px;height:1230px">
<div style="position:absolute;inset:0 0 230px 0;border-radius:56px;overflow:hidden"><img src="../hero-map.png" style="width:100%;height:100%;object-fit:cover;display:block"></div>
<div style="position:absolute;left:50px;right:50px;bottom:0;border-radius:52px;overflow:hidden;box-shadow:0 50px 140px rgba(0,0,0,.6)"><img src="../hero-card.png" style="width:100%;display:block"></div>
</div>
</div>
<div class=foot><div class=fine>${c.heroFoot}</div>${wordmark(64, "#fff")}</div>`;
  const items = c.closeItems.map((t) => `<li style="display:flex;gap:40px;align-items:baseline;padding:46px 0;border-top:2px solid #262626"><span style="font-family:M;font-size:34px;color:#6b6b6b;min-width:60px">${t[0]}</span><span><b style="font-weight:600;font-size:54px;letter-spacing:-1.2px">${t[1]}</b><br><span style="font-size:40px;color:#9a9a9a;line-height:1.5">${t[2]}</span></span></li>`).join("");
  const close = `<!doctype html><meta charset=utf-8>${base}<div class=pad>
${symbol(170, "#fff")}
<div class=eyebrow style="margin-top:70px">${c.closeEyebrow}</div>
<h1 ${h1} style="margin-top:36px">${c.closeTitle}</h1>
<ul style="list-style:none;margin-top:100px">${items}</ul>
<div style="margin-top:70px;display:flex;flex-wrap:wrap;gap:22px">${c.langs.map((l) => `<span style="border:2px solid #333;border-radius:999px;padding:18px 34px;font-size:40px;color:#d4d4d4">${l}</span>`).join("")}</div>
</div>
<div class=foot><div class=fine>github.com/croma-labs/paradero</div>${wordmark(64, "#fff")}</div>`;
  fs.writeFileSync(new URL(`./hero-${lang}.html`, import.meta.url), hero.replace("../hero-card.png", `../hero-card${c.card ?? ""}.png`));
  fs.writeFileSync(new URL(`./close-${lang}.html`, import.meta.url), close);
}
