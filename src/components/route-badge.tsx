import { StyleSheet, Text, View } from "react-native";

import { systems, usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";
import { spokenCode } from "@/transit/codes";
import type { System } from "@/transit/types";

const SIZES = {
  sm: { font: 12, padX: 7, padY: 3, dot: 5, r: 6 },
  md: { font: 14, padX: 9, padY: 5, dot: 6, r: 8 },
  lg: { font: 20, padX: 12, padY: 7, dot: 7, r: 10 },
} as const;

/** Neutral pill with a small dot for the part of the network, so a list of routes stays calm. */
export function RouteBadge({ code, system, size = "md", solid = false }: { code: string; system: System; size?: keyof typeof SIZES; solid?: boolean }) {
  const p = usePalette();
  const s = SIZES[size];
  return (
    <View
      accessible
      accessibilityLabel={`Ruta ${spokenCode(code)}, ${systems[system].label}`}
      style={[styles.badge, { backgroundColor: solid ? p.ink : p.fillStrong, paddingHorizontal: s.padX, paddingVertical: s.padY, borderRadius: s.r, gap: s.dot }]}>
      <View style={{ width: s.dot, height: s.dot, borderRadius: s.dot, backgroundColor: systems[system].dot }} />
      <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={[styles.text, { color: solid ? p.onInk : p.text, fontSize: s.font, lineHeight: s.font * 1.2 }]}>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderCurve: "continuous" },
  text: { fontFamily: fonts[600], fontVariant: ["tabular-nums"], letterSpacing: -0.2 },
});
