import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { useLargeText } from "@/lib/accessibility";
import { distanceText } from "@/lib/format";
import { usePalette } from "@/theme/colors";
import { space } from "@/theme/tokens";
import type { Place, PlaceKind } from "@/transit/types";

import { Icon, icons } from "./icon";
import { Text } from "./text";
import { Tile } from "./tile";

const KIND_ICON: Record<PlaceKind, (typeof icons)[keyof typeof icons]> = {
  mall: icons.mall,
  health: icons.health,
  education: icons.education,
  park: icons.park,
  neighbourhood: icons.neighbourhood,
  transit: icons.station,
  other: icons.place,
};

/** A place a rider can go to. Tapping it shows how to get there from where they are. */
export function PlaceRow({ place }: { place: Place }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const kind = t.placeKinds[place.kind];
  const walk = distanceText(place.distanceM);
  const details = [kind, place.area, walk].filter(Boolean).join("  ·  ");
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${place.name}. ${details}`}
      accessibilityHint={t.search.placeHint}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({ pathname: "/trip", params: { name: place.name, lat: String(place.lat), lon: String(place.lon) } });
      }}
      style={styles.row}>
      <Tile>
        <Icon name={KIND_ICON[place.kind]} color={p.text} size="md" />
      </Tile>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={large ? undefined : 1}>
          {place.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={large ? undefined : 1}>
          {details}
        </Text>
      </View>
      <Icon name={icons.directions} color={p.faint} size="sm" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  body: { flex: 1, gap: space[1] },
});
