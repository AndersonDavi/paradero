import { StyleSheet, View } from "react-native";

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
      <View style={styles.main}>
        <View style={{ flex: 1, gap: space.sm + 2 }}>
          <RouteBadge code={arrival.code} system={arrival.system} size="lg" solid />
          <Text variant="title" numberOfLines={2}>
            {arrival.name}
          </Text>
          <Pace arrival={arrival} />
        </View>
        <Minutes value={arrival.minutes} size={52} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderCurve: "continuous", borderWidth: StyleSheet.hairlineWidth, padding: space.xl - 2, gap: space.lg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  main: { flexDirection: "row", alignItems: "flex-end", gap: space.lg },
});
