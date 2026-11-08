import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { toast } from "sonner-native";

import { AlertCard } from "@/components/alert-card";
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
import { useStop } from "@/lib/api";
import { toggleStop, useIsSaved } from "@/lib/saved";
import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

export default function StopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { height } = useWindowDimensions();
  const { data, isLoading, isError, refetch } = useStop(id);
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
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
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

      <View style={{ height: Math.round(height * 0.36) }}>
        {data && (
          <TransitMap
            center={{ lat: data.stop.lat, lon: data.stop.lon }}
            zoom={15.5}
            stops={[data.stop]}
            buses={data.feed.live ? data.incoming.filter((b) => !only || b.code === only) : []}
            padding={{ top: 90, right: 24, bottom: 40, left: 24 }}
          />
        )}
      </View>

      <ScrollView style={[styles.sheet, { backgroundColor: p.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && <SkeletonList rows={5} kind="arrival" />}
        {isError && <Empty title="No pudimos cargar este paradero" body="Revisa tu conexión. Si sigue fallando, puede que TransMilenio no esté respondiendo." action="Reintentar" onAction={() => void refetch()} />}

        {data && (
          <>
            <View style={styles.header}>
              <StopTile kind={data.stop.kind} size={52} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="title" accessibilityRole="header" numberOfLines={2}>
                  {data.stop.name}
                </Text>
                <View style={styles.meta}>
                  <Text variant="caption" tone="muted">
                    {data.stop.kind === "station" ? "Estación TransMilenio" : "Paradero SITP"}
                  </Text>
                  {data.stop.accessible && (
                    <View style={styles.meta}>
                      <Icon name={icons.wheelchair} color={p.faint} size={12} />
                      <Text variant="caption" tone="muted">
                        Accesible
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {codes.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.bleed}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Ver todas las rutas"
                  accessibilityState={{ selected: !only }}
                  onPress={() => setOnly(null)}
                  style={[styles.all, { backgroundColor: !only ? p.ink : p.fillStrong }]}>
                  <Text variant="caption" weight={600} tone={!only ? "inverse" : "default"}>
                    Todas
                  </Text>
                </PressableScale>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, marginTop: -28, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderCurve: "continuous" },
  content: { padding: space.lg, paddingTop: space.xl, gap: space.lg + 2, paddingBottom: 80 },
  header: { flexDirection: "row", alignItems: "center", gap: space.md + 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, flexWrap: "wrap" },
  bleed: { marginHorizontal: -space.lg },
  filters: { gap: space.sm, alignItems: "center", paddingHorizontal: space.lg },
  all: { paddingHorizontal: space.lg, height: 34, justifyContent: "center", borderRadius: radius.pill },
  chip: { padding: 2, borderRadius: 11, borderWidth: 2 },
  heading: { marginBottom: space.xs },
});
