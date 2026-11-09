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
import { useT } from "@/i18n";
import { announce, useAccessibility } from "@/lib/accessibility";
import { ApiError, sendReport } from "@/lib/api";
import { usePalette } from "@/theme/colors";
import { fonts, layout, radius, size, space, type } from "@/theme/tokens";
import { REPORT_KINDS, type ReportKind } from "@/transit/report";

const MIN = 8;
const MAX = 2000;

export default function Report() {
  const p = usePalette();
  const t = useT();
  const { screenReader } = useAccessibility();
  const params = useLocalSearchParams<{ kind?: ReportKind; stopId?: string; stopName?: string; routeId?: string; routeCode?: string }>();
  const [kind, setKind] = useState<ReportKind>(params.kind && params.kind in REPORT_KINDS ? params.kind : params.stopId || params.routeId ? "time" : "idea");
  const [message, setMessage] = useState("");
  const about = params.routeCode ? t.report.route(params.routeCode) : params.stopName ? params.stopName : null;

  const send = useMutation({
    mutationFn: () =>
      sendReport({
        kind,
        message: message.trim(),
        context: { stopId: params.stopId, stopName: params.stopName, routeId: params.routeId, routeCode: params.routeCode },
        app: { version: Constants.expoConfig?.version ?? "0", platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web" },
      }),
    onSuccess: (issue) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      announce(`${t.report.thanks} ${t.report.published(issue.number)}`);
    },
    onError: (error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      announce(error instanceof ApiError && error.status === 429 ? t.report.tooMany : t.report.failed);
    },
  });

  if (send.data) {
    const issue = send.data;
    return (
      <View style={[styles.done, { backgroundColor: p.background }]}>
        <Tile tier="xl">
          <Icon name={icons.check} color={p.text} size="lg" />
        </Tile>
        <Text variant="heading" style={styles.center}>
          {t.report.thanks}
        </Text>
        <Text variant="callout" tone="muted" style={[styles.center, styles.readable]}>
          {t.report.published(issue.number)}
        </Text>
        <View style={styles.actions}>
          <Button label={t.common.done} onPress={() => router.back()} />
          <Button variant="quiet" height="md" role="link" label={t.report.view} onPress={() => void WebBrowser.openBrowserAsync(issue.url)} />
        </View>
      </View>
    );
  }

  const short = message.trim().length < MIN;
  const failure = send.error instanceof ApiError && send.error.status === 429 ? t.report.tooMany : send.error ? t.report.failed : null;

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      <View style={styles.top}>
        <View style={[styles.head, styles.grow]}>
          <Text variant="title">{t.report.title}</Text>
          <Text variant="callout" tone="muted">
            {about ? t.report.about(about) : ""}
            {t.report.anonymous}
          </Text>
        </View>
        <Button variant="quiet" height="md" hug label={t.common.close} onPress={() => router.back()} />
      </View>

      <View accessibilityRole="radiogroup" style={styles.kinds}>
        {(Object.keys(REPORT_KINDS) as ReportKind[]).map((k) => (
          <Chip
            key={k}
            radio
            label={t.report.kinds[k]}
            selected={kind === k}
            onPress={() => {
              void Haptics.selectionAsync();
              setKind(k);
            }}
          />
        ))}
      </View>

      <Text variant="headline" nativeID="report-field">
        {t.report.field}
      </Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={kind === "idea" ? t.report.ideaPlaceholder : t.report.placeholder}
        placeholderTextColor={p.faint}
        multiline
        autoFocus={!screenReader}
        maxLength={MAX}
        textAlignVertical="top"
        accessibilityLabel={t.report.field}
        accessibilityLabelledBy="report-field"
        accessibilityHint={short ? t.report.minimum(MIN) : undefined}
        style={[styles.input, { backgroundColor: p.surface, color: p.text }]}
      />

      <View style={styles.note}>
        <Icon name={icons.info} color={p.faint} size="xs" />
        <Text variant="caption" tone="muted" style={styles.grow}>
          {t.report.public}
        </Text>
      </View>

      {short && message.length > 0 && (
        <Text variant="caption" tone="muted">
          {t.report.minimum(MIN)}
        </Text>
      )}

      {failure && (
        <Text variant="callout" tone="muted" accessibilityRole="alert" accessibilityLiveRegion="assertive">
          {failure}
        </Text>
      )}

      <Button
        label={send.isPending ? t.report.sending : t.report.send}
        accessibilityHint={short ? t.report.minimum(MIN) : undefined}
        disabled={short || send.isPending}
        onPress={() => send.mutate()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.gutter, paddingTop: space[6], gap: space[5], paddingBottom: layout.screenEnd },
  top: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
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
