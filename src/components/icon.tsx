import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform, type ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

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
  if (Platform.OS === "android" && name === icons.starFill) return <FilledStar side={side} color={color} />;
  // The web draws the same Material Symbols as Android; without a web name it would draw nothing.
  const named = Platform.OS === "web" && "android" in name ? ({ ...name, web: name.android } as Name) : name;
  return <SymbolView name={named} size={side} tintColor={color} weight={weight} resizeMode="scaleAspectFit" style={{ width: side, height: side }} />;
}

/** Material Symbols on Android ships the outline only, so the saved star is drawn. */
function FilledStar({ side, color }: { side: number; color: ColorValue }) {
  return (
    <Svg width={side} height={side} viewBox="0 0 24 24">
      <Path fill={color} d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </Svg>
  );
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
  directions: { ios: "arrow.triangle.turn.up.right.diamond.fill", android: "directions" },
  finish: { ios: "flag.checkered", android: "sports_score" },
  mall: { ios: "bag.fill", android: "shopping_bag" },
  health: { ios: "cross.case.fill", android: "local_hospital" },
  education: { ios: "graduationcap.fill", android: "school" },
  park: { ios: "tree.fill", android: "park" },
  neighbourhood: { ios: "house.fill", android: "home" },
  place: { ios: "mappin.circle.fill", android: "place" },
  settings: { ios: "gearshape.fill", android: "settings" },
  address: { ios: "signpost.right.and.left.fill", android: "pin_drop" },
  work: { ios: "briefcase.fill", android: "work" },
} satisfies Record<string, Name>;
