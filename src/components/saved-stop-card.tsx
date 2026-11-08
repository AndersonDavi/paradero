import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { prefetchStop, useStop } from "@/lib/api";
import type { SavedStop } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { radius, size, space } from "@/theme/tokens";

import { Minutes } from "./minutes";
import { Bone } from "./skeleton";
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
      onPressIn={() => prefetchStop(saved.id)}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({ pathname: "/stop/[id]", params: { id: saved.id } });
      }}
      style={[styles.card, { width, backgroundColor: p.elevated, borderColor: p.border, boxShadow: p.shadowSoft }]}>
      <View style={styles.titles}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {saved.nickname ? saved.name : "Paradero guardado"}
        </Text>
      </View>
      <View style={styles.list}>
        {isLoading && [0, 1].map((i) => <Bone key={i} width={i === 0 ? "60%" : "75%"} height={size.icon.md} />)}
        {!isLoading && next.length === 0 && (
          <Text variant="caption" tone="muted">
            Sin buses próximos
          </Text>
        )}
        {next.map((a, i) => (
          <View key={`${a.code}-${i}`} style={styles.line}>
            <RouteBadge code={a.code} system={a.system} size="sm" />
            <Minutes value={a.minutes} size="sm" />
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { padding: space[4], borderRadius: radius.xl, borderCurve: "continuous", gap: space[3], borderWidth: StyleSheet.hairlineWidth },
  titles: { gap: space[0.5] },
  list: { gap: space[2] },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space[2] },
});
