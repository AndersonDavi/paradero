import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { distanceText } from "@/lib/format";
import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";
import type { Stop } from "@/transit/types";

import { StationGlyph, StopSignGlyph } from "./glyphs";
import { Icon, icons } from "./icon";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";

export function StopTile({ kind, size = 44 }: { kind: Stop["kind"]; size?: number }) {
  const p = usePalette();
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: p.surface }]}>
      {kind === "station" ? <StationGlyph size={size * 0.46} color={p.text} /> : <StopSignGlyph size={size * 0.48} color={p.text} cut={p.surface} />}
    </View>
  );
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
          {stop.accessible && <Icon name={icons.wheelchair} color={p.faint} size={13} />}
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
      <Icon name={icons.chevron} color={p.faint} size={12} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md + 2, paddingHorizontal: space.lg, paddingVertical: space.md },
  tile: { borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderCurve: "continuous" },
  body: { flex: 1, gap: 4 },
  title: { flexDirection: "row", alignItems: "center", gap: 6 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center", marginTop: 2 },
});
