import { StyleSheet, View } from "react-native";

import { useLargeText } from "@/lib/accessibility";
import { clock, spokenArrival } from "@/lib/format";
import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";
import type { Arrival } from "@/transit/types";

import { Pace } from "./arrival-row";
import { Minutes } from "./minutes";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";

/** The one answer most riders open the app for, set large and quiet. */
export function NextBus({ arrival }: { arrival: Arrival }) {
  const p = usePalette();
  const large = useLargeText();
  return (
    <View
      accessible
      accessibilityLabel={`Próximo bus. ${spokenArrival(arrival)}`}
      style={[styles.card, { backgroundColor: p.elevated, borderColor: p.border, boxShadow: p.shadow }]}>
      <View style={styles.top}>
        <Text variant="eyebrow" tone="faint">
          Próximo bus
        </Text>
        {arrival.at && (
          <Text variant="eyebrow" tone="faint" tabular>
            {clock(arrival.at)}
          </Text>
        )}
      </View>
      <View style={large ? styles.stack : styles.main}>
        <View style={large ? styles.lines : styles.grow}>
          <RouteBadge code={arrival.code} system={arrival.system} size="lg" solid />
          <Text variant="title" numberOfLines={2}>
            {arrival.name}
          </Text>
          <Pace arrival={arrival} />
        </View>
        <Minutes value={arrival.minutes} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderCurve: "continuous", borderWidth: StyleSheet.hairlineWidth, padding: space[6], gap: space[4] },
  top: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: space[2] },
  main: { flexDirection: "row", alignItems: "flex-end", gap: space[4] },
  stack: { gap: space[4] },
  grow: { flex: 1, gap: space[3] },
  lines: { gap: space[3] },
});
