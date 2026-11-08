import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from "@expo-google-fonts/geist";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";

import { queryClient } from "@/lib/api";
import "@/lib/accessibility";
import "@/lib/appearance";
import { useOnboarded } from "@/lib/onboarding";
import { usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";

LogBox.ignoreLogs(["[Reanimated] Dependencies should only be used on the web", "Sending `onAnimatedValueUpdate`"]);

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  const palette = usePalette();
  const onboarded = useOnboarded();
  const [loaded, failed] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
    "VictorMono-Bold": require("../../assets/fonts/VictorMono-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded || failed) void SplashScreen.hideAsync();
  }, [loaded, failed]);

  if (!loaded && !failed) return null;

  const base = palette.dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: palette.ink, background: palette.background, card: palette.background, text: palette.text },
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
              <Stack.Screen name="report" options={{ presentation: "formSheet", sheetAllowedDetents: [0.92], sheetGrabberVisible: true, headerShown: false }} />
            </Stack.Protected>
            <Stack.Screen name="privacidad" options={{ title: "Privacidad", headerTransparent: process.env.EXPO_OS === "ios" }} />
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
