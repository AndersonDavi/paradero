import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { toast } from "sonner-native";

import { city, systemName } from "@/cities";
import { AlertCard } from "@/components/alert-card";
import { Button } from "@/components/button";
import { DetailScreen } from "@/components/detail-screen";
import { FeedStatus } from "@/components/feed-status";
import { BusGlyph } from "@/components/glyphs";
import { SaveButton } from "@/components/save-button";
import { RouteBadge } from "@/components/route-badge";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { Text } from "@/components/text";
import { TransitMap } from "@/components/transit-map";
import type { MapHandle } from "@/components/transit-map.types";
import { useT } from "@/i18n";
import { announce, useAccessibility, useLargeText } from "@/lib/accessibility";
import { useClock } from "@/lib/appearance";
import { wallClock } from "@/lib/format";
import { useEveryStop, useRoute } from "@/lib/api";
import { toggleRoute, useIsSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  // Times follow the rider's 12 or 24 hour clock; this redraws them when it changes.
  useClock();
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
  const hours = data?.route.firstDeparture && data.route.lastDeparture ? t.route.hours(wallClock(data.route.firstDeparture), wallClock(data.route.lastDeparture)) : null;
  // The route's stops on top; every other stop stays, faint, to see what is around. A station on the way keeps its
  // own look and colour (a trunk station on a feeder's route is still red), and the route's plain stops take its colour.
  const every = useEveryStop().data;
  const mapStops = useMemo(() => {
    if (!data) return [];
    const known = new Map((every ?? []).map((s) => [s.id, s]));
    const mine = new Set(data.stops.map((s) => s.id));
    const own = data.stops.map((s) => {
      const k = known.get(s.id);
      return k?.kind === "station" ? { ...s, kind: "station" as const, routes: k.routes } : { ...s, kind: "stop" as const };
    });
    return [...own, ...(every ?? []).filter((s) => !mine.has(s.id)).map((s) => ({ ...s, tone: "faint" as const }))];
  }, [data, every]);
  // A route with no timetable has no hours to show: the screen says so once instead of "does not run" every day.
  const untimed = data?.route.tripsPerWeek === 0;
  const special = !!data && !!city.specialRoutes?.includes(data.route.code);
  const buses = data?.feed.live ? data.buses.map((b) => ({ ...b, system: data.route.system })) : [];

  return (
    <>
      {data && <SaveButton saved={saved} label={saved ? t.route.unsave : t.route.save} onPress={save} />}

      <DetailScreen
        map={
          data && (
            <TransitMap
              ref={map}
              center={data.stops[0] ?? city.center}
              zoom={12}
              path={data.path}
              system={data.route.system}
              stops={mapStops}
              buses={buses}
              padding={layout.mapInset}
              onStopPress={(stopId) => router.push({ pathname: "/stop/[id]", params: { id: stopId } })}
            />
          )
        }>
        {isLoading && <SkeletonList rows={5} kind="arrival" />}
        {isError && !data && <Empty title={t.route.failed.title} body={t.route.failed.body} action={t.common.retry} onAction={() => void refetch()} />}

        {data && (
          <>
            <View style={styles.header}>
              <RouteBadge code={data.route.code} system={data.route.system} size="lg" solid labelled />
              <Text variant="heading" accessibilityRole="header">
                {data.route.name}
              </Text>
              <Text variant="callout" tone="muted">
                {[systemName(data.route.system, t.systems), data.route.variant ? (t.variants[data.route.variant] ?? data.route.variant) : null].filter(Boolean).join("  ·  ")}
              </Text>
            </View>

            {!untimed && (
              <View style={large ? styles.factsStacked : styles.facts}>
                <Fact label={t.route.first} value={data.route.firstDeparture ? wallClock(data.route.firstDeparture) : "–"} />
                <Fact label={t.route.last} value={data.route.lastDeparture ? wallClock(data.route.lastDeparture) : "–"} />
                <Fact label={t.route.onRoad} value={data.feed.live ? String(buses.length) : "–"} />
              </View>
            )}

            {data.days && !untimed && (
              <View style={styles.days}>
                <Text variant="eyebrow" tone="faint" accessibilityRole="header">
                  {t.route.byDay}
                </Text>
                {(["weekday", "saturday", "sunday"] as const).map((day) => {
                  const span = data.days?.[day];
                  const label = t.route.days[day];
                  const hours = span ? `${wallClock(span.first)} – ${wallClock(span.last)}` : t.route.noService;
                  const isToday = data.today === day;
                  return (
                    <View
                      key={day}
                      accessible
                      accessibilityLabel={`${isToday ? `${t.route.today}. ` : ""}${span ? t.route.dayHours(label, wallClock(span.first), wallClock(span.last)) : `${label}: ${t.route.noService}`}`}
                      style={styles.dayRow}>
                      <Text variant="callout" weight={isToday ? 600 : 400} style={{ flex: 1 }}>
                        {isToday ? `${label} · ${t.route.today}` : label}
                      </Text>
                      <Text variant="callout" tone={isToday ? "default" : "muted"} weight={isToday ? 600 : 400} tabular>
                        {hours}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* One word on the times, not two: a route with no timetable or a special one says so itself; any other
                route without live buses has the feed's notice, which already says the times come from the timetable. */}
            {!untimed && !special && <FeedStatus feed={data.feed} />}

            {(untimed || special || data.feed.live) && (
              <View style={[styles.note, { backgroundColor: p.surface }]}>
                <BusGlyph size={size.glyph.lg} color={p.text} cut={p.surface} />
                <Text variant="callout" tone="muted" style={{ flex: 1 }}>
                  {special ? t.route.special(city.operator) : untimed ? t.route.noTimetable(city.operator) : buses.length === 0 ? t.route.noneNow(hours) : t.route.onRoadNow(buses.length)}
                </Text>
              </View>
            )}

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
  days: { gap: space[2] },
  dayRow: { flexDirection: "row", alignItems: "baseline", gap: space[3] },
  stopRow: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: size.control.md },
  rail: { width: size.icon.md, alignItems: "center", alignSelf: "stretch" },
  line: { width: size.line.rule, flex: 1 },
  node: { width: size.dot.md, height: size.dot.md, borderRadius: radius.pill, borderWidth: size.line.rule },
  edgeNode: { width: size.icon.xs, height: size.icon.xs, borderRadius: radius.pill, borderWidth: size.line.bar },
});
