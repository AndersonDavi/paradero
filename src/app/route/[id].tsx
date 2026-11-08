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
import { announce } from "@/lib/accessibility";
import { useRoute } from "@/lib/api";
import { BOGOTA } from "@/lib/location";
import { toggleRoute, useIsSaved } from "@/lib/saved";
import { systems, usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const map = useRef<MapHandle>(null);
  const { data, isLoading, isError, refetch } = useRoute(id);
  const saved = useIsSaved("route", id);

  const path = data?.path;
  useEffect(() => {
    if (!path || path.length < 2) return;
    const t = setTimeout(() => map.current?.fit(path), 350);
    return () => clearTimeout(t);
  }, [path]);

  const save = () => {
    if (!data) return;
    const added = toggleRoute(data.route);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success("Ruta guardada", { description: "La encuentras en Guardados." });
    else toast("La quitamos de tus rutas");
    announce(added ? "Ruta guardada. La encuentras en Guardados." : "La quitamos de tus rutas.");
  };

  const tint = p.ink;
  const hours = data?.route.firstDeparture && data.route.lastDeparture ? `${data.route.firstDeparture} a ${data.route.lastDeparture}` : null;
  const buses = data?.feed.live ? data.buses : [];

  return (
    <>
      {data && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={saved ? "star.fill" : "star"}
            tintColor={p.text}
            accessibilityLabel={saved ? "Quitar de tus rutas" : "Guardar esta ruta"}
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
        {isError && <Empty title="No pudimos cargar esta ruta" body="Revisa tu conexión e intenta de nuevo." action="Reintentar" onAction={() => void refetch()} />}

        {data && (
          <>
            <View style={styles.header}>
              <RouteBadge code={data.route.code} system={data.route.system} size="lg" solid />
              <Text variant="heading" accessibilityRole="header">
                {data.route.name}
              </Text>
              <Text variant="callout" tone="muted">
                {[systems[data.route.system].label, data.route.variant].filter(Boolean).join("  ·  ")}
              </Text>
            </View>

            <View style={styles.facts}>
              <Fact label="Primer bus" value={data.route.firstDeparture ?? "–"} />
              <Fact label="Último bus" value={data.route.lastDeparture ?? "–"} />
              <Fact label="En vía" value={data.feed.live ? String(buses.length) : "–"} />
            </View>

            <FeedStatus feed={data.feed} />

            <View style={[styles.note, { backgroundColor: p.surface }]}>
              <BusGlyph size={size.glyph.lg} color={p.text} cut={p.surface} />
              <Text variant="callout" tone="muted" style={{ flex: 1 }}>
                {!data.feed.live
                  ? "TransMilenio no está publicando posiciones, así que no dibujamos buses que podrían no estar ahí."
                  : buses.length === 0
                    ? `No vemos buses en vía ahora.${hours ? ` Opera de ${hours}.` : ""}`
                    : `${buses.length} ${buses.length === 1 ? "bus" : "buses"} en vía. Toca un paradero para ver cuándo llega.`}
              </Text>
            </View>

            <AlertCard alerts={data.alerts} />

            <View>
              <Text variant="title" style={styles.heading}>
                {data.stops.length} paradas
              </Text>
              {data.stops.map((s, i) => {
                const edge = i === 0 || i === data.stops.length - 1;
                return (
                  <PressableScale
                    key={`${s.id}-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Parada ${i + 1}, ${s.name}`}
                    onPress={() => router.push({ pathname: "/stop/[id]", params: { id: s.id } })}
                    style={styles.stopRow}>
                    <View style={styles.rail}>
                      <View style={[styles.line, { backgroundColor: tint, opacity: i === 0 ? 0 : 1 }]} />
                      <View style={[edge ? styles.edgeNode : styles.node, { borderColor: tint, backgroundColor: edge ? tint : p.background }]} />
                      <View style={[styles.line, { backgroundColor: tint, opacity: i === data.stops.length - 1 ? 0 : 1 }]} />
                    </View>
                    <Text variant={edge ? "headline" : "callout"} weight={edge ? 600 : 400} numberOfLines={1} style={{ flex: 1 }}>
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
            label="¿Algo está mal en esta ruta?"
            accessibilityLabel="Reportar un problema con esta ruta"
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
    <View style={[styles.fact, { borderColor: p.separator }]}>
      <Text variant="eyebrow" tone="faint">
        {label}
      </Text>
      <Text variant="title" tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[2] },
  facts: { flexDirection: "row", gap: space[2] },
  fact: { flex: 1, padding: space[3], borderRadius: radius.lg, borderCurve: "continuous", gap: space[1], borderWidth: StyleSheet.hairlineWidth },
  note: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: "continuous" },
  heading: { marginBottom: space[2] },
  stopRow: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: size.control.md },
  rail: { width: size.icon.md, alignItems: "center", alignSelf: "stretch" },
  line: { width: size.line.rule, flex: 1 },
  node: { width: size.dot.md, height: size.dot.md, borderRadius: radius.pill, borderWidth: size.line.rule },
  edgeNode: { width: size.icon.xs, height: size.icon.xs, borderRadius: radius.pill, borderWidth: size.line.bar },
});
