import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { city } from "@/cities";
import { DetailScreen } from "@/components/detail-screen";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { RouteBadge } from "@/components/route-badge";
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
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";
import type { Journey, Leg } from "@/transit/types";

/** The place itself, drawn on the map among the stops. */
const DESTINATION = "destination";

/** How to get from where the rider is to a place: a few ways to choose from, and the chosen one step by step. */
export default function TripScreen() {
  const { name, lat, lon } = useLocalSearchParams<{ name?: string; lat?: string; lon?: string }>();
  const t = useT();
  // Times follow the rider's 12 or 24 hour clock; this redraws them when it changes.
  useClock();
  const { reduceMotion } = useAccessibility();
  const { state: here, retry } = useLocation();
  const to = useMemo(() => {
    const point = { lat: Number(lat), lon: Number(lon) };
    return Number.isFinite(point.lat) && Number.isFinite(point.lon) ? point : null;
  }, [lat, lon]);
  const from = here.status === "ready" ? { lat: here.lat, lon: here.lon } : null;
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
    const list = journey?.legs.flatMap((l) => (l.kind === "ride" ? [l.from, l.to].map((s) => ({ ...s, system: l.route.system })) : [])) ?? [];
    const unique = [...new Map(list.map((s) => [s.id, { ...s, kind: "stop" as const }])).values()];
    return to ? [...unique, { id: DESTINATION, name: name ?? "", lat: to.lat, lon: to.lon, kind: "station" as const, system: "other" as const }] : unique;
  }, [journey, to, name]);
  const system = journey?.legs.find((l) => l.kind === "ride")?.route.system ?? "other";

  const pick = (i: number) => {
    void Haptics.selectionAsync();
    setChosen(i);
  };

  return (
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
          {t.trip.fromHere}
        </Text>
      </View>

      {!to && <Empty title={t.trip.failed.title} body={t.trip.failed.body} />}
      {to && here.status === "loading" && <SkeletonList rows={3} kind="arrival" />}
      {to && here.status === "denied" && <Empty title={t.trip.needLocation.title} body={t.trip.needLocation.body} action={t.trip.needLocation.action} onAction={() => void retry()} />}
      {to && here.status === "outside" && <Empty title={t.trip.outside(city.name)} body={t.trip.needLocation.body} />}
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
  icon: "walk" | "ride" | "off" | "end";
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
        const body = (
          <>
            <View style={styles.rail}>
              <View style={[styles.line, { backgroundColor: p.ink, opacity: i === 0 ? 0 : 1 }]} />
              <View style={[styles.mark, { backgroundColor: p.surface }]}>
                {s.leg ? (
                  <RouteBadge code={s.leg.route.code} system={s.leg.route.system} size="sm" />
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
});
