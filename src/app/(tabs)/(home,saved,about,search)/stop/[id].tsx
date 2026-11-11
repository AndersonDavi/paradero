import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { PressableScale } from "pressto";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { toast } from "sonner-native";

import { AlertCard } from "@/components/alert-card";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { city } from "@/cities";
import { DetailScreen } from "@/components/detail-screen";
import { ArrivalRow } from "@/components/arrival-row";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { NextBus } from "@/components/next-bus";
import { SaveButton } from "@/components/save-button";
import { RouteBadge } from "@/components/route-badge";
import { RouteRow } from "@/components/route-row";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { StopTile } from "@/components/stop-row";
import { Text } from "@/components/text";
import { TransitMap } from "@/components/transit-map";
import type { MapHandle } from "@/components/transit-map.types";
import { useT } from "@/i18n";
import { announce, useLargeText } from "@/lib/accessibility";
import { knownStop, useEveryStop, useRoute, useStop } from "@/lib/api";
import { spokenCode } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { toggleStop, useIsSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";
import { wayTowards } from "@/transit/follow";
import { metresBetween } from "@/transit/path";
import type { Arrival } from "@/transit/types";

/** A rider this close to the stop is kept in the frame with the bus, to judge the walk against the wait. Further away, the map would zoom out too far to read. */
const RIDER_IN_FRAME_M = 1_500;
/** How long the map rests after framing a bus before it will move again on its own. */
const FRAME_REST_MS = 20_000;

/** How close the map comes to a stop. */
const STOP_ZOOM = 15.5;

const keyOf = (a: Arrival) => `${a.routeId ?? a.code}-${a.plate ?? a.vehicle ?? a.at}`;

export default function StopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const { data, isLoading, isError, refetch } = useStop(id);
  // The stop's name and place are known before its arrivals: the screen shows them while those load.
  const stop = data?.stop ?? knownStop(id);
  // This stop stands out; the others stay on the map, faint, to see what is around and open them.
  const every = useEveryStop().data;
  const saved = useIsSaved("stop", id);
  const [only, setOnly] = useState<string | null>(null);
  // A mouse cannot drag a row sideways, so on the web the route chips wrap onto more lines instead.
  const wrap = process.env.EXPO_OS === "web";

  // In a fixed order, so the chips stay put as buses come and go and a tap lands on the route the rider meant.
  const codes = useMemo(() => [...new Set((data?.arrivals ?? []).map((a) => a.code))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [data]);
  const arrivals = (data?.arrivals ?? []).filter((a) => !only || a.code === only);
  const [next, ...later] = arrivals;

  // The bus the map follows: the next one, until the rider picks another.
  const [picked, setPicked] = useState<string | null>(null);
  // Another stop tapped on the map takes this one's place on the same screen: the route and bus picked here go.
  const [showing, setShowing] = useState(id);
  if (showing !== id) {
    setShowing(id);
    setOnly(null);
    setPicked(null);
  }
  const followed = arrivals.find((a) => keyOf(a) === picked) ?? next;
  const live = !!data?.feed.live && followed?.basis !== "scheduled";
  // The line of the bus followed live, or of the route the rider picked, drawn on the map with its stops.
  const shown = live || only || picked ? (followed?.routeId ?? undefined) : undefined;
  const { data: route } = useRoute(shown);
  const focus = live && followed?.plate ? (route?.buses.find((b) => b.plate === followed.plate) ?? null) : null;
  const way = useMemo(() => (route && stop ? wayTowards(route.patterns ?? [{ path: route.path }], stop, focus) : undefined), [route, stop, focus]);
  const mapStops = useMemo(() => {
    if (!stop) return [];
    const onRoute = new Set(route?.stops.map((s) => s.id));
    return [
      { ...stop, tone: "focus" as const },
      ...(every ?? []).filter((s) => s.id !== stop.id).map((s) => ({ ...s, tone: onRoute.has(s.id) ? ("pass" as const) : ("faint" as const) })),
    ];
  }, [stop, every, route]);
  const mapBuses =
    route && live && followed ? route.buses.map((b) => ({ ...b, code: followed.code, system: followed.system })) : data?.feed.live ? data.incoming.filter((b) => !only || b.code === only) : [];

  const map = useRef<MapHandle>(null);
  // The map frames the stop, the bus and the rider when it starts following a bus: on arriving, when the rider picks one, and when the one
  // followed has come and the next takes its place. Buses trading places in the list from one report to the next must not shake it, so it rests between moves.
  const { state: place } = useLocation();
  const rider = place.status === "ready" && stop && metresBetween([place.lon, place.lat], [stop.lon, stop.lat]) <= RIDER_IN_FRAME_M ? place : null;
  const framed = useRef<{ bus: string | null; at: number }>({ bus: null, at: 0 });
  useEffect(() => {
    if (!focus || !stop || place.status === "loading" || framed.current.bus === focus.id) return;
    if (Date.now() - framed.current.at < FRAME_REST_MS) return;
    framed.current = { bus: focus.id, at: Date.now() };
    map.current?.fit([[stop.lon, stop.lat], [focus.lon, focus.lat], ...(rider ? [[rider.lon, rider.lat] as [number, number]] : [])]);
  }, [focus, stop, rider, place.status]);

  // Picking a route shows its whole line, drawn strong end to end, so the rider sees where it goes from here.
  const line = !live && only ? way?.line : undefined;
  useEffect(() => {
    if (line && line.length > 1) map.current?.fit(line);
  }, [line]);

  // A stop tapped on the map opens in place, so the map and the sheet stay and the camera glides there, instead of
  // a whole new screen loading on top. Back still returns to where the rider came from.
  const navigation = useNavigation();
  const openHere = (other: string) => {
    void Haptics.selectionAsync();
    framed.current = { bus: null, at: 0 };
    navigation.setParams({ id: other } as never);
    const to = knownStop(other);
    if (to) map.current?.flyTo(to.lat, to.lon, STOP_ZOOM);
  };

  const follow = (a: Arrival) => {
    void Haptics.selectionAsync();
    framed.current = { bus: null, at: 0 };
    setPicked(keyOf(a));
  };

  const save = () => {
    if (!data) return;
    const added = toggleStop(data.stop);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success(t.stop.saved.title, { description: t.stop.saved.body });
    else toast(t.stop.removed);
    announce(added ? `${t.stop.saved.title}. ${t.stop.saved.body}` : t.stop.removed);
  };

  return (
    <>
      {data && <SaveButton saved={saved} label={saved ? t.stop.unsave : t.stop.save} onPress={save} />}

      <DetailScreen
        map={
          stop && (
            <TransitMap
              ref={map}
              center={{ lat: stop.lat, lon: stop.lon }}
              zoom={STOP_ZOOM}
              stops={mapStops}
              onStopPress={(other) => other !== stop.id && openHere(other)}
              path={way?.line}
              approach={line ?? way?.approach}
              system={followed?.system}
              buses={mapBuses}
              showCodes={!route}
              focusBusId={focus?.id ?? null}
              padding={layout.mapInset}
            />
          )
        }>
        {stop && (
          <View style={styles.header}>
            <StopTile kind={stop.kind} tier="lg" />
            <View style={styles.titles}>
              <Text variant="title" accessibilityRole="header" numberOfLines={large ? undefined : 2}>
                {stop.name}
              </Text>
              <View style={styles.meta}>
                <Text variant="caption" tone="muted">
                  {stop.kind === "station" ? t.stop.station(city.operator) : t.stop.sitp(city.network)}
                </Text>
                {stop.accessible && (
                  <View style={styles.meta}>
                    <Icon name={icons.wheelchair} color={p.faint} size="xs" />
                    <Text variant="caption" tone="muted">
                      {t.common.accessible}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        {isLoading && <SkeletonList rows={5} kind="arrival" />}
        {isError && !data && <Empty title={t.stop.failed.title} body={t.stop.failed.body(city.operator)} action={t.common.retry} onAction={() => void refetch()} />}

        {data && (
          <>
            {codes.length > 1 && (
              <ScrollView horizontal={!wrap} scrollEnabled={!wrap} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, wrap && styles.wrap]} style={styles.bleed}>
                <Chip label={t.stop.all} accessibilityLabel={`${t.stop.all}, ${t.stop.allLabel}`} selected={!only} onPress={() => setOnly(null)} />
                {codes.map((c) => {
                  const a = data.arrivals.find((x) => x.code === c)!;
                  const on = only === c;
                  return (
                    <PressableScale
                      key={c}
                      accessibilityRole="button"
                      accessibilityLabel={`${c}, ${t.stop.only(spokenCode(c))}`}
                      accessibilityState={{ selected: on }}
                      hitSlop={space[1]}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setOnly(on ? null : c);
                      }}
                      style={[styles.chip, { borderColor: on ? p.ink : only ? p.separator : "transparent" }]}>
                      <RouteBadge code={c} system={a.system} />
                    </PressableScale>
                  );
                })}
              </ScrollView>
            )}

            {next ? <NextBus arrival={next} following={!!focus && followed === next} onPress={() => follow(next)} /> : data.untimed ? <Empty title={t.stop.untimed.title} body={t.stop.untimed.body} /> : <Empty title={t.stop.none.title} body={t.stop.none.body} />}

            {/* Each live arrival already says so; the notice is for when times fall back to the timetable. A stop with no
                timetable at all already says that, so it needs no second word on the times. */}
            {!data.feed.live && !data.untimed && <FeedStatus feed={data.feed} />}
            <AlertCard alerts={data.alerts} />

            {later.length > 0 && (
              <View>
                <Text variant="title" style={styles.heading}>
                  {t.stop.later}
                </Text>
                {later.slice(0, 10).map((a, i) => (
                  <ArrivalRow key={`${a.code}-${a.at}-${i}`} arrival={a} first={i === 0} index={i} following={!!focus && followed === a} onPress={() => follow(a)} />
                ))}
              </View>
            )}

            <View>
              <Text variant="title" style={styles.heading}>
                {t.stop.routesHere}
              </Text>
              <View style={styles.bleed}>
                {data.stop.routes.map((r) => (
                  <RouteRow key={r.id} route={r} />
                ))}
              </View>
            </View>
          </>
        )}
        {stop && <Button variant="quiet" height="md" label={t.stop.report} onPress={() => router.push({ pathname: "/report", params: { stopId: stop.id, stopName: stop.name } })} />}
      </DetailScreen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  titles: { flex: 1, gap: space[1] },
  meta: { flexDirection: "row", alignItems: "center", gap: space[1.5], flexWrap: "wrap" },
  bleed: { marginHorizontal: -layout.gutter },
  filters: { gap: space[2], alignItems: "center", paddingHorizontal: layout.gutter },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: { padding: space[0.5], borderRadius: radius.md, borderWidth: size.line.rule, borderCurve: "continuous" },
  heading: { marginBottom: space[1] },
});
