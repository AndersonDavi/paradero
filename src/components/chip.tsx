import { PressableScale } from "pressto";
import { StyleSheet } from "react-native";

import { usePalette } from "@/theme/colors";
import { radius, size, space } from "@/theme/tokens";

import { Text } from "./text";

/** A small pill for filters and suggestions. Selected chips turn ink. */
export function Chip({ label, onPress, selected = false, accessibilityLabel }: { label: string; onPress: () => void; selected?: boolean; accessibilityLabel?: string }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={HIT}
      style={[styles.chip, selected ? { backgroundColor: p.ink } : { borderColor: p.high ? p.border : p.separator, borderWidth: p.high ? size.line.hair : StyleSheet.hairlineWidth }]}>
      <Text variant="callout" weight={selected ? 600 : 500} tone={selected ? "inverse" : "default"}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Chips are 36 tall to sit in a row; the touch area still reaches the 44 point minimum. */
const HIT = (size.control.md - size.control.sm) / 2;

const styles = StyleSheet.create({
  chip: { minHeight: size.control.sm, paddingHorizontal: space[4], paddingVertical: space[1.5], justifyContent: "center", borderRadius: radius.pill, borderCurve: "continuous" },
});
