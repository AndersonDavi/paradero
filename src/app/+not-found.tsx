import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { useT } from "@/i18n";
import { usePalette } from "@/theme/colors";
import { layout, space } from "@/theme/tokens";

export default function NotFound() {
  const p = usePalette();
  const t = useT();
  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.copy}>
        <Text variant="eyebrow" tone="faint">
          {t.notFound.eyebrow}
        </Text>
        <Text variant="heading">{t.notFound.title}</Text>
        <Text variant="body" tone="muted">
          {t.notFound.body}
        </Text>
      </View>
      <Button label={t.notFound.home} onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: space[6], gap: space[8] },
  copy: { gap: space[3], maxWidth: layout.readable },
});
