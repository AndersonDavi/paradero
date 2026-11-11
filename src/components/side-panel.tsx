import type { ReactNode } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";

import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

/** How much of the map a side panel covers, from the left: the panel and the air before it. */
export const PANEL_COVER = layout.panel + space[4];

/** A wide web window, where the sheet becomes a panel on the side and the map fills the rest. */
export function useWide() {
  const { width } = useWindowDimensions();
  return process.env.EXPO_OS === "web" && width >= layout.wideFrom;
}

/** The sheet on a wide screen: a floating column on the left of the map, scrolling on its own. */
export function SidePanel({ top, contentStyle, children }: { top: number; contentStyle?: StyleProp<ViewStyle>; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={[styles.panel, { top, backgroundColor: p.background, borderColor: p.border, boxShadow: p.shadowUp }]}>
      <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: space[4],
    bottom: space[4],
    width: layout.panel,
    borderRadius: radius.xl,
    borderWidth: size.line.hair,
    overflow: "hidden",
  },
});
