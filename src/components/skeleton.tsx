import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { usePalette } from "@/theme/colors";
import { radius, size, space, type } from "@/theme/tokens";
import { t } from "@/i18n";

export function Bone({ width, height, round = radius.sm }: { width: DimensionValue; height: number; round?: number }) {
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
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t().speech.loading}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={[styles.list, style]}>
      {Array.from({ length: rows }, (_, i) =>
        kind === "stop" ? (
          <View key={i} style={styles.stop}>
            <Bone width={size.tile.md} height={size.tile.md} round={radius.md} />
            <View style={styles.lines}>
              <Bone width="62%" height={type.headline.fontSize} />
              <Bone width="40%" height={type.caption.fontSize} />
              <View style={styles.badges}>
                {BADGES.map((w, j) => (
                  <Bone key={j} width={w} height={type.headline.lineHeight} />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View key={i} style={styles.arrival}>
            <Bone width={size.control.lg} height={size.control.sm - space[2]} />
            <View style={styles.lines}>
              <Bone width="70%" height={type.headline.fontSize} />
              <Bone width="35%" height={type.caption.fontSize} />
            </View>
            <Bone width={size.control.sm} height={size.control.sm - space[1.5]} />
          </View>
        ),
      )}
    </Animated.View>
  );
}

const BADGES = [size.tile.md, size.tile.md, size.control.lg] as const;

const styles = StyleSheet.create({
  lines: { flex: 1, gap: space[2] },
  badges: { flexDirection: "row", gap: space[1.5] },
  list: { gap: space[1] },
  stop: { flexDirection: "row", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], alignItems: "center" },
  arrival: { flexDirection: "row", gap: space[3], paddingVertical: space[3], alignItems: "center" },
});
