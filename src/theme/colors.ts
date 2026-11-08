import { useColorScheme } from "react-native";

import type { System } from "@/transit/types";

/** Signal colours, used only as small dots, never as fills. */
export const signal = {
  live: "#34C759",
  late: "#F2A33D",
  alert: "#E5484D",
};

const LIGHT = {
  background: "#FFFFFF",
  surface: "#F6F6F7",
  elevated: "#FFFFFF",
  fill: "rgba(0,38,100,0.05)",
  fillStrong: "rgba(0,38,100,0.10)",
  text: "#0E1A33",
  muted: "rgba(14,26,51,0.66)",
  faint: "rgba(14,26,51,0.45)",
  separator: "rgba(0,12,31,0.10)",
  border: "rgba(0,12,31,0.06)",
  ink: "#0E1A33",
  onInk: "#FFFFFF",
  shadow: "0 10px 40px rgba(1,14,36,0.08)",
  shadowSoft: "0 4px 16px rgba(1,14,36,0.08)",
};

const DARK: typeof LIGHT = {
  background: "#070D1C",
  surface: "#0F172A",
  elevated: "#131D33",
  fill: "rgba(255,255,255,0.06)",
  fillStrong: "rgba(255,255,255,0.11)",
  text: "#F4F6FA",
  muted: "rgba(244,246,250,0.66)",
  faint: "rgba(244,246,250,0.42)",
  separator: "rgba(255,255,255,0.10)",
  border: "rgba(255,255,255,0.07)",
  ink: "#F4F6FA",
  onInk: "#0E1A33",
  shadow: "0 10px 40px rgba(0,0,0,0.45)",
  shadowSoft: "0 4px 16px rgba(0,0,0,0.35)",
};

export type Palette = typeof LIGHT & { dark: boolean };

export function usePalette(): Palette {
  const dark = useColorScheme() === "dark";
  return { ...(dark ? DARK : LIGHT), dark };
}

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
