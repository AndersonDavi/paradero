import BottomSheet, { BottomSheetHandle, BottomSheetScrollView, type BottomSheetHandleProps } from "@gorhom/bottom-sheet";
import { useState, type ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePalette } from "@/theme/colors";
import { SheetCover } from "./sheet-cover";
import { PANEL_COVER, SidePanel, useWide } from "./side-panel";
import { layout, radius, size, space } from "@/theme/tokens";

/** How much of the screen the sheet covers: pulled down to see the map, as it opens, and pulled up to read. */
const LOW = 0.32;
const HIGH = 0.92;

/**
 * Map on top, a sheet of details over it, lifted by a hairline and a soft shadow so it never melts into the map.
 * The rider can pull the sheet down to see the whole map, or up to read. The map stays full size behind it and
 * its camera glides to keep the route above the sheet, as the sheet moves. Stops, routes and trips share this frame.
 * On a wide web window the sheet is a panel on the left, below the tabs, and the map frames to its right.
 */
export function DetailScreen({ map, children }: { map: ReactNode; children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const { height } = useWindowDimensions();
  const snaps = [Math.round(height * LOW), Math.round(height * (1 - layout.sheetMap)), Math.round(height * HIGH)];
  const [sheet, setSheet] = useState(1);
  // The sheet's rounded top overlaps the map a little; what lies under it still counts as the map's.
  const cover = wide ? { bottom: 0, left: PANEL_COVER } : { bottom: Math.max(0, snaps[sheet] - layout.sheetOverlap), left: 0 };

  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <SheetCover.Provider value={cover}>{map}</SheetCover.Provider>
      </View>
      {wide ? (
        <SidePanel top={insets.top + space[2]} contentStyle={[styles.content, styles.panelContent]}>
          {children}
        </SidePanel>
      ) : (
        <BottomSheet
          accessible={false}
          index={1}
          snapPoints={snaps}
          enableDynamicSizing={false}
          onAnimate={(_, to) => to >= 0 && setSheet(to)}
          backgroundStyle={{ backgroundColor: p.background, borderRadius: radius.xl, boxShadow: p.shadowUp, borderWidth: size.line.hair, borderColor: p.border }}
          handleIndicatorStyle={{ backgroundColor: p.fillStrong, width: size.control.sm }}
          handleComponent={QuietHandle}>
          <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </BottomSheetScrollView>
        </BottomSheet>
      )}
    </View>
  );
}

/** The grabber is for fingers. Screen readers scroll the sheet's content directly, so the handle stays out of their way. */
function QuietHandle(props: BottomSheetHandleProps) {
  return <BottomSheetHandle {...props} accessible={false} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The tab bar floats over the end of the sheet, so the last row needs to scroll clear of it.
  content: { padding: layout.gutter, paddingTop: space[2], gap: space[5], paddingBottom: layout.tabBarClearance },
  // A side panel has no tab bar over it: the web's tabs are at the top.
  panelContent: { paddingTop: layout.gutter, paddingBottom: space[6] },
});
