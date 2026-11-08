import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { usePalette } from "@/theme/colors";

import type { MapHandle, TransitMapProps } from "./transit-map.types";

export const TransitMap = forwardRef<MapHandle, TransitMapProps>(function TransitMap(_props, _ref) {
  const p = usePalette();
  return (
    <View style={[StyleSheet.absoluteFill, styles.box, { backgroundColor: p.surface }]}>
      <Text style={{ color: p.muted }}>El mapa está disponible en la app para iOS y Android.</Text>
    </View>
  );
});

const styles = StyleSheet.create({ box: { alignItems: "center", justifyContent: "center" } });
