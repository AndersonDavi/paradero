import { Stack } from "expo-router";

import { fonts } from "@/theme/tokens";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: process.env.EXPO_OS === "ios",
        headerShadowVisible: false,
        headerLargeTitleStyle: { fontFamily: fonts.serif },
        headerTitleStyle: { fontFamily: fonts[600] },
      }}>
      <Stack.Screen name="index" options={{ title: "Guardados" }} />
    </Stack>
  );
}
