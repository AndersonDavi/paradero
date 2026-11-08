import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { RouteRow } from "@/components/route-row";
import { SavedStopCard } from "@/components/saved-stop-card";
import { Empty } from "@/components/state";
import { Text } from "@/components/text";
import { useSaved, type SavedRoute, type SavedStop } from "@/lib/saved";
import { space } from "@/theme/tokens";

export default function Saved() {
  const saved = useSaved();
  const stops = saved.filter((s): s is SavedStop => s.type === "stop");
  const routes = saved.filter((s): s is SavedRoute => s.type === "route");

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {saved.length === 0 && (
        <Empty
          title="Guarda el paradero de tu casa y el del trabajo"
          body="Toca la estrella en cualquier paradero o ruta. Aparecen aquí y en Cerca con sus próximos buses, sin buscarlos cada mañana. Se guardan solo en tu teléfono."
          action="Buscar mi paradero"
          onAction={() => router.navigate("/search")}
        />
      )}

      {stops.length > 0 && (
        <View style={styles.section}>
          <Text variant="eyebrow" tone="faint" style={styles.label}>
            Paraderos
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
          <Text variant="eyebrow" tone="faint" style={styles.label}>
            Rutas
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
  content: { paddingBottom: 120 },
  section: { marginTop: space.md },
  label: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  grid: { paddingHorizontal: space.lg, gap: space.md },
});
