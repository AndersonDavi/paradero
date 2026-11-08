import { Stack } from "expo-router";
import { PressableScale } from "pressto";
import { useDeferredValue, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { SearchBarCommands } from "react-native-screens";

import { RouteRow } from "@/components/route-row";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { StopRow } from "@/components/stop-row";
import { Text } from "@/components/text";
import { useSearch } from "@/lib/api";
import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

const EXAMPLES = ["K635", "B10", "Portal Norte", "Calle 72", "H710", "TransMiCable"];

export default function Search() {
  const p = usePalette();
  const [text, setText] = useState("");
  const bar = useRef<SearchBarCommands>(null);
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
          <Animated.View entering={FadeIn.duration(250)} style={styles.hint}>
            <Text variant="title">Escribe la ruta como aparece en el bus</Text>
            <Text variant="callout" tone="muted">
              También encontramos las rutas SITP que van en pareja, como la K635 y la H635, aunque TransMilenio las publique juntas.
            </Text>
            <View style={styles.chips}>
              {EXAMPLES.map((e) => (
                <PressableScale key={e} accessibilityRole="button" accessibilityLabel={`Buscar ${e}`} onPress={() => pick(e)} style={[styles.chip, { borderColor: p.separator }]}>
                  <Text variant="callout" weight={500}>
                    {e}
                  </Text>
                </PressableScale>
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
  content: { paddingBottom: 120 },
  hint: { padding: space.lg, gap: space.sm + 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  chip: { paddingHorizontal: space.lg, height: 38, justifyContent: "center", borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  section: { marginTop: space.md },
  label: { paddingHorizontal: space.lg, paddingVertical: space.sm },
});
