import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { PressableScale } from "pressto";
import { useEffect, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { prefetchStop, useHealth, useNearby } from "@/lib/api";
import { greeting } from "@/lib/format";
import { BOGOTA, useLocation } from "@/lib/location";
import { useSaved, type SavedStop } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

const SNAPS = ["30%", "58%", "92%"];

export default function Home() {
  const p = usePalette();
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

      <Animated.View style={[styles.locate, locateStyle]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Centrar el mapa en tu ubicación"
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
        index={1}
        snapPoints={SNAPS}
        enableDynamicSizing={false}
        animatedPosition={position}
        topInset={insets.top}
        backgroundStyle={{ backgroundColor: p.background, borderRadius: radius.sheet, boxShadow: p.shadowUp }}
        handleIndicatorStyle={{ backgroundColor: p.fillStrong, width: size.control.sm }}
>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + layout.tabBarClearance }} showsVerticalScrollIndicator={false}>
          <View style={styles.hello}>
            <Text variant="eyebrow" tone="faint">
              {greeting()}
            </Text>
            <Text variant="heading">¿Para dónde vas?</Text>
          </View>

          <PressableScale
            accessibilityRole="search"
            accessibilityLabel="Buscar una ruta, estación o paradero"
            onPress={() => router.navigate("/search")}
            style={[styles.where, { backgroundColor: p.surface }]}>
            <Icon name={icons.search} color={p.text} size="md" weight="bold" />
            <Text variant="body" tone="muted">
              Ruta, estación o paradero
            </Text>
          </PressableScale>

          {savedStops.length > 0 && (
            <View style={styles.section}>
              <SectionTitle title="Tus paraderos" />
              <Rail>
                {savedStops.slice(0, 6).map((s) => (
                  <SavedStopCard key={s.id} saved={s} width={layout.cardWidth} />
                ))}
              </Rail>
            </View>
          )}

          <View style={styles.section}>
            <SectionTitle
              title={outside ? "En Chapinero" : "Cerca de ti"}
              detail={stops.length > 0 ? `${stops.length} paraderos a menos de 700 m` : undefined}
            />
            {outside && (
              <Text variant="callout" weight={400} tone="muted" style={styles.note}>
                Parece que no estás en Bogotá. Te mostramos Chapinero; busca cualquier otro paradero arriba.
              </Text>
            )}
            {state.status === "loading" && <SkeletonList rows={4} />}
            {state.status === "denied" && (
              <Empty
                title="Sin tu ubicación, igual te llevamos"
                body="Busca cualquier ruta o paradero. Si activas la ubicación, te mostramos los que tienes a una cuadra. Nunca la guardamos."
                action="Activar ubicación"
                onAction={() => void retry()}
              />
            )}
            {anchor && nearby.isLoading && <SkeletonList rows={4} />}
            {anchor && nearby.isError && (
              <Empty title="No pudimos cargar los paraderos" body="Revisa tu conexión. Lo intentamos de nuevo apenas vuelva." action="Reintentar" onAction={() => void nearby.refetch()} />
            )}
            {anchor && nearby.data && stops.length === 0 && <Empty title="No hay paraderos a 700 m" body="Busca el nombre de una estación o la ruta que tomas." />}
            {stops.map((stop) => (
              <StopRow key={stop.id} stop={stop} nickname={savedStops.find((s) => s.id === stop.id)?.nickname} />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
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
