import { Stack } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/text";
import { tag, useT } from "@/i18n";
import { usePalette } from "@/theme/colors";
import { layout, space } from "@/theme/tokens";

/** When the policy last changed. Every claim in it must match the code; change both together, and the public copy on transmi.usecroma.com. */
const UPDATED = "2026-11-08T12:00:00-05:00";

/** The privacy policy, in the same plain words as the app. Linked from Bien público and from the App Store. */
export default function Privacy() {
  const p = usePalette();
  const t = useT();
  const updated = new Intl.DateTimeFormat(tag(), { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(new Date(UPDATED));
  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: t.privacy.screen }} />
      <View style={styles.head}>
        <Text variant="eyebrow" tone="faint">
          {t.privacy.eyebrow}
        </Text>
        <Text variant="heading">{t.privacy.title}</Text>
        <Text variant="callout" tone="muted">
          {t.privacy.updated(updated)}
        </Text>
      </View>
      {t.privacy.sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text variant="title">{s.title}</Text>
          <Text variant="body" tone="muted">
            {s.body}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[6], paddingBottom: layout.screenEnd, gap: space[8], maxWidth: layout.readable * 2, width: "100%", alignSelf: "center" },
  head: { gap: space[3] },
  section: { gap: space[2] },
});
