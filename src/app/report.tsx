import { useMutation } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { Icon, icons } from "@/components/icon";
import { Text } from "@/components/text";
import { Tile } from "@/components/tile";
import { ApiError, sendReport } from "@/lib/api";
import { usePalette } from "@/theme/colors";
import { fonts, layout, radius, size, space, type } from "@/theme/tokens";
import { REPORT_KINDS, type ReportKind } from "@/transit/report";

const MIN = 8;
const MAX = 2000;

export default function Report() {
  const p = usePalette();
  const params = useLocalSearchParams<{ kind?: ReportKind; stopId?: string; stopName?: string; routeId?: string; routeCode?: string }>();
  const [kind, setKind] = useState<ReportKind>(params.kind && params.kind in REPORT_KINDS ? params.kind : params.stopId || params.routeId ? "time" : "idea");
  const [message, setMessage] = useState("");
  const about = params.routeCode ? `la ruta ${params.routeCode}` : params.stopName ? params.stopName : null;

  const send = useMutation({
    mutationFn: () =>
      sendReport({
        kind,
        message: message.trim(),
        context: { stopId: params.stopId, stopName: params.stopName, routeId: params.routeId, routeCode: params.routeCode },
        app: { version: Constants.expoConfig?.version ?? "0", platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web" },
      }),
    onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    onError: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  });

  if (send.data) {
    const issue = send.data;
    return (
      <View style={[styles.done, { backgroundColor: p.background }]}>
        <Tile tier="xl">
          <Icon name={icons.check} color={p.text} size="lg" />
        </Tile>
        <Text variant="heading" style={styles.center}>
          Gracias, ya nos llegó.
        </Text>
        <Text variant="callout" tone="muted" style={[styles.center, styles.readable]}>
          Quedó publicado como el reporte #{issue.number}. Cualquiera puede ver cómo avanza, también la Alcaldía y TransMilenio.
        </Text>
        <View style={styles.actions}>
          <Button label="Listo" onPress={() => router.back()} />
          <Button variant="quiet" height="md" role="link" label="Ver el reporte" onPress={() => void WebBrowser.openBrowserAsync(issue.url)} />
        </View>
      </View>
    );
  }

  const short = message.trim().length < MIN;
  const failure = send.error instanceof ApiError && send.error.status === 429 ? "Enviaste varios reportes seguidos. Intenta en un rato." : send.error ? "No pudimos enviarlo. Revisa tu conexión e intenta de nuevo." : null;

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={styles.head}>
        <Text variant="title">Cuéntanos qué pasó</Text>
        <Text variant="callout" tone="muted">
          {about ? `Sobre ${about}. ` : ""}No necesitas cuenta ni dejar tus datos.
        </Text>
      </View>

      <View style={styles.kinds}>
        {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k) => (
          <Chip
            key={k}
            label={REPORT_KINDS[k]}
            selected={kind === k}
            onPress={() => {
              void Haptics.selectionAsync();
              setKind(k);
            }}
          />
        ))}
      </View>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={kind === "idea" ? "¿Qué te haría la vida más fácil?" : "Qué viste, dónde y a qué hora"}
        placeholderTextColor={p.faint}
        multiline
        autoFocus
        maxLength={MAX}
        textAlignVertical="top"
        accessibilityLabel="Tu reporte"
        style={[styles.input, { backgroundColor: p.surface, color: p.text }]}
      />

      <View style={styles.note}>
        <Icon name={icons.info} color={p.faint} size="xs" />
        <Text variant="caption" tone="muted" style={styles.grow}>
          Tu reporte será público para que todos puedan seguirlo. No escribas tu nombre, teléfono ni cédula; si se cuelan, los ocultamos.
        </Text>
      </View>

      {failure && (
        <Text variant="callout" tone="muted" accessibilityRole="alert">
          {failure}
        </Text>
      )}

      <Button label={send.isPending ? "Enviando…" : "Enviar reporte"} disabled={short || send.isPending} onPress={() => send.mutate()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.gutter, paddingTop: space[6], gap: space[5], paddingBottom: layout.screenEnd },
  head: { gap: space[1] },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  input: {
    minHeight: size.tile.xl * 2,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: space[4],
    paddingTop: space[4],
    fontFamily: fonts[400],
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
  },
  note: { flexDirection: "row", gap: space[2], alignItems: "flex-start" },
  grow: { flex: 1 },
  done: { flex: 1, alignItems: "center", justifyContent: "center", padding: space[6], gap: space[3] },
  center: { textAlign: "center" },
  readable: { maxWidth: layout.readable },
  actions: { alignSelf: "stretch", gap: space[2], marginTop: space[4] },
});
