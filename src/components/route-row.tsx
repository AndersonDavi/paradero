import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { prefetchRoute } from "@/lib/api";
import { systems, usePalette } from "@/theme/colors";
import { layout, space } from "@/theme/tokens";
import { spokenCode } from "@/transit/codes";
import type { RouteRef } from "@/transit/types";

import { Icon, icons } from "./icon";
import { RouteBadge } from "./route-badge";
import { Text } from "./text";

export function RouteRow({ route }: { route: Pick<RouteRef, "id" | "code" | "name" | "system"> }) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Ruta ${spokenCode(route.code)}, ${route.name}`}
      accessibilityHint="Abre el recorrido y los buses en vía"
      onPressIn={() => prefetchRoute(route.id)}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({ pathname: "/route/[id]", params: { id: route.id } });
      }}
      style={styles.row}>
      <View style={styles.badge}>
        <RouteBadge code={route.code} system={route.system} />
      </View>
      <View style={styles.body}>
        <Text variant="headline" weight={500} numberOfLines={2}>
          {route.name}
        </Text>
        <Text variant="caption" tone="muted">
          {systems[route.system].label}
        </Text>
      </View>
      <Icon name={icons.chevron} color={p.faint} size="xs" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  badge: { minWidth: layout.badgeColumn },
  body: { flex: 1, gap: space[0.5] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
});
