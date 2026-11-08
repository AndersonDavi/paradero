import { PRIVACY_SECTIONS, PRIVACY_TITLE, PRIVACY_UPDATED } from "@/content/privacy";
import { DARK, LIGHT } from "@/theme/palettes";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The privacy policy as one self-contained page, in Croma's light and dark themes, for browsers and App Store Connect. */
export function privacyPage(): string {
  const sections = PRIVACY_SECTIONS.map((s) => `<section><h2>${escape(s.title)}</h2><p>${escape(s.body)}</p></section>`).join("\n");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacidad · Paradero</title>
<meta name="description" content="Qué hace Paradero con tu ubicación, tus paraderos guardados y tus reportes.">
<style>
:root { --bg: ${LIGHT.background}; --text: ${LIGHT.text}; --muted: ${LIGHT.muted}; --faint: ${LIGHT.faint}; --fade: ${LIGHT.fadeTo}; --line: ${LIGHT.separator}; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg: ${DARK.background}; --text: ${DARK.text}; --muted: ${DARK.muted}; --faint: ${DARK.faint}; --fade: ${DARK.fadeTo}; --line: ${DARK.separator}; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 17px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
main { max-width: 640px; margin: 0 auto; padding: 72px 24px 96px; }
.eyebrow { font: 500 12px/1.4 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--faint); margin: 0 0 16px; }
h1 { font-weight: 600; font-size: clamp(34px, 7vw, 48px); line-height: 1.04; letter-spacing: -.035em; margin: 0 0 12px; background: linear-gradient(180deg, var(--text) 0%, var(--text) 44%, var(--fade) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; padding-bottom: .08em; }
.updated { color: var(--muted); margin: 0 0 48px; }
section { padding: 24px 0; border-top: 1px solid var(--line); }
h2 { font-weight: 600; font-size: 21px; letter-spacing: -.02em; margin: 0 0 8px; }
p { margin: 0; color: var(--muted); }
footer { margin-top: 48px; font: 500 12px/1.4 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--faint); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
a { color: inherit; }
</style>
</head>
<body>
<main>
<p class="eyebrow">Paradero · Bien público digital de Croma</p>
<h1>${escape(PRIVACY_TITLE)}</h1>
<p class="updated">Actualizada el ${escape(PRIVACY_UPDATED)}.</p>
${sections}
<footer><span>+ Infraestructura de datos públicos</span><a href="https://usecroma.com">usecroma.com +</a></footer>
</main>
</body>
</html>`;
}
