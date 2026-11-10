import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { useLargeText } from "@/lib/accessibility";
import { prefetchStop, useStop } from "@/lib/api";
import { spokenCode, spokenWhen } from "@/lib/format";
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
  const t = useT();
  const large = useLargeText();
  const title = saved.nickname ?? saved.name;
  const lines = isLoading ? [t.speech.loading] : next.length === 0 ? [t.stop.noBuses] : next.map((a) => t.speech.savedLine(t.speech.route(spokenCode(a.code)), spokenWhen(a.minutes)));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t.speech.savedCard(title, lines)}
      accessibilityState={{ busy: isLoading }}
      onPressIn={() => prefetchStop(saved.id)}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({ pathname: "/stop/[id]", params: { id: saved.id } });
      }}
      style={[styles.card, { width: large ? undefined : width, borderColor: p.border }]}>
      <View style={styles.titles}>
        <Text variant="headline" numberOfLines={large ? undefined : 1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={large ? undefined : 1}>
          {saved.nickname ? saved.name : t.stop.savedCard}
        </Text>
      </View>
      <View style={styles.list}>
        {isLoading && [0, 1].map((i) => <Bone key={i} width={i === 0 ? "60%" : "75%"} height={size.icon.md} />)}
        {!isLoading && next.length === 0 && (
          <Text variant="caption" tone="muted">
            {t.stop.noBuses}
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
  card: { padding: space[4], borderRadius: radius.xl, borderCurve: "continuous", gap: space[3], borderWidth: size.line.hair },
  titles: { gap: space[0.5] },
  list: { gap: space[2] },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space[2] },
});
