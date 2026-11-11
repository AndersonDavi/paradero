import { Stack } from "expo-router";

import { usePalette } from "@/theme/colors";
import { fonts, space } from "@/theme/tokens";

import { useWide } from "./side-panel";

const DETAIL = { headerLargeTitle: false, headerTransparent: true, title: "" } as const;

/** The stack inside each tab: its first screen under a large Geist title, or bare when it has none, and the stops and routes opened from it. */
export function TabStack({ root, title }: { root: string; title?: string }) {
  const p = usePalette();
  // On a wide web window the back button and the star sit on the line of the floating tabs, not below them.
  const wide = useWide();
  const detail = wide ? { ...DETAIL, headerStatusBarHeight: space[3] } : DETAIL;
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
      <Stack.Screen name="stop/[id]" options={detail} />
      <Stack.Screen name="route/[id]" options={detail} />
      <Stack.Screen name="trip" options={detail} />
    </Stack>
  );
}
