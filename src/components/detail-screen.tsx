import type { ReactNode } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

/** Map on top, a sheet of details sliding over it, lifted by a hairline and a soft shadow so it never melts into the map. Stops and routes share this frame. */
export function DetailScreen({ map, children }: { map: ReactNode; children: ReactNode }) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: Math.round(height * layout.sheetMap) }}>
        {map}
      </View>
      <View style={[styles.sheet, { backgroundColor: p.background, borderColor: p.border, boxShadow: p.shadowUp }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: {
    flex: 1,
    marginTop: -layout.sheetOverlap,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: size.line.hair,
    borderBottomWidth: 0,
  },
  scroll: { flex: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  // The tab bar floats over the end of the sheet, so the last row needs to scroll clear of it.
  content: { padding: layout.gutter, paddingTop: space[6], gap: space[5], paddingBottom: layout.tabBarClearance },
});
