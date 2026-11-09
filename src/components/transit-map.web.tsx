import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useT } from "@/i18n";
import { usePalette } from "@/theme/colors";

import type { MapHandle, TransitMapProps } from "./transit-map.types";

export const TransitMap = forwardRef<MapHandle, TransitMapProps>(function TransitMap(_props, _ref) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={[StyleSheet.absoluteFill, styles.box, { backgroundColor: p.surface }]}>
      <Text style={{ color: p.muted }}>{t.map.webOnly}</Text>
    </View>
  );
});

const styles = StyleSheet.create({ box: { alignItems: "center", justifyContent: "center" } });
