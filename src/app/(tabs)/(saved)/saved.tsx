import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { RouteRow } from "@/components/route-row";
import { SavedPlaceRow, SavedTripRow } from "@/components/saved-rows";
import { SavedStopCard } from "@/components/saved-stop-card";
import { Empty } from "@/components/state";
import { Text } from "@/components/text";
import { useT } from "@/i18n";
import { placesInOrder, useSaved, type SavedRoute, type SavedStop, type SavedTrip } from "@/lib/saved";
import { layout, space } from "@/theme/tokens";

export default function Saved() {
  const saved = useSaved();
  const t = useT();
  const stops = saved.filter((s): s is SavedStop => s.type === "stop");
  const routes = saved.filter((s): s is SavedRoute => s.type === "route");
  const places = placesInOrder(saved);
  const trips = saved.filter((s): s is SavedTrip => s.type === "trip");

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {saved.length === 0 && (
        <Empty
          title={t.saved.empty.title}
          body={t.saved.empty.body}
          action={t.saved.empty.action}
          onAction={() => router.navigate("/search")}
        />
      )}

      {places.length > 0 && (
        <View style={styles.section}>
          <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
            {t.saved.places}
          </Text>
          {places.map((p) => (
            <SavedPlaceRow key={p.id} place={p} />
          ))}
        </View>
      )}

      {trips.length > 0 && (
        <View style={styles.section}>
          <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
            {t.saved.trips}
          </Text>
          {trips.map((trip) => (
            <SavedTripRow key={trip.id} trip={trip} />
          ))}
        </View>
      )}

      {stops.length > 0 && (
        <View style={styles.section}>
          <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
            {t.saved.stops}
          </Text>
          <View style={styles.grid}>
            {stops.map((s) => (
              <SavedStopCard key={s.id} saved={s} />
            ))}
          </View>
        </View>
      )}

      {routes.length > 0 && (
        <View style={styles.section}>
          <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
            {t.saved.routes}
          </Text>
          {routes.map((r) => (
            <RouteRow key={r.id} route={r} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: layout.tabBarClearance },
  section: { marginTop: space[3] },
  label: { paddingHorizontal: space[4], paddingVertical: space[2] },
  grid: { paddingHorizontal: space[4], gap: space[3] },
});
