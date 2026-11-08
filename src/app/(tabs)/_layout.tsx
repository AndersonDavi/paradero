import { NativeTabs } from "expo-router/native-tabs";
import { usePalette } from "@/theme/colors";
import { fonts } from "@/theme/tokens";

export default function TabsLayout() {
  const p = usePalette();
  return (
    <NativeTabs tintColor={p.ink} minimizeBehavior="onScrollDown" labelStyle={{ fontFamily: fonts[600] }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Cerca</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/images/tabs/tab-nearby.png")} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Guardados</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "star", selected: "star.fill" }} md="star" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="about">
        <NativeTabs.Trigger.Label>Bien público</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
