import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { size } from "@/theme/tokens";

import { useAccessibility } from "@/lib/accessibility";
import { usePalette } from "@/theme/colors";

const LIQUID = isLiquidGlassAvailable();

/** Liquid Glass on iOS 26, a solid surface everywhere else and whenever the rider asks for less transparency or more contrast. */
export function Glass({ children, style, interactive }: { children: ReactNode; style?: StyleProp<ViewStyle>; interactive?: boolean }) {
  const p = usePalette();
  const { reduceTransparency } = useAccessibility();
  if (LIQUID && !reduceTransparency && !p.high) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} style={style}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.fallback, { backgroundColor: p.elevated, borderColor: p.border, boxShadow: p.shadowSoft, borderWidth: p.high ? size.line.rule : StyleSheet.hairlineWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: { overflow: "hidden" },
});
