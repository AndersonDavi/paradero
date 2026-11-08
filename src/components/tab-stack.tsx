import { Stack } from "expo-router";

import { usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";

/** The stack inside each tab, with a large Geist title. */
export function TabStack({ title }: { title: string }) {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: process.env.EXPO_OS === "ios",
        headerShadowVisible: false,
        headerLargeTitleStyle: { fontFamily: fonts[600], color: p.text },
        headerTitleStyle: { fontFamily: fonts[600], color: p.text },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
