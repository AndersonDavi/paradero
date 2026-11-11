import BottomSheet, { BottomSheetHandle, BottomSheetScrollView, type BottomSheetHandleProps } from "@gorhom/bottom-sheet";
import { useState, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

/** How much of the screen the sheet covers: pulled down to see the map, as it opens, and pulled up to read. */
const LOW = 0.32;
const HIGH = 0.92;

/**
 * Map on top, a sheet of details over it, lifted by a hairline and a soft shadow so it never melts into the map.
 * The rider can pull the sheet down to see the whole map, or up to read; the map takes the room the sheet leaves
 * and frames its route again. Stops, routes and trips share this frame.
 */
export function DetailScreen({ map, children }: { map: ReactNode; children: ReactNode }) {
  const p = usePalette();
  const { height } = useWindowDimensions();
  const snaps = [Math.round(height * LOW), Math.round(height * (1 - layout.sheetMap)), Math.round(height * HIGH)];
  const [sheet, setSheet] = useState(1);
  const mapHeight = height - snaps[sheet] + layout.sheetOverlap;

  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.map, { height: Math.max(mapHeight, layout.sheetOverlap * 2) }]}>
        {map}
      </View>
      <BottomSheet
        accessible={false}
        index={1}
        snapPoints={snaps}
        enableDynamicSizing={false}
        onChange={(i) => i >= 0 && setSheet(i)}
        backgroundStyle={{ backgroundColor: p.background, borderRadius: radius.xl, boxShadow: p.shadowUp, borderWidth: size.line.hair, borderColor: p.border }}
        handleIndicatorStyle={{ backgroundColor: p.fillStrong, width: size.control.sm }}
        handleComponent={QuietHandle}>
        <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

/** The grabber is for fingers. Screen readers scroll the sheet's content directly, so the handle stays out of their way. */
function QuietHandle(props: BottomSheetHandleProps) {
  return <BottomSheetHandle {...props} accessible={false} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { position: "absolute", top: 0, left: 0, right: 0 },
  // The tab bar floats over the end of the sheet, so the last row needs to scroll clear of it.
  content: { padding: layout.gutter, paddingTop: space[2], gap: space[5], paddingBottom: layout.tabBarClearance },
});
