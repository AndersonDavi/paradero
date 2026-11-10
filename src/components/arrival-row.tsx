import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { useT } from "@/i18n";
import { useLargeText } from "@/lib/accessibility";
import { punctuality, spokenArrival } from "@/lib/format";
import { signal, usePalette } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { radius, space } from "@/theme/tokens";
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

export function ArrivalRow({ arrival, first, index = 0, following = false, onPress }: { arrival: Arrival; first?: boolean; index?: number; following?: boolean; onPress?: () => void }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  // The next bus says the times are a live estimate; the rows under it only speak up when theirs is something else.
  const plain = arrival.basis === "estimated" && arrival.delaySeconds == null;
  return (
    <Animated.View entering={motion.appear(Math.min(index, 8) * 40)} layout={motion.layout} style={!first && !following && { borderTopColor: p.separator, borderTopWidth: StyleSheet.hairlineWidth }}>
      <PressableScale
        accessible
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={spokenArrival(arrival)}
        accessibilityHint={onPress && !following ? t.stop.followHint : undefined}
        accessibilityState={{ selected: following }}
        enabled={!!onPress}
        onPress={onPress}
        style={[styles.row, large && styles.stack, following && [styles.following, { backgroundColor: p.fill }]]}>
        <View style={styles.body}>
          <RouteBadge code={arrival.code} system={arrival.system} size="sm" />
          <Text variant="headline" weight={500} numberOfLines={large ? undefined : 1}>
            {arrival.name}
          </Text>
          {!plain && <Pace arrival={arrival} />}
        </View>
        <View style={styles.when}>
          {plain && <Dot color={signal.live} size="sm" />}
          <Minutes value={arrival.minutes} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space[4], gap: space[4] },
  stack: { flexDirection: "column", alignItems: "flex-start", gap: space[2] },
  body: { flexGrow: 1, flexShrink: 1, gap: space[1.5] },
  when: { flexDirection: "row", alignItems: "center", gap: space[2] },
  pace: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  following: { marginHorizontal: -space[3], paddingHorizontal: space[3], borderRadius: radius.lg, borderCurve: "continuous" },
});
