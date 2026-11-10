import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { useLargeText } from "@/lib/accessibility";
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
  const large = useLargeText();
  const t = useT();
  useTick(5_000);
  if (!feed) return null;

  const title = feed.live ? t.feed.live : t.feed.scheduled;
  const detail = feed.live ? t.feed.updated(since(feed.asOf)) : t.feed.noLiveSince(since(feed.asOf));
  const label = `${title}. ${feed.live ? detail : `${t.feed.notPublishing}. ${detail}`}`;

  if (floating) {
    return (
      <Glass style={styles.floating}>
        <View accessible accessibilityLabel={label} style={styles.pill}>
          <Dot color={feed.live ? signal.live : signal.late} pulse={feed.live} />
          <Text variant="caption" weight={600}>
            {title}
          </Text>
          {!large && (
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.shrink}>
              {feed.live ? since(feed.asOf) : t.feed.noLive}
            </Text>
          )}
        </View>
      </Glass>
    );
  }

  if (feed.live) {
    return (
      <View accessible accessibilityLabel={label} style={styles.line}>
        <Dot color={signal.live} pulse />
        <Text variant="caption" weight={600}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={large ? undefined : 1} style={styles.shrink}>
          {detail}
        </Text>
      </View>
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
          {detail}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floating: { borderRadius: radius.pill, overflow: "hidden", maxWidth: "100%" },
  shrink: { flexShrink: 1 },
  line: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[2] },
  pill: { flexDirection: "row", alignItems: "center", gap: space[2], paddingVertical: space[2], paddingHorizontal: space[3] },
  inline: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    paddingTop: space[4],
  },
});
