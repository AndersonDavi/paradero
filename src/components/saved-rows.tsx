import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { useLargeText } from "@/lib/accessibility";
import { useTrip } from "@/lib/api";
import { useClock } from "@/lib/appearance";
import { clock } from "@/lib/format";
import { useLocation } from "@/lib/location";
import type { SavedPlace, SavedTrip } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { space } from "@/theme/tokens";

import { Icon, icons } from "./icon";
import { Text } from "./text";
import { Tile } from "./tile";

type Point = { name: string; lat: number; lon: number };

/** Opens How to get there, from one of the rider's places or from where they are, with any stops after the first. */
export function openTrip(to: Point, from: Point | null = null, then: SavedTrip["then"] = []) {
  void Haptics.selectionAsync();
  router.push({
    pathname: "/trip",
    params: {
      name: to.name,
      lat: String(to.lat),
      lon: String(to.lon),
      ...(from ? { fromName: from.name, fromLat: String(from.lat), fromLon: String(from.lon) } : {}),
      ...(then?.length ? { then: JSON.stringify(then) } : {}),
    },
  });
}

/** Home and work go by those words; any other place by its own name. */
export function usePlaceName() {
  const t = useT();
  return (p: SavedPlace) => (p.label === "home" ? t.saved.home : p.label === "work" ? t.saved.work : p.name);
}

export const placeIcon = (p: SavedPlace) => (p.label === "home" ? icons.neighbourhood : p.label === "work" ? icons.work : icons.place);

/** A saved place: tapping it shows how to get there from where the rider is. */
export function SavedPlaceRow({ place }: { place: SavedPlace }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const title = usePlaceName()(place);
  const detail = place.label ? place.name : null;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join(". ")}
      accessibilityHint={t.search.placeHint}
      onPress={() => openTrip({ name: title, lat: place.lat, lon: place.lon })}
      style={styles.row}>
      <Tile>
        <Icon name={placeIcon(place)} color={p.text} size="md" />
      </Tile>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={large ? undefined : 1}>
          {title}
        </Text>
        {detail && (
          <Text variant="caption" tone="muted" numberOfLines={large ? undefined : 1}>
            {detail}
          </Text>
        )}
      </View>
      <Icon name={icons.directions} color={p.faint} size="sm" />
    </PressableScale>
  );
}

/** A saved trip, with when to leave for the next bus, worked out on the phone as the row is shown. */
export function SavedTripRow({ trip }: { trip: SavedTrip }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  useClock();
  const { state } = useLocation();
  const from = trip.from ?? (state.status === "ready" ? { lat: state.lat, lon: state.lon } : null);
  const later = trip.then ?? [];
  const { data } = useTrip(from, [{ ...trip.to, stay: 0 }, ...later], 0);
  const next = data?.first[0];
  // When to leave for the first bus, and when the last stop is reached.
  const end = data && later.length ? data.then[data.then.length - 1] : next;
  const title = [trip.from?.name ?? t.trip.here, trip.to.name, ...later.map((s) => s.name)].reduce((a, b) => t.trip.pair(a, b));
  const detail = next && end ? t.trip.next(clock(next.departs), clock(end.arrives)) : data ? t.trip.noneToday : null;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={[title, detail].filter(Boolean).join(". ")} onPress={() => openTrip(trip.to, trip.from, trip.then)} style={styles.row}>
      <Tile>
        <Icon name={icons.directions} color={p.text} size="md" />
      </Tile>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={large ? undefined : 2}>
          {title}
        </Text>
        {detail && (
          <Text variant="caption" tone="muted" tabular numberOfLines={large ? undefined : 1}>
            {detail}
          </Text>
        )}
      </View>
      <Icon name={icons.chevron} color={p.faint} size="xs" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  body: { flex: 1, gap: space[1] },
});
