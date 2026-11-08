import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

export function Dot({ color, pulse = false, size = 7 }: { color: string; pulse?: boolean; size?: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (pulse) scale.value = withRepeat(withTiming(2.6, { duration: 1600 }), -1, false);
  }, [pulse, scale]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: Math.max(0, 0.5 - (scale.value - 1) / 3.2) }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {pulse && <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: color }, ring]} />}
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}
