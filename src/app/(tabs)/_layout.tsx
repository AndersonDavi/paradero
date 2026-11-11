import { NativeTabs } from "expo-router/native-tabs";
import type { ReactNode } from "react";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { useCity } from "@/cities";
import { useT } from "@/i18n";
import { useCardShortcut } from "@/lib/tullave";
import { usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";

/** On the web the tabs float over the top of every screen: 24 px from the edge and 40 px tall, plus a little air. */
const WEB_TABS = 24 + 40 + 8;

/**
 * Screens keep their top controls below the safe area. On the web the floating tabs are counted in it, so the
 * feed status, the back button and the map's framing all start below the tabs instead of under them.
 */
function BelowWebTabs({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  if (process.env.EXPO_OS !== "web") return children;
  return <SafeAreaInsetsContext.Provider value={{ ...insets, top: insets.top + WEB_TABS }}>{children}</SafeAreaInsetsContext.Provider>;
}

export default function TabsLayout() {
  const p = usePalette();
  const t = useT();
  useCardShortcut();
  // A change of city starts the tabs over, so every screen, map and list is the new city's.
  const city = useCity();
  return (
    <BelowWebTabs>
      <NativeTabs
        key={city.id}
        tintColor={p.ink}
        minimizeBehavior="onScrollDown"
        labelStyle={{ fontFamily: fonts[600] }}
        backgroundColor={process.env.EXPO_OS === "android" ? p.background : undefined}
        indicatorColor={p.fillStrong}
        labelVisibilityMode="labeled">
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label>{t.tabs.nearby}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={require("@/assets/images/tabs/tab-nearby.png")} renderingMode="template" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(saved)">
          <NativeTabs.Trigger.Label>{t.tabs.saved}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "star", selected: "star.fill" }} md="star" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(about)">
          <NativeTabs.Trigger.Label>{t.tabs.about}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} md="favorite" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(search)" role="search">
          <NativeTabs.Trigger.Label>{t.tabs.search}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </BelowWebTabs>
  );
}
