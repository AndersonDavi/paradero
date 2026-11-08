import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

function Bone({ width, height, round = 8 }: { width: DimensionValue; height: number; round?: number }) {
  const p = usePalette();
  return <View style={{ width, height, borderRadius: round, backgroundColor: p.fillStrong }} />;
}

/** Placeholder rows shaped like the content that is coming, breathing instead of spinning. */
export function SkeletonList({ rows = 4, kind = "stop" }: { rows?: number; kind?: "stop" | "arrival" }) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View accessibilityLabel="Cargando" style={[styles.list, style]}>
      {Array.from({ length: rows }, (_, i) =>
        kind === "stop" ? (
          <View key={i} style={styles.stop}>
            <Bone width={44} height={44} round={radius.md} />
            <View style={{ flex: 1, gap: 8 }}>
              <Bone width="62%" height={16} />
              <Bone width="40%" height={12} />
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Bone width={44} height={22} round={7} />
                <Bone width={44} height={22} round={7} />
                <Bone width={56} height={22} round={7} />
              </View>
            </View>
          </View>
        ) : (
          <View key={i} style={styles.arrival}>
            <Bone width={56} height={28} round={8} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone width="70%" height={15} />
              <Bone width="35%" height={12} />
            </View>
            <Bone width={40} height={30} />
          </View>
        ),
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.xs },
  stop: { flexDirection: "row", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, alignItems: "center" },
  arrival: { flexDirection: "row", gap: space.md, paddingVertical: space.md, alignItems: "center" },
});
