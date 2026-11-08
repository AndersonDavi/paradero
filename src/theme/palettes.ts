import type { System } from "@/transit/types";

/**
 * Every colour in the app, as plain data. `scripts/check-contrast.ts` measures these pairs against
 * WCAG 2.2 AA on every check, so a colour that would fail someone with low vision cannot ship.
 */
export interface Palette {
  background: string;
  surface: string;
  elevated: string;
  fill: string;
  fillStrong: string;
  text: string;
  muted: string;
  faint: string;
  separator: string;
  border: string;
  ink: string;
  onInk: string;
  shadow: string;
  shadowSoft: string;
  shadowUp: string;
  fadeTo: string;
}

/** Signal colours, used only as small dots, never as fills. */
export const signal = {
  live: "#34C759",
  late: "#F2A33D",
  alert: "#E5484D",
};

/** Croma's light theme, from usecroma.com: warm paper, near-black ink, warm greys. */
export const LIGHT: Palette = {
  background: "#FDFCFC",
  surface: "#F5F3F1",
  elevated: "#FFFFFF",
  fill: "rgba(9,9,11,0.04)",
  fillStrong: "rgba(9,9,11,0.08)",
  text: "#09090B",
  muted: "#59544F",
  faint: "#706C67",
  separator: "#EBE8E4",
  border: "#EBE8E4",
  ink: "#09090B",
  onInk: "#FDFCFC",
  shadow: "0 16px 32px -12px rgba(9,9,11,0.16)",
  shadowSoft: "0 4px 16px -4px rgba(9,9,11,0.08)",
  shadowUp: "0 -8px 32px rgba(9,9,11,0.08)",
  fadeTo: "#948F88",
};

/** Croma's dark theme: surfaces step up in lightness as they come forward, hairlines instead of shadows. */
export const DARK: Palette = {
  background: "#09090B",
  surface: "#18181B",
  elevated: "#131316",
  fill: "rgba(250,250,250,0.05)",
  fillStrong: "rgba(250,250,250,0.10)",
  text: "#FAFAFA",
  muted: "#A1A1AA",
  faint: "#82828A",
  separator: "#27272A",
  border: "#27272A",
  ink: "#FAFAFA",
  onInk: "#09090B",
  shadow: "0 1px 2px rgba(0,0,0,0.6)",
  shadowSoft: "0 1px 2px rgba(0,0,0,0.5)",
  shadowUp: "0 -1px 0 rgba(250,250,250,0.06)",
  fadeTo: "#605F5F",
};

/** High contrast, light: pure black on white, no fades, borders you can see. */
export const HIGH_LIGHT: Palette = {
  background: "#FFFFFF",
  surface: "#F0F0F0",
  elevated: "#FFFFFF",
  fill: "rgba(0,0,0,0.08)",
  fillStrong: "rgba(0,0,0,0.16)",
  text: "#000000",
  muted: "#1F1F1F",
  faint: "#3D3D3D",
  separator: "#5C5C5C",
  border: "#000000",
  ink: "#000000",
  onInk: "#FFFFFF",
  shadow: "0 0 0 rgba(0,0,0,0)",
  shadowSoft: "0 0 0 rgba(0,0,0,0)",
  shadowUp: "0 -1px 0 #000000",
  fadeTo: "#000000",
};

/** High contrast, dark: pure white on black, no fades, borders you can see. */
export const HIGH_DARK: Palette = {
  background: "#000000",
  surface: "#141414",
  elevated: "#000000",
  fill: "rgba(255,255,255,0.12)",
  fillStrong: "rgba(255,255,255,0.22)",
  text: "#FFFFFF",
  muted: "#E6E6E6",
  faint: "#C7C7C7",
  separator: "#8F8F8F",
  border: "#FFFFFF",
  ink: "#FFFFFF",
  onInk: "#000000",
  shadow: "0 0 0 rgba(0,0,0,0)",
  shadowSoft: "0 0 0 rgba(0,0,0,0)",
  shadowUp: "0 -1px 0 #FFFFFF",
  fadeTo: "#FFFFFF",
};

/** Over photography the theme does not apply: the image sets the contrast. */
export const photo = {
  text: "#FFFFFF",
  track: "rgba(255,255,255,0.35)",
  cut: "rgba(0,0,0,0.35)",
  scrim: "#000000",
} as const;

/** What each part of the network is called, plus a muted tone for its dot. */
export const systems: Record<System, { label: string; dot: string }> = {
  troncal: { label: "TransMilenio", dot: "#C8323C" },
  dual: { label: "Dual", dot: "#D9733A" },
  zonal_urbano: { label: "SITP zonal", dot: "#3D63C9" },
  alimentador: { label: "Alimentador", dot: "#4E9A55" },
  zonal_complementario: { label: "Complementario", dot: "#C99A2E" },
  zonal_especial: { label: "Especial", dot: "#7C62B0" },
  transmicable: { label: "TransMiCable", dot: "#2C8C84" },
  other: { label: "Otro", dot: "#8A93A6" },
};
