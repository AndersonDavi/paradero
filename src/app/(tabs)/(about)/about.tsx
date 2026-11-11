import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { CromaWordmark } from "@/components/croma-mark";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { Text } from "@/components/text";
import { useCity } from "@/cities";
import { useT } from "@/i18n";
import { useHealth } from "@/lib/api";
import { usePalette } from "@/theme/colors";
import { layout, size, space } from "@/theme/tokens";

const REPO = "https://github.com/croma-labs/paradero";
const CROMA = "https://usecroma.com";

const PROMISES = [
  { icon: icons.person, key: "account" },
  { icon: icons.noAds, key: "ads" },
  { icon: icons.location, key: "location" },
  { icon: icons.clock, key: "live" },
  { icon: icons.code, key: "code" },
] as const;


export default function About() {
  const p = usePalette();
  const health = useHealth();
  const t = useT();
  // The words that name a city, its operator and its data; the promises and the rest are the same everywhere.
  const here = t.places[useCity().id].about;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <CromaWordmark height={size.icon.md} color={p.text} />
        </View>
        <Text variant="eyebrow" tone="faint">
          {t.about.publicGoods} ·{" "}
          <Text
            variant="eyebrow"
            tone="muted"
            accessibilityRole="link"
            accessibilityHint={t.about.cromaHint}
            onPress={() => WebBrowser.openBrowserAsync(CROMA)}
            suppressHighlighting
            style={{ textDecorationLine: "underline" }}>
            Croma
          </Text>
        </Text>
        <Text variant="heading">{here.title}</Text>
        <Text variant="body" tone="muted">
          {here.intro}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint" accessibilityRole="header">
          {t.about.promisesTitle}
        </Text>
        <View>
          {PROMISES.map((item, i) => (
            <View key={item.key} accessible style={[styles.promise, { borderTopColor: p.separator, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}>
              <Icon name={item.icon} color={p.text} size="sm" weight="medium" />
              <View style={styles.promiseText}>
                <Text variant="headline">{t.about.promises[item.key].title}</Text>
                <Text variant="callout" tone="muted">
                  {item.key === "live" ? here.live : t.about.promises[item.key].body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint" accessibilityRole="header">
          {t.about.dataTitle}
        </Text>
        <Text variant="body" tone="muted">
          {here.data}
        </Text>
        <FeedStatus feed={health.data?.feed} />
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint" accessibilityRole="header">
          {t.about.helpTitle}
        </Text>
        <Text variant="body" tone="muted">
          {t.about.help}
        </Text>
        <Button label={t.about.report} onPress={() => router.push("/report")} />
        <Button role="link" variant="secondary" label={t.about.code} onPress={() => void WebBrowser.openBrowserAsync(REPO)} />
        <Button role="link" variant="quiet" height="md" label={t.about.privacy} onPress={() => router.push("/privacidad")} />
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint" accessibilityRole="header">
          {t.about.settingsTitle}
        </Text>
        <Text variant="body" tone="muted">
          {t.settings.hint}
        </Text>
        <Button variant="secondary" label={t.settings.open} onPress={() => router.push("/ajustes")} />
      </View>

      <View style={styles.section}>
        <View style={styles.footer}>
          <Text variant="chrome" tone="faint">
            {t.about.footerLeft}
          </Text>
          <Text variant="chrome" tone="faint">
            usecroma.com +
          </Text>
        </View>
        <Text variant="caption" tone="faint">
          {t.about.version(Constants.expoConfig?.version ?? "")}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: layout.tabBarClearance, gap: space[10] },
  hero: { gap: space[3] },
  mark: { marginBottom: space[2] },
  section: { gap: space[3] },
  promise: { flexDirection: "row", gap: space[4], paddingVertical: space[4], alignItems: "flex-start" },
  promiseText: { flex: 1, gap: space[0.5] },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: space[2] },
});
