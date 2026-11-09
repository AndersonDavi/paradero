import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { useLargeText } from "@/lib/accessibility";
import { punctuality, spokenArrival } from "@/lib/format";
import { signal, usePalette } from "@/theme/colors";
import { motion } from "@/theme/motion";
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
      {color && <Dot color={color} size="sm" />}
      <Text variant="caption" tone="muted">
        {pace.text}
      </Text>
    </View>
  );
}

export function ArrivalRow({ arrival, first, index = 0 }: { arrival: Arrival; first?: boolean; index?: number }) {
  const p = usePalette();
  const large = useLargeText();
  return (
    <Animated.View
      entering={motion.appear(Math.min(index, 8) * 40)}
      layout={motion.layout}
      accessible
      accessibilityLabel={spokenArrival(arrival)}
      style={[styles.row, large && styles.stack, !first && { borderTopColor: p.separator, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.body}>
        <RouteBadge code={arrival.code} system={arrival.system} size="sm" />
        <Text variant="headline" weight={500} numberOfLines={large ? undefined : 1}>
          {arrival.name}
        </Text>
        <Pace arrival={arrival} />
      </View>
      <Minutes value={arrival.minutes} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space[4], gap: space[4] },
  stack: { flexDirection: "column", alignItems: "flex-start", gap: space[2] },
  body: { flexGrow: 1, flexShrink: 1, gap: space[1.5] },
  pace: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
});
