import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

type Name = Extract<SymbolViewProps["name"], { ios?: unknown }>;

export function Icon({ name, size = 20, color, weight = "semibold" }: { name: Name; size?: number; color: ColorValue; weight?: "regular" | "medium" | "semibold" | "bold" }) {
  return <SymbolView name={name} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={{ width: size, height: size }} />;
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
} satisfies Record<string, Name>;
