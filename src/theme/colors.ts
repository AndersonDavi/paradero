import { useColorScheme } from "react-native";

import { useAccessibility } from "@/lib/accessibility";
import { useContrast } from "@/lib/appearance";

import { DARK, HIGH_DARK, HIGH_LIGHT, LIGHT, type Palette as Colors } from "./palettes";

export { photo, signal, systems } from "./palettes";

export const palettes = { light: LIGHT, dark: DARK, highLight: HIGH_LIGHT, highDark: HIGH_DARK } as const;

export type Palette = Colors & { dark: boolean; high: boolean };

/** The colours for this moment: light or dark, and high contrast when the phone or the rider asks for it. */
export function usePalette(): Palette {
  const scheme = useColorScheme();
  const contrast = useContrast();
  const device = useAccessibility();
  const dark = scheme === "dark";
  const high = contrast === "high" || device.moreContrast;
  const base = high ? (dark ? HIGH_DARK : HIGH_LIGHT) : dark ? DARK : LIGHT;
  return { ...base, dark, high };
}
