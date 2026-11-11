import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { toast } from "sonner-native";

import { city } from "@/cities";
import { Chip } from "@/components/chip";
import { DetailScreen } from "@/components/detail-screen";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { RouteBadge } from "@/components/route-badge";
import { SaveButton } from "@/components/save-button";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { Text } from "@/components/text";
import { TransitMap } from "@/components/transit-map";
import type { MapHandle } from "@/components/transit-map.types";
import { useT } from "@/i18n";
import { announce, useAccessibility, useLargeText } from "@/lib/accessibility";
import { usePlan } from "@/lib/api";
import { useClock } from "@/lib/appearance";
import { clock, durationText, spokenDuration } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { placeId, placesInOrder, setPlace, toggleTrip, tripId, useIsSaved, useSaved, type SavedPlace } from "@/lib/saved";
import { photo, systems, usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";
import type { Journey, Leg } from "@/transit/types";

/** The place itself, drawn on the map among the stops. */
const DESTINATION = "destination";

/**
 * How to get to a place, from where the rider is or from one of their places: a few ways to choose from, and the
 * chosen one step by step. The place can be kept as home, work or a saved place, and the trip itself saved.
 */
export default function TripScreen() {
  const { name, lat, lon, fromName, fromLat, fromLon } = useLocalSearchParams<{ name?: string; lat?: string; lon?: string; fromName?: string; fromLat?: string; fromLon?: string }>();
  const t = useT();
  // Times follow the rider's 12 or 24 hour clock; this redraws them when it changes.
  useClock();
  const { reduceMotion } = useAccessibility();
  const { state: here, retry } = useLocation();
  const to = useMemo(() => {
    const point = { lat: Number(lat), lon: Number(lon) };
    return Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null;
  }, [lat, lon]);
  // From one of the rider's places when they chose one; otherwise from where they are.
  const start = useMemo(() => {
    const point = { lat: Number(fromLat), lon: Number(fromLon) };
    return fromLat && Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null;
  }, [fromLat, fromLon]);
  const from = start ?? (here.status === "ready" ? { lat: here.lat, lon: here.lon } : null);
  const saved = useSaved();
  const places = placesInOrder(saved);
  const destination = to ? places.find((p) => p.id === placeId(to)) : undefined;
  const trip = to ? { from: start ? { name: fromName ?? "", ...start } : null, to: { name: name ?? "", ...to } } : null;
  const tripSaved = useIsSaved("trip", trip ? tripId(trip.from, trip.to) : undefined);
  const { data, isLoading, isError, refetch } = usePlan(from, to);
  const [chosen, setChosen] = useState(0);
  const journeys = data?.journeys ?? [];
  const journey: Journey | undefined = journeys[Math.min(chosen, journeys.length - 1)];
  const map = useRef<MapHandle>(null);

  const path = useMemo(() => journey?.legs.flatMap((l) => l.path) ?? [], [journey]);
  const legs = useMemo(() => journey?.legs.map((l) => ({ kind: l.kind, path: l.path })) ?? [], [journey]);
  // The plan is worked out again every minute; the map only moves when the way itself changes.
  const way = journey?.legs.map((l) => (l.kind === "ride" ? `${l.route.id}:${l.from.id}:${l.to.id}` : "walk")).join("|") ?? "";
  const latest = useRef(path);
  useEffect(() => {
    latest.current = path;
  }, [path]);
  useEffect(() => {
    if (!way) return;
    const timer = setTimeout(() => latest.current.length > 1 && map.current?.fit(latest.current), reduceMotion ? 0 : 350);
    return () => clearTimeout(timer);
  }, [way, reduceMotion]);

  const count = journeys.length;
  useEffect(() => {
    if (!data) return;
    announce(count ? `${t.trip.options}: ${count}` : t.trip.none.title);
  }, [data, count, t]);

  const stops = useMemo(() => {
    // Where the rider gets on and off, drawn large; the stops the bus passes between, small, to count them.
    const list =
      journey?.legs.flatMap((l) =>
        l.kind === "ride"
          ? [
              { ...l.from, system: l.route.system, kind: "station" as const, tone: "focus" as const },
              ...(l.via ?? []).map((s) => ({ ...s, system: l.route.system, kind: "stop" as const, tone: "pass" as const })),
              { ...l.to, system: l.route.system, kind: "station" as const, tone: "focus" as const },
            ]
          : [],
      ) ?? [];
    const unique = [...new Map(list.map((s) => [s.id, s])).values()];
    return to ? [...unique, { id: DESTINATION, name: name ?? "", lat: to.lat, lon: to.lon, kind: "station" as const, system: "other" as const, tone: "focus" as const }] : unique;
  }, [journey, to, name]);
  const system = journey?.legs.find((l) => l.kind === "ride")?.route.system ?? "other";

  const keep = (label: SavedPlace["label"]) => {
    if (!to) return;
    void Haptics.selectionAsync();
    const added = setPlace({ name: name ?? "", ...to }, label);
    announce(added ? t.trip.placeSaved : t.trip.placeRemoved);
    if (added) toast.success(t.trip.placeSaved);
  };

  const saveTrip = () => {
    if (!trip) return;
    const added = toggleTrip(trip.from, trip.to);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success(t.trip.savedTrip.title, { description: t.trip.savedTrip.body });
    else toast(t.trip.removedTrip);
    announce(added ? `${t.trip.savedTrip.title}. ${t.trip.savedTrip.body}` : t.trip.removedTrip);
  };

  const leaveFrom = (place: SavedPlace | null) => {
    void Haptics.selectionAsync();
    router.setParams(place ? { fromName: place.name, fromLat: String(place.lat), fromLon: String(place.lon) } : { fromName: undefined, fromLat: undefined, fromLon: undefined });
  };
  const origins = places.filter((p) => p.id !== destination?.id);
  const placeName = (p: SavedPlace) => (p.label === "home" ? t.saved.home : p.label === "work" ? t.saved.work : p.name);

  const pick = (i: number) => {
    void Haptics.selectionAsync();
    setChosen(i);
  };

  return (
    <>
      {trip && <SaveButton saved={tripSaved} label={tripSaved ? t.trip.unsave : t.trip.save} onPress={saveTrip} />}
      <DetailScreen
        map={
          <TransitMap
            ref={map}
            center={to ?? city.center}
            zoom={14}
            legs={legs}
            system={system}
            stops={stops}
            padding={layout.mapInset}
            onStopPress={(id) => id !== DESTINATION && router.push({ pathname: "/stop/[id]", params: { id } })}
          />
        }>
        <View style={styles.header}>
          <Text variant="eyebrow" tone="faint">
            {t.trip.title}
          </Text>
          <Text variant="heading" accessibilityRole="header">
            {name}
          </Text>
          <Text variant="callout" tone="muted">
            {start ? t.trip.fromPlace(fromName ?? "") : t.trip.fromHere}
          </Text>
        </View>

        {to && (
          <View style={styles.chips}>
            <Chip label={t.trip.asHome} selected={destination?.label === "home"} onPress={() => keep("home")} />
            <Chip label={t.trip.asWork} selected={destination?.label === "work"} onPress={() => keep("work")} />
            <Chip label={t.trip.keep} selected={!!destination && destination.label === null} onPress={() => keep(null)} />
          </View>
        )}

        {origins.length > 0 && (
          <View style={styles.from}>
            <Text variant="caption" tone="muted">
              {t.trip.leaveFrom}
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={t.trip.leaveFrom} style={styles.chips}>
              <Chip radio label={t.trip.here} selected={!start} onPress={() => leaveFrom(null)} />
              {origins.map((p) => (
                <Chip key={p.id} radio label={placeName(p)} selected={!!start && placeId(start) === p.id} onPress={() => leaveFrom(p)} />
              ))}
            </View>
          </View>
        )}

        {!to && <Empty title={t.trip.failed.title} body={t.trip.failed.body} />}
        {to && !start && here.status === "loading" && <SkeletonList rows={3} kind="arrival" />}
        {to && !start && here.status === "denied" && <Empty title={t.trip.needLocation.title} body={t.trip.needLocation.body} action={t.trip.needLocation.action} onAction={() => void retry()} />}
        {to && !start && here.status === "outside" && <Empty title={t.trip.outside(city.name)} body={t.trip.needLocation.body} />}
        {from && isLoading && <SkeletonList rows={3} kind="arrival" />}
        {from && isError && !data && <Empty title={t.trip.failed.title} body={t.trip.failed.body} action={t.common.retry} onAction={() => void refetch()} />}
        {from && data && count === 0 && <Empty title={t.trip.none.title} body={t.trip.none.body(city.operator)} />}

        {from && data && count > 0 && (
          <>
            <FeedStatus feed={data.feed} />
            <View style={styles.list}>
              <Text variant="title" accessibilityRole="header">
                {t.trip.options}
              </Text>
              {journeys.map((j, i) => (
                <Option key={i} journey={j} selected={j === journey} onPress={() => pick(i)} />
              ))}
            </View>
            {journey && <Steps journey={journey} name={name ?? ""} />}
          </>
        )}
      </DetailScreen>
    </>
  );
}

function Option({ journey, selected, onPress }: { journey: Journey; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  const t = useT();
  const rides = journey.legs.filter((l): l is Extract<Leg, { kind: "ride" }> => l.kind === "ride");
  const label = t.trip.speech.option(
    spokenDuration(journey.minutes),
    clock(journey.departs),
    clock(journey.arrives),
    rides.length ? t.trip.speech.routes(rides.map((r) => r.route.code)) : t.trip.speech.onFoot,
    journey.walkM,
  );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={selected ? `${t.trip.chosen}. ${label}` : label}
      accessibilityHint={selected ? undefined : t.trip.choose}
      onPress={onPress}
      style={[styles.option, { borderColor: selected ? p.ink : p.separator, borderWidth: selected ? size.line.rule : size.line.hair }]}>
      <View style={styles.optionTop}>
        <Text variant="title" tabular>
          {durationText(journey.minutes)}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {t.trip.span(clock(journey.departs), clock(journey.arrives))}
        </Text>
      </View>
      <View style={styles.legs}>
        {journey.legs.map((l, i) => (
          <Fragment key={i}>
            {i > 0 && <Icon name={icons.chevron} color={p.faint} size="xs" />}
            {l.kind === "walk" ? <Icon name={icons.walk} color={p.text} size="sm" /> : <RouteBadge code={l.route.code} system={l.route.system} size="sm" />}
          </Fragment>
        ))}
      </View>
      <Text variant="caption" tone="muted">
        {rides.length ? `${t.trip.leave(clock(journey.departs))}  ·  ${t.trip.walked(journey.walkM)}` : t.trip.onFoot}
      </Text>
    </PressableScale>
  );
}

interface Step {
  key: string;
  icon: "walk" | "ride" | "pass" | "off" | "end";
  title: string;
  detail?: string;
  leg?: Extract<Leg, { kind: "ride" }>;
}

function Steps({ journey, name }: { journey: Journey; name: string }) {
  const p = usePalette();
  const t = useT();
  const large = useLargeText();
  const steps: Step[] = journey.legs.flatMap((l, i): Step[] => {
    if (l.kind === "walk") return [{ key: `w${i}`, icon: "walk", title: t.trip.walk(l.meters, l.minutes), detail: l.to ? t.trip.walkTo(l.to.name) : t.trip.walkToEnd }];
    return [
      { key: `r${i}`, icon: "ride", title: t.trip.ride(l.route.code, l.route.name), detail: `${l.from.name}  ·  ${t.trip.rideAt(clock(l.departs), l.stops)}`, leg: l },
      // Every stop on the way, so the rider can count them and get off at the right one.
      ...(l.via ?? []).map((s, k): Step => ({ key: `p${i}-${k}`, icon: "pass", title: s.name })),
      { key: `o${i}`, icon: "off", title: t.trip.getOff(l.to.name, clock(l.arrives)) },
    ];
  });
  steps.push({ key: "end", icon: "end", title: t.trip.arrive(name), detail: clock(journey.arrives) });

  return (
    <View>
      <Text variant="title" accessibilityRole="header" style={styles.heading}>
        {t.trip.steps}
      </Text>
      {steps.map((s, i) => {
        if (s.icon === "pass") {
          return (
            <View key={s.key} accessible accessibilityLabel={s.title} style={styles.pass}>
              <View style={styles.rail}>
                <View style={[styles.line, { backgroundColor: p.ink }]} />
                <View style={[styles.passDot, { borderColor: p.ink, backgroundColor: p.background }]} />
                <View style={[styles.line, { backgroundColor: p.ink }]} />
              </View>
              <Text variant="caption" tone="muted" numberOfLines={large ? undefined : 1} style={styles.passName}>
                {s.title}
              </Text>
            </View>
          );
        }
        const body = (
          <>
            <View style={styles.rail}>
              <View style={[styles.line, { backgroundColor: p.ink, opacity: i === 0 ? 0 : 1 }]} />
              {/* A bus step is the bus on its kind of route's colour, so trunk and feeder buses read apart at a glance. */}
              <View style={[styles.mark, { backgroundColor: s.leg ? systems[s.leg.route.system].dot : p.surface }]}>
                {s.leg ? (
                  <Icon name={icons.bus} color={photo.text} size="sm" />
                ) : (
                  <Icon name={s.icon === "walk" ? icons.walk : s.icon === "end" ? icons.finish : icons.stop} color={p.text} size="sm" />
                )}
              </View>
              <View style={[styles.line, { backgroundColor: p.ink, opacity: i === steps.length - 1 ? 0 : 1 }]} />
            </View>
            <View style={styles.stepBody}>
              <Text variant="headline" numberOfLines={large ? undefined : 2}>
                {s.title}
              </Text>
              {s.detail ? (
                <Text variant="caption" tone="muted" numberOfLines={large ? undefined : 2}>
                  {s.detail}
                </Text>
              ) : null}
            </View>
          </>
        );
        const label = [s.title, s.detail].filter(Boolean).join(". ");
        return s.leg ? (
          <PressableScale
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => router.push({ pathname: "/route/[id]", params: { id: s.leg!.route.id } })}
            style={styles.step}>
            {body}
          </PressableScale>
        ) : (
          <View key={s.key} accessible accessibilityLabel={label} style={styles.step}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  from: { gap: space[2] },
  list: { gap: space[3] },
  option: { padding: space[4], borderRadius: radius.lg, borderCurve: "continuous", gap: space[2] },
  optionTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space[2], flexWrap: "wrap" },
  legs: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space[1.5] },
  heading: { marginBottom: space[2] },
  step: { flexDirection: "row", gap: space[3], minHeight: size.control.lg },
  rail: { width: size.tile.sm, alignItems: "center" },
  line: { width: size.line.rule, flex: 1 },
  mark: { minWidth: size.tile.sm, minHeight: size.tile.sm, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space[1] },
  stepBody: { flex: 1, gap: space[0.5], paddingVertical: space[3] },
  pass: { flexDirection: "row", gap: space[3], minHeight: size.control.sm - space[2] },
  passDot: { width: size.dot.md, height: size.dot.md, borderRadius: radius.pill, borderWidth: size.line.rule },
  passName: { flex: 1, alignSelf: "center" },
});
