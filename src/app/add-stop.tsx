import { useDeferredValue, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { Icon, icons } from "@/components/icon";
import { PlaceRow } from "@/components/place-row";
import { usePlaceName } from "@/components/saved-rows";
import { Text } from "@/components/text";
import { useT } from "@/i18n";
import { useSearch } from "@/lib/api";
import { useLocation } from "@/lib/location";
import { choose } from "@/lib/pick-stop";
import { placesInOrder, useSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { fonts, layout, radius, size, space, type } from "@/theme/tokens";
import type { Place } from "@/transit/types";

/** Choosing a stop to add to a trip: one of the rider's places, or any place, address or bus stop they search. */
export default function AddStop() {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const query = useDeferredValue(text);
  const { state: here } = useLocation();
  const { data } = useSearch(query, here.status === "ready" ? here : null);
  const saved = placesInOrder(useSaved());
  const placeName = usePlaceName();
  // Bus stops are places to stop at too.
  const results: Place[] = query.trim().length >= 2 ? [...(data?.places ?? []), ...(data?.stops ?? []).map((s) => ({ id: `stop-${s.id}`, name: s.name, kind: "transit" as const, lat: s.lat, lon: s.lon, area: null, distanceM: s.distanceM }))] : [];

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + space[4] }]}>
      <Text variant="title" accessibilityRole="header" style={styles.pad}>
        {t.trip.addStopTitle}
      </Text>
      <View style={[styles.field, { backgroundColor: p.surface }]}>
        <Icon name={icons.search} color={p.text} size="md" weight="bold" />
        <TextInput
          value={text}
          onChangeText={setText}
          autoFocus
          placeholder={t.trip.addStopHint}
          placeholderTextColor={p.faint}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t.trip.addStopHint}
          style={[styles.input, { color: p.text }]}
        />
      </View>
      {saved.length > 0 && (
        <View style={[styles.chips, styles.pad]}>
          {saved.map((place) => (
            <Chip key={place.id} label={placeName(place)} onPress={() => choose({ name: placeName(place), lat: place.lat, lon: place.lon })} />
          ))}
        </View>
      )}
      {results.map((place) => (
        <PlaceRow key={place.id} place={place} onPress={() => choose({ name: place.name, lat: place.lat, lon: place.lon })} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[3], paddingBottom: layout.tabBarClearance },
  pad: { paddingHorizontal: space[4] },
  field: {
    marginHorizontal: space[4],
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[5],
    minHeight: size.control.lg,
    borderRadius: radius.lg,
  },
  input: { flex: 1, fontFamily: fonts[400], fontSize: type.body.fontSize, paddingVertical: space[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
