import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { size as sizes } from "@/theme/tokens";

/** A status dot. Live dots breathe, unless the phone asks for less motion. */
export function Dot({ color, pulse = false, size: tier = "md" }: { color: string; pulse?: boolean; size?: keyof typeof sizes.dot }) {
  const side = sizes.dot[tier];
  const still = useReducedMotion();
  const breathe = pulse && !still;
  const scale = useSharedValue(1);
  useEffect(() => {
    if (breathe) scale.value = withRepeat(withTiming(2.6, { duration: 1600 }), -1, false);
  }, [breathe, scale]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: Math.max(0, 0.5 - (scale.value - 1) / 3.2) }));
  return (
    <View style={[styles.box, { width: side, height: side }]}>
      {breathe && <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: side, backgroundColor: color }, ring]} />}
      <View style={{ width: side, height: side, borderRadius: side, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
