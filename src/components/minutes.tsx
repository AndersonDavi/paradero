import { NumberFlow } from "number-flow-react-native";
import { StyleSheet, View } from "react-native";

import { signal, usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";

import { Dot } from "./dot";
import { Text } from "./text";

/** Minutes roll digit by digit as the bus gets closer, like a departures board. */
export function Minutes({ value, size = 28 }: { value: number | null; size?: number }) {
  const p = usePalette();
  if (value == null) {
    return (
      <Text variant="headline" tone="faint">
        –
      </Text>
    );
  }
  if (value <= 0) {
    return (
      <View style={styles.now}>
        <Dot color={signal.live} pulse />
        <Text variant="headline">Llegando</Text>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <NumberFlow value={Math.min(value, 99)} style={{ fontFamily: fonts[500], fontSize: size, color: p.text, letterSpacing: -size * 0.045 }} />
      <Text variant="caption" tone="muted" style={{ marginBottom: size * 0.14 }}>
        min
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  now: { flexDirection: "row", alignItems: "center", gap: 7 },
});
