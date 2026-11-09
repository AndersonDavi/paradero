import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { alertText } from "@/lib/alerts";
import { signal, usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";
import type { Alert } from "@/transit/types";

import { Dot } from "./dot";
import { Text } from "./text";

export function AlertCard({ alerts }: { alerts: Alert[] }) {
  const p = usePalette();
  const t = useT();
  if (alerts.length === 0) return null;
  return (
    <View accessibilityRole="alert" style={[styles.card, { backgroundColor: p.surface }]}>
      <View style={styles.head}>
        <Dot color={signal.late} />
        <Text variant="caption" weight={600}>
          {t.alerts.heading(alerts.length)}
        </Text>
      </View>
      {alerts.slice(0, 3).map((a) => {
        const { title, detail } = alertText(a);
        return (
          <View key={a.id} style={styles.item}>
            <Text variant="headline">
              {title}
              {a.routes.length > 0 ? `  ·  ${a.routes.slice(0, 3).join(", ")}` : ""}
            </Text>
            <Text variant="callout" tone="muted">
              {detail}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderCurve: "continuous", padding: space[4], gap: space[3] },
  head: { flexDirection: "row", alignItems: "center", gap: space[2] },
  item: { gap: space[0.5] },
});
