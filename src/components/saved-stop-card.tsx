import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { useStop } from "@/lib/api";
import type { SavedStop } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

import { Minutes } from "./minutes";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";

/** A saved stop with its next buses, so the answer is on screen before the rider taps anything. */
export function SavedStopCard({ saved, width }: { saved: SavedStop; width?: number }) {
  const p = usePalette();
  const { data, isLoading } = useStop(saved.id);
  const next = data?.arrivals.slice(0, 2) ?? [];
  const title = saved.nickname ?? saved.name;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${next.map((a) => `${a.code} en ${a.minutes ?? "?"} minutos`).join(". ")}`}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({ pathname: "/stop/[id]", params: { id: saved.id } });
      }}
      style={[styles.card, { width, backgroundColor: p.elevated, borderColor: p.border, boxShadow: p.shadowSoft }]}>
      <View style={{ gap: 2 }}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {saved.nickname ? saved.name : "Paradero guardado"}
        </Text>
      </View>
      <View style={styles.list}>
        {isLoading && (
          <Text variant="caption" tone="muted">
            Buscando buses…
          </Text>
        )}
        {!isLoading && next.length === 0 && (
          <Text variant="caption" tone="muted">
            Sin buses próximos
          </Text>
        )}
        {next.map((a, i) => (
          <View key={`${a.code}-${i}`} style={styles.line}>
            <RouteBadge code={a.code} system={a.system} size="sm" />
            <Minutes value={a.minutes} size={20} />
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.xl, borderCurve: "continuous", gap: space.md, minHeight: 132, borderWidth: StyleSheet.hairlineWidth },
  list: { gap: space.sm },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
});
