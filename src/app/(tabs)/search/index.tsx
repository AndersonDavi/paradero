import { Stack, useLocalSearchParams } from "expo-router";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { SearchBarCommands } from "react-native-screens";

import { Chip } from "@/components/chip";
import { RouteRow } from "@/components/route-row";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { StopRow } from "@/components/stop-row";
import { Text } from "@/components/text";
import { useSearch } from "@/lib/api";
import { motion } from "@/theme/motion";
import { layout, space } from "@/theme/tokens";

const EXAMPLES = ["K635", "B10", "Portal Norte", "Calle 72", "H710", "TransMiCable"];

export default function Search() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(q ?? "");
  const bar = useRef<SearchBarCommands>(null);

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => bar.current?.setText(q), 350);
    return () => clearTimeout(t);
  }, [q]);
  const query = useDeferredValue(text);
  const { data, isFetching, isError, refetch } = useSearch(query);
  const typed = query.trim().length >= 2;
  const nothing = data && data.routes.length === 0 && data.stops.length === 0;

  const pick = (value: string) => {
    bar.current?.setText(value);
    setText(value);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            ref: bar,
            placeholder: "Ruta, estación o paradero",
            autoCapitalize: "characters",
            hideWhenScrolling: false,
            onChangeText: (e) => setText(e.nativeEvent.text),
            onCancelButtonPress: () => setText(""),
          },
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        {!typed && (
          <Animated.View entering={motion.appear()} style={styles.hint}>
            <Text variant="title">Escribe la ruta como aparece en el bus</Text>
            <Text variant="callout" tone="muted">
              También encontramos las rutas SITP que van en pareja, como la K635 y la H635, aunque TransMilenio las publique juntas.
            </Text>
            <View style={styles.chips}>
              {EXAMPLES.map((e) => (
                <Chip key={e} label={e} accessibilityLabel={`Buscar ${e}`} onPress={() => pick(e)} />
              ))}
            </View>
          </Animated.View>
        )}

        {typed && isFetching && !data && <SkeletonList rows={5} />}
        {typed && isError && <Empty title="No pudimos buscar" body="Revisa tu conexión e intenta de nuevo." action="Reintentar" onAction={() => void refetch()} />}
        {typed && nothing && <Empty title={`Nada con “${query.trim()}”`} body="Prueba solo el código de la ruta, como B10, o una parte del nombre del paradero." />}

        {typed && data && data.routes.length > 0 && (
          <View style={styles.section}>
            <Text variant="eyebrow" tone="faint" style={styles.label}>
              Rutas
            </Text>
            {data.routes.map((r) => (
              <RouteRow key={r.id} route={r} />
            ))}
          </View>
        )}

        {typed && data && data.stops.length > 0 && (
          <View style={styles.section}>
            <Text variant="eyebrow" tone="faint" style={styles.label}>
              Estaciones y paraderos
            </Text>
            {data.stops.map((s) => (
              <StopRow key={s.id} stop={s} />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: layout.tabBarClearance },
  hint: { padding: space[4], gap: space[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[2] },
  section: { marginTop: space[3] },
  label: { paddingHorizontal: space[4], paddingVertical: space[2] },
});
