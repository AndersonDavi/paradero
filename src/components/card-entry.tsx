import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";

import { useT } from "@/i18n";
import { hasCardReader } from "@/lib/tullave";
import { usePalette } from "@/theme/colors";
import { radius, size, space } from "@/theme/tokens";

import { Icon, icons } from "./icon";
import { Text } from "./text";
import { Tile } from "./tile";

/** The way into the TuLlave reader. Hidden on builds and platforms that cannot read cards. */
export function CardEntry() {
  const p = usePalette();
  const t = useT();
  if (!hasCardReader) return null;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t.card.entry.title}. ${t.card.entry.body}`}
      onPress={() => {
        void Haptics.selectionAsync();
        router.push("/card");
      }}
      style={[styles.card, { borderColor: p.border }]}>
      <Tile tier="md">
        <Icon name={icons.contactless} color={p.text} size="md" />
      </Tile>
      <View style={styles.body}>
        <Text variant="headline" weight={600}>
          {t.card.entry.title}
        </Text>
        <Text variant="caption" tone="muted">
          {t.card.entry.body}
        </Text>
      </View>
      <Icon name={icons.chevron} color={p.faint} size="xs" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    marginHorizontal: space[4],
    marginTop: space[3],
    padding: space[3],
    borderWidth: size.line.hair,
    borderRadius: radius.lg,
    borderCurve: "continuous",
  },
  body: { flex: 1, gap: space[0.5] },
});
