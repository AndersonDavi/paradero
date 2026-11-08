import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { usePalette } from "@/theme/colors";

const LIQUID = isLiquidGlassAvailable();

/** Liquid Glass on iOS 26, a soft elevated surface everywhere else. */
export function Glass({ children, style, interactive }: { children: ReactNode; style?: StyleProp<ViewStyle>; interactive?: boolean }) {
  const p = usePalette();
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} style={style}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.fallback, { backgroundColor: p.elevated, borderColor: p.border, boxShadow: p.shadowSoft }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: { borderWidth: StyleSheet.hairlineWidth },
});
