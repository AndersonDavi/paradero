import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

import { size as sizes } from "@/theme/tokens";

type Name = Extract<SymbolViewProps["name"], { ios?: unknown }>;

interface IconProps {
  name: Name;
  color: ColorValue;
  size?: keyof typeof sizes.icon;
  weight?: "regular" | "medium" | "semibold" | "bold";
}

export function Icon({ name, color, size = "md", weight = "semibold" }: IconProps) {
  const side = sizes.icon[size];
  return <SymbolView name={name} size={side} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={{ width: side, height: side }} />;
}

export const icons = {
  bus: { ios: "bus.fill", android: "directions_bus" },
  station: { ios: "tram.fill", android: "tram" },
  stop: { ios: "signpost.right.fill", android: "signpost" },
  star: { ios: "star", android: "star" },
  starFill: { ios: "star.fill", android: "star" },
  location: { ios: "location.fill", android: "my_location" },
  search: { ios: "magnifyingglass", android: "search" },
  chevron: { ios: "chevron.right", android: "chevron_right" },
  wheelchair: { ios: "figure.roll", android: "accessible" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning" },
  clock: { ios: "clock", android: "schedule" },
  walk: { ios: "figure.walk", android: "directions_walk" },
  heart: { ios: "heart.fill", android: "favorite" },
  info: { ios: "info.circle", android: "info" },
  close: { ios: "xmark", android: "close" },
  person: { ios: "person.crop.circle.badge.checkmark", android: "person" },
  noAds: { ios: "nosign", android: "block" },
  code: { ios: "chevron.left.forwardslash.chevron.right", android: "code" },
  sparkles: { ios: "sparkles", android: "auto_awesome" },
  lock: { ios: "lock.fill", android: "lock" },
  check: { ios: "checkmark", android: "check" },
  flag: { ios: "exclamationmark.bubble", android: "feedback" },
  contactless: { ios: "wave.3.right", android: "contactless" },
} satisfies Record<string, Name>;
