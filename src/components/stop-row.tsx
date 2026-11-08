import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { prefetchStop } from "@/lib/api";
import { distanceText } from "@/lib/format";
import { usePalette } from "@/theme/colors";
import { size, space } from "@/theme/tokens";
import type { Stop } from "@/transit/types";

import { StationGlyph, StopSignGlyph } from "./glyphs";
import { Icon, icons } from "./icon";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";
import { Tile } from "./tile";

export function StopTile({ kind, tier = "md" }: { kind: Stop["kind"]; tier?: keyof typeof size.tile }) {
  const p = usePalette();
  const glyph = size.glyph[tier];
  return <Tile tier={tier}>{kind === "station" ? <StationGlyph size={glyph} color={p.text} /> : <StopSignGlyph size={glyph} color={p.text} cut={p.surface} />}</Tile>;
}

export function StopRow({ stop, nickname }: { stop: Stop; nickname?: string | null }) {
  const p = usePalette();
  const shown = stop.routes.slice(0, 5);
  const more = stop.routes.length - shown.length;
  const kind = stop.kind === "station" ? "Estación" : "Paradero";
  const title = nickname ?? stop.name;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${kind} ${title}${stop.distanceM ? `, a ${stop.distanceM} metros` : ""}. ${stop.routes.length} rutas.`}
      accessibilityHint="Abre las próximas llegadas"
      onPressIn={() => prefetchStop(stop.id)}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({ pathname: "/stop/[id]", params: { id: stop.id } });
      }}
      style={styles.row}>
      <StopTile kind={stop.kind} />
      <View style={styles.body}>
        <View style={styles.title}>
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {stop.accessible && <Icon name={icons.wheelchair} color={p.faint} size="xs" />}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {[kind, distanceText(stop.distanceM), nickname ? stop.name : null].filter(Boolean).join("  ·  ")}
        </Text>
        <View style={styles.badges}>
          {shown.map((r) => (
            <RouteBadge key={r.id} code={r.code} system={r.system} size="sm" />
          ))}
          {more > 0 && (
            <Text variant="caption" tone="faint">
              +{more}
            </Text>
          )}
        </View>
      </View>
      <Icon name={icons.chevron} color={p.faint} size="xs" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  body: { flex: 1, gap: space[1] },
  title: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[1], alignItems: "center", marginTop: space[0.5] },
});
