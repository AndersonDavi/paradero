import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { toast } from "sonner-native";

import { AlertCard } from "@/components/alert-card";
import { Button } from "@/components/button";
import { DetailScreen } from "@/components/detail-screen";
import { FeedStatus } from "@/components/feed-status";
import { BusGlyph } from "@/components/glyphs";
import { RouteBadge } from "@/components/route-badge";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { Text } from "@/components/text";
import { TransitMap } from "@/components/transit-map";
import type { MapHandle } from "@/components/transit-map.types";
import { useT } from "@/i18n";
import { announce, useAccessibility, useLargeText } from "@/lib/accessibility";
import { useRoute } from "@/lib/api";
import { BOGOTA } from "@/lib/location";
import { toggleRoute, useIsSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const { reduceMotion } = useAccessibility();
  const map = useRef<MapHandle>(null);
  const { data, isLoading, isError, refetch } = useRoute(id);
  const saved = useIsSaved("route", id);

  const path = data?.path;
  useEffect(() => {
    if (!path || path.length < 2) return;
    const timer = setTimeout(() => map.current?.fit(path), reduceMotion ? 0 : 350);
    return () => clearTimeout(timer);
  }, [path, reduceMotion]);

  const save = () => {
    if (!data) return;
    const added = toggleRoute(data.route);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success(t.route.saved.title, { description: t.route.saved.body });
    else toast(t.route.removed);
    announce(added ? `${t.route.saved.title}. ${t.route.saved.body}` : t.route.removed);
  };

  const tint = p.ink;
  const hours = data?.route.firstDeparture && data.route.lastDeparture ? t.route.hours(data.route.firstDeparture, data.route.lastDeparture) : null;
  const buses = data?.feed.live ? data.buses : [];

  return (
    <>
      {data && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={saved ? "star.fill" : "star"}
            tintColor={p.text}
            accessibilityLabel={saved ? t.route.unsave : t.route.save}
            onPress={save}
          />
        </Stack.Toolbar>
      )}

      <DetailScreen
        map={
          data && (
            <TransitMap
              ref={map}
              center={data.stops[0] ?? BOGOTA}
              zoom={12}
              path={data.path}
              system={data.route.system}
              stops={data.stops.map((s) => ({ ...s, kind: "stop" as const }))}
              buses={buses}
              padding={layout.mapInset}
              onStopPress={(stopId) => router.push({ pathname: "/stop/[id]", params: { id: stopId } })}
            />
          )
        }>
        {isLoading && <SkeletonList rows={5} kind="arrival" />}
        {isError && <Empty title={t.route.failed.title} body={t.route.failed.body} action={t.common.retry} onAction={() => void refetch()} />}

        {data && (
          <>
            <View style={styles.header}>
              <RouteBadge code={data.route.code} system={data.route.system} size="lg" solid labelled />
              <Text variant="heading" accessibilityRole="header">
                {data.route.name}
              </Text>
              <Text variant="callout" tone="muted">
                {[t.systems[data.route.system], data.route.variant ? (t.variants[data.route.variant] ?? data.route.variant) : null].filter(Boolean).join("  ·  ")}
              </Text>
            </View>

            <View style={large ? styles.factsStacked : styles.facts}>
              <Fact label={t.route.first} value={data.route.firstDeparture ?? "–"} />
              <Fact label={t.route.last} value={data.route.lastDeparture ?? "–"} />
              <Fact label={t.route.onRoad} value={data.feed.live ? String(buses.length) : "–"} />
            </View>

            <FeedStatus feed={data.feed} />

            <View style={[styles.note, { backgroundColor: p.surface }]}>
              <BusGlyph size={size.glyph.lg} color={p.text} cut={p.surface} />
              <Text variant="callout" tone="muted" style={{ flex: 1 }}>
                {!data.feed.live ? t.route.notPublishing : buses.length === 0 ? t.route.noneNow(hours) : t.route.onRoadNow(buses.length)}
              </Text>
            </View>

            <AlertCard alerts={data.alerts} />

            <View>
              <Text variant="title" style={styles.heading}>
                {t.route.stops(data.stops.length)}
              </Text>
              {data.stops.map((s, i) => {
                const edge = i === 0 || i === data.stops.length - 1;
                return (
                  <PressableScale
                    key={`${s.id}-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={t.route.stopLabel(i + 1, s.name)}
                    onPress={() => router.push({ pathname: "/stop/[id]", params: { id: s.id } })}
                    style={styles.stopRow}>
                    <View style={styles.rail}>
                      <View style={[styles.line, { backgroundColor: tint, opacity: i === 0 ? 0 : 1 }]} />
                      <View style={[edge ? styles.edgeNode : styles.node, { borderColor: tint, backgroundColor: edge ? tint : p.background }]} />
                      <View style={[styles.line, { backgroundColor: tint, opacity: i === data.stops.length - 1 ? 0 : 1 }]} />
                    </View>
                    <Text variant={edge ? "headline" : "callout"} weight={edge ? 600 : 400} numberOfLines={large ? undefined : 1} style={{ flex: 1 }}>
                      {s.name}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </>
        )}
        {data && (
          <Button
            variant="quiet"
            height="md"
            label={t.route.report}
            onPress={() => router.push({ pathname: "/report", params: { routeId: data.route.id, routeCode: data.route.code } })}
          />
        )}
      </DetailScreen>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.fact, { borderColor: p.separator }]}>
      <Text variant="eyebrow" tone="faint">
        {label}
      </Text>
      <Text variant="title" tabular accessibilityRole="text">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[2] },
  facts: { flexDirection: "row", gap: space[2] },
  factsStacked: { gap: space[2] },
  fact: { flex: 1, padding: space[3], borderRadius: radius.lg, borderCurve: "continuous", gap: space[1], borderWidth: StyleSheet.hairlineWidth },
  note: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: "continuous" },
  heading: { marginBottom: space[2] },
  stopRow: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: size.control.md },
  rail: { width: size.icon.md, alignItems: "center", alignSelf: "stretch" },
  line: { width: size.line.rule, flex: 1 },
  node: { width: size.dot.md, height: size.dot.md, borderRadius: radius.pill, borderWidth: size.line.rule },
  edgeNode: { width: size.icon.xs, height: size.icon.xs, borderRadius: radius.pill, borderWidth: size.line.bar },
});
