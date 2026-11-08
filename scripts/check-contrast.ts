import { DARK, HIGH_DARK, HIGH_LIGHT, LIGHT, type Palette } from "../src/theme/palettes.ts";

type Rgb = [number, number, number];

function parse(color: string, under: Rgb): Rgb {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as Rgb;
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) throw new Error(`Cannot read colour ${color}`);
  const [r, g, b, a = 1] = rgba[1].split(",").map(Number);
  return [r, g, b].map((c, i) => c * a + under[i] * (1 - a)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg: string, bg: string): number {
  const base = parse(bg, [255, 255, 255]);
  const [a, b] = [luminance(parse(fg, base)), luminance(base)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/** WCAG 2.2: 4.5 for text, 3 for large titles and for the edges of controls. */
const RULES: { fg: keyof Palette; bg: keyof Palette; min: number; why: string }[] = [
  ...(["background", "surface", "elevated"] as const).flatMap((bg) => [
    { fg: "text" as const, bg, min: 4.5, why: "body text" },
    { fg: "muted" as const, bg, min: 4.5, why: "secondary text" },
    { fg: "faint" as const, bg, min: 4.5, why: "labels and hints" },
  ]),
  { fg: "onInk", bg: "ink", min: 4.5, why: "text on primary buttons" },
  { fg: "fadeTo", bg: "background", min: 3, why: "the faded end of large titles" },
];

const HIGH_RULES = RULES.map((r) => ({ ...r, min: r.min === 4.5 ? 7 : 4.5 }));

const palettes = [
  { name: "light", palette: LIGHT, rules: RULES },
  { name: "dark", palette: DARK, rules: RULES },
  { name: "high contrast light", palette: HIGH_LIGHT, rules: HIGH_RULES },
  { name: "high contrast dark", palette: HIGH_DARK, rules: HIGH_RULES },
];

const failures = palettes.flatMap(({ name, palette, rules }) =>
  rules
    .map((r) => ({ ...r, name, value: ratio(palette[r.fg], palette[r.bg]) }))
    .filter((r) => r.value < r.min)
    .map((r) => `  ${r.name}: ${r.fg} on ${r.bg} is ${r.value.toFixed(2)}:1, needs ${r.min}:1 (${r.why})`),
);

if (failures.length) {
  console.error(`Colours below WCAG 2.2 AA (AAA in high contrast):\n\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`Contrast: ${palettes.length} palettes pass WCAG 2.2 AA, high contrast passes AAA.`);
