import { Stack } from "expo-router";

import { usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";

const DETAIL = { headerLargeTitle: false, headerTransparent: true, title: "" } as const;

/** The stack inside each tab: its first screen under a large Geist title, or bare when it has none, and the stops and routes opened from it. */
export function TabStack({ root, title }: { root: string; title?: string }) {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: process.env.EXPO_OS === "ios",
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerBackButtonMenuEnabled: false,
        headerLargeTitleStyle: { fontFamily: fonts[600], color: p.text },
        headerTitleStyle: { fontFamily: fonts[600], color: p.text },
      }}>
      <Stack.Screen name={root} options={title ? { title } : { headerShown: false, title: "Paradero" }} />
      <Stack.Screen name="stop/[id]" options={DETAIL} />
      <Stack.Screen name="route/[id]" options={DETAIL} />
    </Stack>
  );
}
