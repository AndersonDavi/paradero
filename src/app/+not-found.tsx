import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { usePalette } from "@/theme/colors";
import { layout, space } from "@/theme/tokens";

export default function NotFound() {
  const p = usePalette();
  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.copy}>
        <Text variant="eyebrow" tone="faint">
          Paradero no encontrado
        </Text>
        <Text variant="heading">Este enlace no lleva a ningún lado.</Text>
        <Text variant="body" tone="muted">
          Puede que la ruta o el paradero haya cambiado de código. Busca de nuevo desde el inicio.
        </Text>
      </View>
      <Button label="Volver al inicio" onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: space[6], gap: space[8] },
  copy: { gap: space[3], maxWidth: layout.readable },
});
