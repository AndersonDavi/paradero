import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { PressableScale } from "pressto";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { toast } from "sonner-native";

import { city } from "@/cities";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { DetailScreen } from "@/components/detail-screen";
import { Dot } from "@/components/dot";
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
import { useTrip } from "@/lib/api";
import { pickStop } from "@/lib/pick-stop";
import { useClock } from "@/lib/appearance";
import { clock, durationText, spokenDuration } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { placeId, placesInOrder, setPlace, toggleTrip, tripId, useIsSaved, useSaved, type SavedPlace } from "@/lib/saved";
import { photo, signal, systems, usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";
import type { Journey, Leg } from "@/transit/types";

/** The places themselves, drawn on the map among the bus stops. */
const DESTINATION = "destination";

/** How long a rider can say they stay at a stop before going on, in minutes. */
const STAYS = [0, 15, 30, 60];
interface Later {
  name: string;
  lat: number;
  lon: number;
  /** Minutes at the stop before this one. */
  stay: number;
}

/** The stops after the first, as the screen keeps them in its address: a small JSON list. */
function parseLater(text: string | undefined): Later[] {
  if (!text) return [];
  try {
    const list = JSON.parse(text) as Later[];
    return Array.isArray(list) ? list.filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon)).map((x) => ({ ...x, stay: Number(x.stay) || 0 })) : [];
  } catch {
    return [];
  }
}

/**
 * How to get to a place, from where the rider is or from one of their places: a few ways to choose from, and the
 * chosen one step by step. The place can be kept as home, work or a saved place, and the trip itself saved.
 */
