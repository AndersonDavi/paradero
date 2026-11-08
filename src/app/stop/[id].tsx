import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { toast } from "sonner-native";

import { AlertCard } from "@/components/alert-card";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { DetailScreen } from "@/components/detail-screen";
import { ArrivalRow } from "@/components/arrival-row";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { NextBus } from "@/components/next-bus";
import { RouteBadge } from "@/components/route-badge";
import { RouteRow } from "@/components/route-row";
import { SkeletonList } from "@/components/skeleton";
import { Empty } from "@/components/state";
import { StopTile } from "@/components/stop-row";
import { Text } from "@/components/text";
import { TransitMap } from "@/components/transit-map";
import { announce } from "@/lib/accessibility";
import { knownStop, useStop } from "@/lib/api";
import { toggleStop, useIsSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { layout, radius, size, space } from "@/theme/tokens";

export default function StopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { data, isLoading, isError, refetch } = useStop(id);
  const [early] = useState(() => knownStop(id));
  const stop = data?.stop ?? early;
  const saved = useIsSaved("stop", id);
  const [only, setOnly] = useState<string | null>(null);

  const codes = useMemo(() => [...new Set((data?.arrivals ?? []).map((a) => a.code))], [data]);
  const arrivals = (data?.arrivals ?? []).filter((a) => !only || a.code === only);
  const [next, ...later] = arrivals;

  const save = () => {
    if (!data) return;
    const added = toggleStop(data.stop);
    void Haptics.notificationAsync(added ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (added) toast.success("Paradero guardado", { description: "Lo verás arriba en Cerca, con sus próximos buses." });
    else toast("Lo quitamos de tus paraderos");
    announce(added ? "Paradero guardado. Lo verás arriba en Cerca." : "Lo quitamos de tus paraderos.");
  };

  return (
    <>
      {data && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={saved ? "star.fill" : "star"}
            tintColor={p.text}
            accessibilityLabel={saved ? "Quitar de tus paraderos" : "Guardar este paradero"}
            onPress={save}
          />
        </Stack.Toolbar>
      )}

      <DetailScreen
        map={
          stop && (
            <TransitMap
              center={{ lat: stop.lat, lon: stop.lon }}
              zoom={15.5}
              stops={[stop]}
              buses={data?.feed.live ? data.incoming.filter((b) => !only || b.code === only) : []}
              padding={layout.mapInset}
            />
          )
        }>
        {stop && (
          <View style={styles.header}>
            <StopTile kind={stop.kind} tier="lg" />
            <View style={styles.titles}>
              <Text variant="title" accessibilityRole="header" numberOfLines={2}>
                {stop.name}
              </Text>
              <View style={styles.meta}>
                <Text variant="caption" tone="muted">
                  {stop.kind === "station" ? "Estación TransMilenio" : "Paradero SITP"}
                </Text>
                {stop.accessible && (
                  <View style={styles.meta}>
                    <Icon name={icons.wheelchair} color={p.faint} size="xs" />
                    <Text variant="caption" tone="muted">
                      Accesible
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
        {isLoading && <SkeletonList rows={5} kind="arrival" />}
        {isError && <Empty title="No pudimos cargar este paradero" body="Revisa tu conexión. Si sigue fallando, puede que TransMilenio no esté respondiendo." action="Reintentar" onAction={() => void refetch()} />}

        {data && (
          <>
            {codes.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.bleed}>
                <Chip label="Todas" accessibilityLabel="Ver todas las rutas" selected={!only} onPress={() => setOnly(null)} />
                {codes.map((c) => {
                  const a = data.arrivals.find((x) => x.code === c)!;
                  const on = only === c;
                  return (
                    <PressableScale
                      key={c}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver solo la ruta ${c}`}
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setOnly(on ? null : c);
                      }}
                      style={[styles.chip, { borderColor: on ? p.ink : "transparent", opacity: only && !on ? 0.5 : 1 }]}>
                      <RouteBadge code={c} system={a.system} />
                    </PressableScale>
                  );
                })}
              </ScrollView>
            )}

            {next ? (
              <NextBus arrival={next} />
            ) : (
              <Empty title="No hay buses próximos" body="Puede que el servicio de estas rutas haya terminado por hoy. Mira el horario de cada ruta abajo." />
            )}

            <FeedStatus feed={data.feed} />
            <AlertCard alerts={data.alerts} />

            {later.length > 0 && (
              <View>
                <Text variant="title" style={styles.heading}>
                  Más tarde
                </Text>
                {later.slice(0, 10).map((a, i) => (
                  <ArrivalRow key={`${a.code}-${a.at}-${i}`} arrival={a} first={i === 0} index={i} />
                ))}
              </View>
            )}

            <View>
              <Text variant="title" style={styles.heading}>
                Rutas que paran aquí
              </Text>
              <View style={styles.bleed}>
                {data.stop.routes.map((r) => (
                  <RouteRow key={r.id} route={r} />
                ))}
              </View>
            </View>
          </>
        )}
        {stop && (
          <Button
            variant="quiet"
            height="md"
            label="¿Algo está mal aquí?"
            accessibilityLabel="Reportar un problema con este paradero"
            onPress={() => router.push({ pathname: "/report", params: { stopId: stop.id, stopName: stop.name } })}
          />
        )}
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
  chip: { padding: space[0.5], borderRadius: radius.md, borderWidth: size.line.rule, borderCurve: "continuous" },
  heading: { marginBottom: space[1] },
});
