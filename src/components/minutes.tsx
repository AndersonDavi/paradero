import { NumberFlow } from "number-flow-react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { signal, usePalette } from "@/theme/colors";
import { fonts, space, type } from "@/theme/tokens";

import { Dot } from "./dot";
import { Text } from "./text";

const SIZES = { sm: 20, md: 28, lg: 52 } as const;

/** How far each size may grow with the phone's text size. The big number is already big. */
const GROWTH = { sm: 2, md: 1.8, lg: 1.25 } as const;

/**
 * The rolling digits need headroom to animate inside their mask. iOS adds extra line height above the
 * glyphs, so the number gets a taller line and is pulled up by the same amount. Layout then sees only the glyphs.
 */
const ROOM = 0.4;

/** How far a glyph's baseline sits above the bottom of its line, as a share of the font size. */
const DESCENT = 0.21;

/** Minutes roll digit by digit as the bus gets closer, like a departures board. */
export function Minutes({ value, size = "md" }: { value: number | null; size?: keyof typeof SIZES }) {
  const p = usePalette();
  const { fontScale } = useWindowDimensions();
  const px = (SIZES[size] * Math.min(fontScale, GROWTH[size])) / fontScale;

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
      <View style={{ marginTop: -px * ROOM }}>
        <NumberFlow value={Math.min(value, 99)} respectMotionPreference style={{ fontFamily: fonts[500], fontSize: px, lineHeight: px * (1 + ROOM), color: p.text, fontVariant: ["tabular-nums"] }} />
      </View>
      <Text variant="caption" tone="muted" style={{ marginBottom: (px - type.caption.fontSize) * DESCENT }}>
        min
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: space[1] },
  now: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
});