export default function TripScreen() {
  const { name, lat, lon, fromName, fromLat, fromLon, then } = useLocalSearchParams<{
    name?: string;
    lat?: string;
    lon?: string;
    fromName?: string;
    fromLat?: string;
    fromLon?: string;
    then?: string;
  }>();
  const p = usePalette();
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
  // Every stop in order: the first is the place the screen opened for, the rest were added.
  const later = useMemo(() => parseLater(then), [then]);
  const stops = useMemo(() => (to ? [{ name: name ?? "", ...to, stay: 0 }, ...later] : []), [to, name, later]);
  const final = stops[stops.length - 1];
  const saved = useSaved();
  const places = placesInOrder(saved);
  const destination = to ? places.find((p) => p.id === placeId(to)) : undefined;
  const trip = to ? { from: start ? { name: fromName ?? "", ...start } : null, to: { name: name ?? "", ...to } } : null;
  const tripSaved = useIsSaved("trip", trip ? tripId(trip.from, trip.to, later) : undefined);
  const [chosen, setChosen] = useState(0);
  const { data, isLoading, isError, refetch } = useTrip(from, stops, chosen);
  const journeys = data?.first ?? [];
  const journey: Journey | undefined = journeys[Math.min(chosen, journeys.length - 1)];
  // The way to the first stop the rider chose, then the soonest way on from each stop to the next.
  const chain = useMemo(() => [journey, ...(data?.then ?? [])].filter((j): j is Journey => !!j), [journey, data]);
  const map = useRef<MapHandle>(null);
  // The stop the rider tapped in the list, drawn large on the map while the others shrink.
  const [spot, setSpot] = useState<number | null>(null);

  const path = useMemo(() => chain.flatMap((j) => j.legs.flatMap((l) => l.path)), [chain]);
  const legs = useMemo(() => chain.flatMap((j) => j.legs.map((l) => ({ kind: l.kind, path: l.path }))), [chain]);
  // The plan is worked out again every minute; the map only moves when the way itself changes.
  const way = chain.flatMap((j) => j.legs.map((l) => (l.kind === "ride" ? `${l.route.id}:${l.from.id}:${l.to.id}` : "walk"))).join("|");
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
  // The first stop no bus reaches from the one before: the trip is shown up to there.
  const short = useMemo(() => {
    const k = (data?.then ?? []).findIndex((leg, i) => !leg && (i === 0 ? !!journey : !!data?.then[i - 1]));
    return k >= 0 && stops[k + 1] ? { reached: stops[k].name, missing: stops[k + 1].name } : null;
  }, [data, journey, stops]);
  useEffect(() => {
    if (!data) return;
    announce(count ? `${t.trip.options}: ${count}` : t.trip.none.title);
  }, [data, count, t]);

  const mapStops = useMemo(() => {
    // Where the rider gets on and off, drawn large; the stops the bus passes between, small, to count them.
    const list = chain.flatMap((j) =>
      j.legs.flatMap((l) =>
        l.kind === "ride"
          ? [
              { ...l.from, system: l.route.system, kind: "station" as const, tone: "focus" as const },
              ...(l.via ?? []).map((s) => ({ ...s, system: l.route.system, kind: "stop" as const, tone: "pass" as const })),
              { ...l.to, system: l.route.system, kind: "station" as const, tone: "focus" as const },
            ]
          : [],
      ),
    );
    const unique = [...new Map(list.map((s) => [s.id, s])).values()];
    const places = stops.map((s, i) => ({ id: `${DESTINATION}-${i}`, name: s.name, lat: s.lat, lon: s.lon, kind: "station" as const, system: "other" as const, tone: spot === null || spot === i ? ("focus" as const) : ("pass" as const) }));
    return [...unique, ...places];
  }, [chain, stops, spot]);
  const system = journey?.legs.find((l) => l.kind === "ride")?.route.system ?? "other";

  // The stops after the first live in the screen's address, so they survive going back and forth. This screen's own
  // navigation sets them, so a stop chosen on the screen above lands here and not there.
  const navigation = useNavigation();
  const setParams = (params: Record<string, string | undefined>) => navigation.setParams(params as never);
  const setLater = (list: Later[]) => setParams({ then: list.length ? JSON.stringify(list) : undefined });
  const addStop = () => pickStop((stop) => setLater([...later, { ...stop, stay: 0 }]));
  const removeStop = (i: number) => {
    void Haptics.selectionAsync();
    if (i > 0) return setLater(later.filter((_, k) => k !== i - 1));
    const [next, ...rest] = later;
    if (next) setParams({ name: next.name, lat: String(next.lat), lon: String(next.lon), then: rest.length ? JSON.stringify(rest) : undefined });
  };
  /** Stop i one place earlier or later in the trip. Each place keeps how long the rider stays there. */
  const moveStop = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= stops.length) return;
    void Haptics.selectionAsync();
    const places = stops.map((s, k) => ({ name: s.name, lat: s.lat, lon: s.lon, here: later[k]?.stay ?? 0 }));
    [places[i], places[j]] = [places[j], places[i]];
    const [first, ...rest] = places;
    const next = rest.map((s, k) => ({ name: s.name, lat: s.lat, lon: s.lon, stay: places[k].here }));
    setSpot(null);
    setParams({ name: first.name, lat: String(first.lat), lon: String(first.lon), then: next.length ? JSON.stringify(next) : undefined });
    announce(t.trip.moved(stops[i].name, j + 1));
  };
  const showStop = (i: number) => {
    void Haptics.selectionAsync();
    setSpot(i);
    map.current?.flyTo(stops[i].lat, stops[i].lon, 16);
  };
  /** Minutes the rider stays at stop i before going on to the next one. */
  const setStay = (i: number, minutes: number) => {
    void Haptics.selectionAsync();
    setLater(later.map((s, k) => (k === i ? { ...s, stay: minutes } : s)));
  };

  const keep = (label: SavedPlace["label"]) => {
    if (!to) return;
    void Haptics.selectionAsync();
    const added = setPlace({ name: name ?? "", ...to }, label);
    announce(added ? t.trip.placeSaved : t.trip.placeRemoved);
    if (added) toast.success(t.trip.placeSaved);
  };

  const saveTrip = () => {
    if (!trip) return;
    const added = toggleTrip(trip.from, trip.to, later);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success(t.trip.savedTrip.title, { description: t.trip.savedTrip.body });
    else toast(t.trip.removedTrip);
    announce(added ? `${t.trip.savedTrip.title}. ${t.trip.savedTrip.body}` : t.trip.removedTrip);
  };

  const leaveFrom = (place: SavedPlace | null) => {
    void Haptics.selectionAsync();
    setParams(place ? { fromName: place.name, fromLat: String(place.lat), fromLon: String(place.lon) } : { fromName: undefined, fromLat: undefined, fromLon: undefined });
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
            stops={mapStops}
            padding={layout.mapInset}
            onStopPress={(id) => !id.startsWith(DESTINATION) && router.push({ pathname: "/stop/[id]", params: { id } })}
          />
        }>
        <View style={styles.header}>
          <Text variant="eyebrow" tone="faint">
            {t.trip.title}
          </Text>
          <Text variant="heading" accessibilityRole="header">
            {final?.name ?? name}
          </Text>
          <Text variant="callout" tone="muted">
            {[start ? t.trip.fromPlace(fromName ?? "") : t.trip.fromHere, later.length ? t.trip.withStops(later.length) : null].filter(Boolean).join("  ·  ")}
          </Text>
        </View>

        {to && stops.length > 1 && (
          <View style={styles.list}>
            <Text variant="title" accessibilityRole="header">
              {t.trip.stops}
            </Text>
            {stops.map((s, i) => (
              <View key={`${i}-${s.lat},${s.lon}`} style={styles.stop}>
                <View style={styles.stopRow}>
                  <Text variant="headline" tabular style={styles.stopNumber}>
                    {i + 1}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={s.name} accessibilityHint={t.trip.showStop} onPress={() => showStop(i)} style={styles.stopName}>
                    <Text variant="headline" weight={spot === i ? 700 : undefined}>
                      {s.name}
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t.trip.moveUp(s.name)} disabled={i === 0} onPress={() => moveStop(i, -1)} hitSlop={space[2]} style={styles.move}>
                    <Icon name={icons.up} color={i === 0 ? p.separator : p.text} size="sm" />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t.trip.moveDown(s.name)} disabled={i === stops.length - 1} onPress={() => moveStop(i, 1)} hitSlop={space[2]} style={styles.move}>
                    <Icon name={icons.down} color={i === stops.length - 1 ? p.separator : p.text} size="sm" />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t.trip.removeStop(s.name)} onPress={() => removeStop(i)} hitSlop={space[2]} style={styles.move}>
                    <Icon name={icons.close} color={p.faint} size="sm" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {to && <Button variant="secondary" height="md" label={t.trip.addStop} onPress={addStop} />}

        {to && stops.length === 1 && (
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
            {short && (
              <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: p.surface }]}>
                <Dot color={signal.alert} />
                <Text variant="callout" style={styles.noticeText}>
                  {t.trip.cutShort(short.reached, short.missing, city.operator)}
                </Text>
              </View>
            )}
            <View style={styles.list}>
              <Text variant="title" accessibilityRole="header">
                {t.trip.options}
              </Text>
              {journeys.map((j, i) => (
                <Option key={i} journey={j} selected={j === journey} onPress={() => pick(i)} />
              ))}
            </View>
            {journey && <Steps journey={journey} name={name ?? ""} />}
            {later.map((s, i) => {
              // Each stop on the way: how long the rider stays, then the soonest bus on once they are ready to go.
              const before = i === 0 ? journey : data.then[i - 1];
              const leg = data.then[i];
              return (
                <Fragment key={`${i}-${s.lat},${s.lon}`}>
                  {before && <Stay place={stops[i].name} arrives={before.arrives} stay={s.stay} next={leg} to={s.name} onStay={(m) => setStay(i, m)} />}
                  {leg && <Steps journey={leg} name={s.name} title={t.trip.thenTo(s.name)} />}
                </Fragment>
              );
            })}
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

/**
 * A stop on the way: the rider says how long they stay (passing through by default), and the screen says when the
 * next bus on comes once they are ready to go, or warns them when by then there is none left.
 */
function Stay({ place, arrives, stay, next, to, onStay }: { place: string; arrives: string; stay: number; next: Journey | null | undefined; to: string; onStay: (minutes: number) => void }) {
  const p = usePalette();
  const t = useT();
  const ride = next?.legs.find((l): l is Extract<Leg, { kind: "ride" }> => l.kind === "ride");
  const ready = Date.parse(arrives) + stay * 60_000;
  const wait = next ? Math.max(0, Math.round((Date.parse(next.departs) - ready) / 60_000)) : 0;
  const missed = !next && stay > 0;
  return (
    <View style={styles.list}>
      <Text variant="title" accessibilityRole="header">
        {t.trip.stayAt(place)}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t.trip.stayAt(place)} style={styles.chips}>
        {STAYS.map((m) => (
          <Chip key={m} radio label={t.trip.stayFor(m)} selected={stay === m} onPress={() => onStay(m)} />
        ))}
      </View>
      {(ride || missed) && (
        <View accessibilityRole={missed ? "alert" : undefined} accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: p.surface }]}>
          <Dot color={missed ? signal.alert : signal.live} />
          <Text variant="callout" style={styles.noticeText}>
            {missed ? t.trip.missed(to) : t.trip.nextBus(ride!.route.code, clock(ride!.departs), wait > 0 ? clock(next!.departs) : null)}
          </Text>
        </View>
      )}
    </View>
  );
}

function Steps({ journey, name, title }: { journey: Journey; name: string; title?: string }) {
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
        {title ?? t.trip.steps}
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
  stop: { gap: space[2] },
  stopRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  move: { minWidth: size.control.sm, minHeight: size.control.sm, alignItems: "center", justifyContent: "center" },
  stopNumber: { minWidth: size.icon.md },
  stopName: { flex: 1 },
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
  notice: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: "continuous" },
  noticeText: { flex: 1 },
});
