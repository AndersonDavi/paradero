import { PressableScale } from "pressto";
import { StyleSheet } from "react-native";

import { usePalette } from "@/theme/colors";
import { radius, size, space } from "@/theme/tokens";

import { Text } from "./text";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
  height?: "md" | "lg";
  hug?: boolean;
  disabled?: boolean;
  role?: "button" | "link";
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** The one button. Primary is ink, secondary is outlined, quiet is text only. */
export function Button({ label, onPress, variant = "primary", height = "lg", hug, disabled, role = "button", accessibilityLabel, accessibilityHint }: ButtonProps) {
  const p = usePalette();
  const look = {
    primary: { backgroundColor: p.ink },
    secondary: { borderColor: p.separator, borderWidth: StyleSheet.hairlineWidth },
    quiet: {},
  }[variant];

  return (
    <PressableScale
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={[styles.base, { minHeight: size.control[height], opacity: disabled ? 0.6 : 1 }, hug && styles.hug, look]}>
      <Text variant="headline" weight={variant === "quiet" ? 500 : 600} tone={variant === "primary" ? "inverse" : variant === "quiet" ? "muted" : "default"}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: space[6], paddingVertical: space[3], borderCurve: "continuous" },
  hug: { alignSelf: "center" },
});
