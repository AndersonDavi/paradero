import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { since } from "@/lib/format";
import { signal, usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";
import type { Feed } from "@/transit/types";

import { Dot } from "./dot";
import { Glass } from "./glass";
import { Text } from "./text";

function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/** Says where every time comes from. Riders forgive old data; they don't forgive being told it is live when it isn't. */
export function FeedStatus({ feed, floating = false }: { feed: Feed | undefined; floating?: boolean }) {
  const p = usePalette();
  useTick(5_000);
  if (!feed) return null;

  const title = feed.live ? "En vivo" : "Horario programado";
  const detail = feed.live ? `Actualizado ${since(feed.asOf)}` : "TransMilenio no está publicando posiciones";
  const label = `${title}. ${detail}`;

  if (floating) {
    return (
      <Glass style={styles.floating}>
        <View accessible accessibilityLabel={label} style={styles.pill}>
          <Dot color={feed.live ? signal.live : signal.late} pulse={feed.live} />
          <Text variant="caption" weight={600}>
            {title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {feed.live ? since(feed.asOf) : "sin datos en vivo"}
          </Text>
        </View>
      </Glass>
    );
  }

  return (
    <View accessible accessibilityLabel={label} style={[styles.inline, { borderColor: p.separator }]}>
      <Dot color={feed.live ? signal.live : signal.late} pulse={feed.live} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight={600}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {feed.live ? detail : `Sin datos en vivo ${since(feed.asOf).replace("hace", "desde hace").replace(/\.$/, "")}. Usamos el horario publicado.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floating: { borderRadius: radius.pill, overflow: "hidden" },
  pill: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 9, paddingHorizontal: 14 },
  inline: { flexDirection: "row", alignItems: "flex-start", gap: space.md, padding: space.md + 2, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderCurve: "continuous", paddingTop: space.md + 4 },
});
