import { Stack, useLocalSearchParams } from "expo-router";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import type { SearchBarCommands } from "react-native-screens";

import { city } from "@/cities";
import { Chip } from "@/components/chip";
import { Icon, icons } from "@/components/icon";
import { PlaceRow } from "@/components/place-row";
import { RouteRow } from "@/components/route-row";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { StopRow } from "@/components/stop-row";
import { Text } from "@/components/text";
import { useT } from "@/i18n";
import { announce } from "@/lib/accessibility";
import { canPlan, useSearch } from "@/lib/api";
import { useLocation } from "@/lib/location";
import { usePalette } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { fonts, layout, radius, size, space, type } from "@/theme/tokens";

/** Android has no search bar in the header like iOS, so the field sits at the top of the screen, always visible. */
const ANDROID = Platform.OS === "android";

export default function Search() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(q ?? "");
  const [linked, setLinked] = useState(q);
  if (q !== linked) {
    setLinked(q);
    if (q) setText(q);
  }
  const bar = useRef<SearchBarCommands>(null);
  const t = useT();

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => bar.current?.setText(q), 350);
    return () => clearTimeout(t);
  }, [q]);
  const query = useDeferredValue(text);
  const { state: here } = useLocation();
  const { data, isFetching, isError, refetch } = useSearch(query, here.status === "ready" ? here : null);
  const typed = query.trim().length >= 2;
  const places = data?.places ?? [];
  const nothing = data && data.routes.length === 0 && data.stops.length === 0 && places.length === 0;
  const placeholder = canPlan() ? t.search.placeholderPlaces : t.search.placeholder;

  useEffect(() => {
    if (!typed) return;
    if (isError) announce(t.search.failed.title);
    else if (data) announce(nothing ? t.search.nothing(query.trim()) : `${t.search.routes}: ${data.routes.length}. ${places.length ? `${t.search.places}: ${places.length}. ` : ""}${t.search.stops}: ${data.stops.length}.`);
  }, [data, isError, typed, nothing, query, t, places.length]);

  const pick = (value: string) => {
    bar.current?.setText(value);
    setText(value);
  };

  return (
    <>
      <Stack.Screen
        options={ANDROID ? {} : {
          headerSearchBarOptions: {
            ref: bar,
            placeholder,
            autoCapitalize: canPlan() ? "sentences" : "characters",
            hideWhenScrolling: false,
            onChangeText: (e) => setText(e.nativeEvent.text),
            onCancelButtonPress: () => setText(""),
          },
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        {ANDROID && <Field value={text} onChange={setText} placeholder={placeholder} />}

        {!typed && (
          <Animated.View entering={motion.appear()} style={styles.hint}>
            <Text variant="title">{t.search.hint}</Text>
            <Text variant="callout" tone="muted">
              {canPlan() ? t.search.placesHint : t.search.pairs}
            </Text>
            <View style={styles.chips}>
              {city.examples.map((e) => (
                <Chip key={e} label={e} accessibilityLabel={`${e}, ${t.search.example(e)}`} onPress={() => pick(e)} />
              ))}
            </View>
          </Animated.View>
        )}

        {typed && isFetching && !data && <SkeletonList rows={5} />}
        {typed && isError && <Empty title={t.search.failed.title} body={t.search.failed.body} action={t.common.retry} onAction={() => void refetch()} />}
        {typed && nothing && <Empty title={t.search.nothing(query.trim())} body={t.search.nothingBody} />}

        {typed && data && data.routes.length > 0 && (
          <View style={styles.section}>
            <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
              {t.search.routes}
            </Text>
            {data.routes.map((r) => (
              <RouteRow key={r.id} route={r} />
            ))}
          </View>
        )}

        {typed && places.length > 0 && (
          <View style={styles.section}>
            <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
              {t.search.places}
            </Text>
            {places.map((place) => (
              <PlaceRow key={place.id} place={place} />
            ))}
          </View>
        )}

        {typed && data && data.stops.length > 0 && (
          <View style={styles.section}>
            <Text variant="eyebrow" tone="faint" accessibilityRole="header" style={styles.label}>
              {t.search.stops}
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

function Field({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={[styles.field, { backgroundColor: p.surface }]}>
      <Icon name={icons.search} color={p.text} size="md" weight="bold" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.faint}
        autoCapitalize={canPlan() ? "sentences" : "characters"}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={[styles.input, { color: p.text }]}
      />
      {value.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={t.common.clear} onPress={() => onChange("")} hitSlop={space[3]}>
          <Icon name={icons.close} color={p.faint} size="md" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginHorizontal: space[4],
    marginTop: space[2],
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[5],
    minHeight: size.control.lg,
    borderRadius: radius.lg,
  },
  input: { flex: 1, fontFamily: fonts[400], fontSize: type.body.fontSize, paddingVertical: space[3] },
  content: { paddingBottom: layout.tabBarClearance },
  hint: { padding: space[4], gap: space[3] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[2] },
  section: { marginTop: space[3] },
  label: { paddingHorizontal: space[4], paddingVertical: space[2] },
});
