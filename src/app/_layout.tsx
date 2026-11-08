import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif";
import { InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold, useFonts } from "@expo-google-fonts/inter-tight";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";

import { queryClient } from "@/lib/api";
import { useOnboarded } from "@/lib/onboarding";
import { fonts } from "@/theme/tokens";

LogBox.ignoreLogs(["[Reanimated] Dependencies should only be used on the web", "Sending `onAnimatedValueUpdate`"]);

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  const onboarded = useOnboarded();
  const [loaded, failed] = useFonts({ InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold, InstrumentSerif_400Regular });

  useEffect(() => {
    if (loaded || failed) void SplashScreen.hideAsync();
  }, [loaded, failed]);

  if (!loaded && !failed) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: dark ? "#F4F6FA" : "#0E1A33", background: dark ? "#070D1C" : "#FFFFFF", card: dark ? "#070D1C" : "#FFFFFF", text: dark ? "#F4F6FA" : "#0E1A33" },
    fonts: {
      regular: { fontFamily: fonts[400], fontWeight: "400" as const },
      medium: { fontFamily: fonts[500], fontWeight: "500" as const },
      bold: { fontFamily: fonts[700], fontWeight: "700" as const },
      heavy: { fontFamily: fonts[700], fontWeight: "700" as const },
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerTitleStyle: { fontFamily: fonts[600] } }}>
            <Stack.Protected guard={onboarded}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="stop/[id]" options={{ headerTransparent: true, title: "" }} />
              <Stack.Screen name="route/[id]" options={{ headerTransparent: true, title: "" }} />
            </Stack.Protected>
            <Stack.Protected guard={!onboarded}>
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
            </Stack.Protected>
          </Stack>
          <Toaster position="top-center" duration={2200} toastOptions={{ titleStyle: { fontFamily: fonts[600] }, descriptionStyle: { fontFamily: fonts[400] } }} />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
