import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { usePalette } from "@/theme/colors";
import { radius, size } from "@/theme/tokens";

type Tier = keyof typeof size.tile;

const CORNER: Record<Tier, number> = { sm: radius.md, md: radius.md, lg: radius.lg, xl: radius.pill };

/** A square that holds a glyph or icon. The corner grows with the tile so every size feels like the same shape. */
export function Tile({ tier = "md", tone = "surface", children }: { tier?: Tier; tone?: "surface" | "ink"; children: ReactNode }) {
  const p = usePalette();
  const side = size.tile[tier];
  return <View style={[styles.tile, { width: side, height: side, borderRadius: CORNER[tier], backgroundColor: tone === "ink" ? p.ink : p.surface }]}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center", borderCurve: "continuous" },
});
