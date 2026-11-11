import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { useClock } from "@/lib/appearance";
import { useLargeText } from "@/lib/accessibility";
import { clock, spokenArrival } from "@/lib/format";
import { usePalette } from "@/theme/colors";
import { radius, size, space } from "@/theme/tokens";
import type { Arrival } from "@/transit/types";

import { Pace } from "./arrival-row";
import { Minutes } from "./minutes";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";

/** The one answer most riders open the app for, set large and quiet. */
export function NextBus({ arrival, following = false, onPress }: { arrival: Arrival; following?: boolean; onPress?: () => void }) {
  const p = usePalette();
  const large = useLargeText();
  const t = useT();
  useClock();
  const at = arrival.at ? clock(arrival.at) : null;
  return (
    <PressableScale
      accessible
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={t.speech.nextBus(`${spokenArrival(arrival)}${at ? ` ${at}.` : ""}`)}
      accessibilityHint={onPress && !following ? t.stop.followHint : undefined}
      accessibilityState={{ selected: following }}
      enabled={!!onPress}
      onPress={onPress}
      style={[styles.card, { borderColor: p.border }]}>
      <View style={styles.top}>
        <Text variant="eyebrow" tone="faint">
          {t.stop.nextBus}
        </Text>
        {at && (
          <Text variant="eyebrow" tone="faint" tabular>
            {at}
          </Text>
        )}
      </View>
      <View style={large ? styles.stack : styles.main}>
        <View style={large ? styles.lines : styles.grow}>
          <RouteBadge code={arrival.code} system={arrival.system} size="lg" solid />
          <Text variant="title" numberOfLines={large ? undefined : 2}>
            {arrival.name}
          </Text>
          <Pace arrival={arrival} />
        </View>
        <Minutes value={arrival.minutes} size="lg" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderCurve: "continuous", borderWidth: size.line.hair, padding: space[5], gap: space[3] },
  top: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: space[2] },
  main: { flexDirection: "row", alignItems: "flex-end", gap: space[4] },
  stack: { gap: space[4] },
  grow: { flex: 1, gap: space[3] },
  lines: { gap: space[3] },
});
