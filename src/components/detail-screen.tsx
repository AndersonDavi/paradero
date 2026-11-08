import type { ReactNode } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { usePalette } from "@/theme/colors";
import { layout, radius, space } from "@/theme/tokens";

/** Map on top, a sheet of details sliding over it. Stops and routes share this frame. */
export function DetailScreen({ map, children }: { map: ReactNode; children: ReactNode }) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: Math.round(height * layout.sheetMap) }}>
        {map}
      </View>
      <ScrollView style={[styles.sheet, { backgroundColor: p.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: { flex: 1, marginTop: -layout.sheetOverlap, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderCurve: "continuous" },
  content: { padding: layout.gutter, paddingTop: space[6], gap: space[5], paddingBottom: layout.screenEnd },
});
