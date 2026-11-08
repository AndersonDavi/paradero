import { Stack } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/text";
import { PRIVACY_SECTIONS, PRIVACY_TITLE, PRIVACY_UPDATED } from "@/content/privacy";
import { usePalette } from "@/theme/colors";
import { layout, space } from "@/theme/tokens";

/** The privacy policy, in the same plain Spanish as the app. Linked from Bien público and from the App Store. */
export default function Privacy() {
  const p = usePalette();
  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: "Privacidad" }} />
      <View style={styles.head}>
        <Text variant="eyebrow" tone="faint">
          Paradero · Bien público digital de Croma
        </Text>
        <Text variant="heading">{PRIVACY_TITLE}</Text>
        <Text variant="callout" tone="muted">
          Actualizada el {PRIVACY_UPDATED}.
        </Text>
      </View>
      {PRIVACY_SECTIONS.map((s) => (
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
