import BottomSheet, { BottomSheetHandle, BottomSheetScrollView, type BottomSheetHandleProps } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { useEffect, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardEntry } from "@/components/card-entry";
import { FeedStatus } from "@/components/feed-status";
import { Glass } from "@/components/glass";
import { Icon, icons } from "@/components/icon";
import { Rail } from "@/components/rail";
import { SavedStopCard } from "@/components/saved-stop-card";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { StopRow } from "@/components/stop-row";
import { Text } from "@/components/text";
import { TransitMap } from "@/components/transit-map";
import type { MapHandle } from "@/components/transit-map.types";
import { useT } from "@/i18n";
import { useAccessibility } from "@/lib/accessibility";
import { prefetchStop, useHealth, useNearby } from "@/lib/api";
import { greeting } from "@/lib/format";
import { BOGOTA, useLocation } from "@/lib/location";
import { useSaved, type SavedStop } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

const SNAPS = ["30%", "58%", "92%"];

export default function Home() {
  const p = usePalette();
  const t = useT();
  const { screenReader } = useAccessibility();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const map = useRef<MapHandle>(null);
  const position = useSharedValue(height);
  const { state, retry } = useLocation();
  const health = useHealth();
  const savedStops = useSaved().filter((s): s is SavedStop => s.type === "stop");

  const here = state.status === "ready" ? { lat: state.lat, lon: state.lon } : null;
  const outside = state.status === "outside";
  const anchor = here ?? (outside ? BOGOTA : null);
  const nearby = useNearby(anchor);
  const stops = nearby.data?.stops ?? [];
  const closest = stops.slice(0, 3).map((s) => s.id).join(",");
  useEffect(() => {
    if (closest) closest.split(",").forEach(prefetchStop);
  }, [closest]);

  const locateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: position.value - size.control.lg - space[2] }],
    opacity: interpolate(position.value, [height * 0.25, height * 0.4], [0, 1], "clamp"),
  }));

  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <TransitMap
        key={anchor ? `${anchor.lat.toFixed(3)},${anchor.lon.toFixed(3)}` : "city"}
        ref={map}
        center={anchor ?? BOGOTA}
        zoom={anchor ? 16 : 12}
        stops={stops}
        padding={{ top: insets.top + size.control.lg + space[2], right: 0, bottom: height * 0.58, left: 0 }}
        onStopPress={(id) => router.push({ pathname: "/stop/[id]", params: { id } })}
      />
      </View>

      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + space[2] }]}>
        <FeedStatus feed={health.data?.feed} floating />
      </View>

      <Animated.View style={[styles.locate, locateStyle]} pointerEvents={screenReader ? "none" : "box-none"} accessibilityElementsHidden={screenReader} importantForAccessibility={screenReader ? "no-hide-descendants" : "auto"}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.home.locate}
          onPress={() => {
            void Haptics.selectionAsync();
            if (anchor) map.current?.flyTo(anchor.lat, anchor.lon, 16);
            else void retry();
          }}>
          <Glass interactive style={styles.locateGlass}>
            <Icon name={icons.location} color={p.text} size="md" />
          </Glass>
        </PressableScale>
      </Animated.View>

      <BottomSheet
        accessible={false}
        index={1}
        snapPoints={SNAPS}
        enableDynamicSizing={false}
        animatedPosition={position}
        topInset={insets.top}
        backgroundStyle={{ backgroundColor: p.background, borderRadius: radius.sheet, boxShadow: p.shadowUp, borderWidth: size.line.hair, borderColor: p.border }}
        handleIndicatorStyle={{ backgroundColor: p.fillStrong, width: size.control.sm }}
        handleComponent={QuietHandle}
>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
          <View style={styles.hello}>
            <Text variant="eyebrow" tone="faint">
              {greeting()}
            </Text>
            <Text variant="heading">{t.home.question}</Text>
          </View>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t.home.searchLabel}
            onPress={() => router.navigate("/search")}
            style={[styles.where, { backgroundColor: p.surface }]}>
            <Icon name={icons.search} color={p.text} size="md" weight="bold" />
            <Text variant="body" tone="muted">
              {t.home.searchPlaceholder}
            </Text>
          </PressableScale>

          <CardEntry />

          {savedStops.length > 0 && (
            <View style={styles.section}>
              <SectionTitle title={t.home.yourStops} />
              <Rail>
                {savedStops.slice(0, 6).map((s) => (
                  <SavedStopCard key={s.id} saved={s} width={layout.cardWidth} />
                ))}
              </Rail>
            </View>
          )}

          <View style={styles.section}>
            <SectionTitle
              title={outside ? t.home.fallbackArea : t.home.nearYou}
              detail={stops.length > 0 ? t.home.count(stops.length) : undefined}
            />
            {outside && (
              <Text variant="callout" weight={400} tone="muted" style={styles.note}>
                {t.home.outside}
              </Text>
            )}
            {state.status === "loading" && <SkeletonList rows={4} />}
            {state.status === "denied" && (
              <Empty
                title={t.home.denied.title}
                body={t.home.denied.body}
                action={t.home.denied.action}
                onAction={() => void retry()}
              />
            )}
            {anchor && nearby.isLoading && <SkeletonList rows={4} />}
            {anchor && nearby.isError && (
              <Empty title={t.home.failed.title} body={t.home.failed.body} action={t.common.retry} onAction={() => void nearby.refetch()} />
            )}
            {anchor && nearby.data && stops.length === 0 && <Empty title={t.home.none.title} body={t.home.none.body} />}
            {stops.map((stop) => (
              <StopRow key={stop.id} stop={stop} nickname={savedStops.find((s) => s.id === stop.id)?.nickname} />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

/** The grabber is for fingers. Screen readers scroll the sheet's list directly, so the handle stays out of their way. */
function QuietHandle(props: BottomSheetHandleProps) {
  return <BottomSheetHandle {...props} accessible={false} />;
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="title">{title}</Text>
      {detail && (
        <Text variant="caption" tone="muted">
          {detail}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: "absolute", left: space[4], right: space[4], alignItems: "flex-start" },
  locate: { position: "absolute", top: 0, right: space[4] },
  locateGlass: { width: size.control.md, height: size.control.md, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  hello: { paddingHorizontal: layout.gutter, paddingTop: space[1], gap: space[0.5] },
  where: {
    marginHorizontal: space[4],
    marginTop: space[4],
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[5],
    minHeight: size.control.lg,
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderCurve: "continuous",
  },
  section: { marginTop: space[6], gap: space[1] },
  sectionTitle: { paddingHorizontal: layout.gutter, marginBottom: space[1], gap: space[0.5] },
  note: { paddingHorizontal: space[4], marginBottom: space[2] },
});
