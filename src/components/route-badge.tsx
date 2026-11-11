import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { systemName } from "@/cities";
import { useT } from "@/i18n";
import { spokenCode } from "@/lib/format";
import { systems, usePalette } from "@/theme/colors";
import { fonts, size as sizes } from "@/theme/tokens";
import type { System } from "@/transit/types";

const SIZES = {
  sm: { font: 12, padX: 7, padY: 3, dot: 5, r: 6 },
  md: { font: 14, padX: 9, padY: 5, dot: 6, r: 8 },
  lg: { font: 20, padX: 12, padY: 7, dot: 7, r: 10 },
} as const;

type Shape = "square" | "circle" | "diamond" | "bar" | "ring";

/** Each part of the network has its own mark as well as its own color, so it reads without color too. */
const SHAPES: Record<System, Shape> = {
  troncal: "square",
  dual: "square",
  zonal_urbano: "circle",
  zonal_complementario: "circle",
  zonal_especial: "circle",
  alimentador: "diamond",
  transmicable: "bar",
  other: "ring",
};

function mark(shape: Shape, d: number, color: string): ViewStyle {
  switch (shape) {
    case "square":
      return { width: d, height: d, borderRadius: sizes.line.hair, backgroundColor: color };
    case "circle":
      return { width: d, height: d, borderRadius: d, backgroundColor: color };
    case "diamond":
      return { width: d * 0.85, height: d * 0.85, borderRadius: sizes.line.hair, backgroundColor: color, transform: [{ rotate: "45deg" }] };
    case "bar":
      return { width: d * 1.6, height: d * 0.6, borderRadius: d, backgroundColor: color };
    case "ring":
      return { width: d, height: d, borderRadius: d, borderWidth: sizes.line.rule, borderColor: color };
  }
}

/**
 * Neutral pill with a small mark for the part of the network, so a list of routes stays calm.
 * Inside a row the row speaks for it; on its own (`labelled`) it says the route and the network.
 */
export function RouteBadge({
  code,
  system,
  size = "md",
  solid = false,
  labelled = false,
}: {
  code: string;
  system: System;
  size?: keyof typeof SIZES;
  solid?: boolean;
  labelled?: boolean;
}) {
  const p = usePalette();
  const t = useT();
  const s = SIZES[size];
  return (
    <View
      accessible={labelled}
      accessibilityLabel={labelled ? `${t.speech.route(spokenCode(code))}, ${systemName(system, t.systems)}` : undefined}
      importantForAccessibility={labelled ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!labelled}
      style={[
        styles.badge,
        { paddingHorizontal: s.padX, paddingVertical: s.padY, borderRadius: s.r, gap: s.dot },
        solid ? { backgroundColor: p.ink } : { borderColor: p.high ? p.border : p.separator, borderWidth: p.high ? StyleSheet.hairlineWidth * 3 : StyleSheet.hairlineWidth * 2 },
      ]}>
      <View style={mark(SHAPES[system], s.dot, systems[system].dot)} />
      <Text maxFontSizeMultiplier={2} numberOfLines={1} style={[styles.text, { color: solid ? p.onInk : p.text, fontSize: s.font, lineHeight: s.font * 1.2 }]}>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderCurve: "continuous" },
  text: { fontFamily: fonts.mono, fontVariant: ["tabular-nums"] },
});
