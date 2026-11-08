import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { punctuality, spokenArrival } from "@/lib/format";
import { signal, usePalette } from "@/theme/colors";
import { space } from "@/theme/tokens";
import type { Arrival } from "@/transit/types";

import { Dot } from "./dot";
import { Minutes } from "./minutes";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";

export function Pace({ arrival }: { arrival: Arrival }) {
  const pace = punctuality(arrival);
  const color = pace.tone === "late" ? signal.late : pace.tone === "live" ? signal.live : null;
  return (
    <View style={styles.pace}>
      {color && <Dot color={color} size={6} />}
      <Text variant="caption" tone="muted">
        {pace.text}
      </Text>
    </View>
  );
}

export function ArrivalRow({ arrival, first, index = 0 }: { arrival: Arrival; first?: boolean; index?: number }) {
  const p = usePalette();
  return (
    <Animated.View
      entering={FadeIn.delay(Math.min(index, 8) * 40).duration(260)}
      layout={LinearTransition.springify().damping(20)}
      accessible
      accessibilityLabel={spokenArrival(arrival)}
      style={[styles.row, !first && { borderTopColor: p.separator, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.body}>
        <RouteBadge code={arrival.code} system={arrival.system} size="sm" />
        <Text variant="headline" weight={500} numberOfLines={1}>
          {arrival.name}
        </Text>
        <Pace arrival={arrival} />
      </View>
      <Minutes value={arrival.minutes} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space.lg, gap: space.lg },
  body: { flex: 1, gap: 6 },
  pace: { flexDirection: "row", alignItems: "center", gap: 6 },
});
