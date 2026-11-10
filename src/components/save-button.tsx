import { Stack } from "expo-router";
import { Platform, Pressable, StyleSheet } from "react-native";

import { usePalette } from "@/theme/colors";
import { radius, size, space } from "@/theme/tokens";

import { Icon, icons } from "./icon";

/** The star in the header: the native toolbar on iOS, a header button on Android, where that toolbar does not exist. */
export function SaveButton({ saved, label, onPress }: { saved: boolean; label: string; onPress: () => void }) {
  const p = usePalette();
  if (Platform.OS === "ios") {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={saved ? "star.fill" : "star"} tintColor={p.text} accessibilityLabel={label} onPress={onPress} />
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: saved }}
            onPress={onPress}
            hitSlop={space[2]}
            style={[styles.button, { backgroundColor: p.elevated }]}>
            <Icon name={saved ? icons.starFill : icons.star} color={p.text} size="md" />
          </Pressable>
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: size.control.sm, height: size.control.sm, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
