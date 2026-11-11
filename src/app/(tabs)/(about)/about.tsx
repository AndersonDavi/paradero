import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { CromaWordmark } from "@/components/croma-mark";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { Text } from "@/components/text";
import { LANGUAGES, setLanguage, useLanguageChoice, useT, type Language, type LanguageChoice } from "@/i18n";
import { useHealth } from "@/lib/api";
import { setAppearance, setClock, setContrast, useAppearance, useClock, useContrast, type Appearance, type Clock, type Contrast } from "@/lib/appearance";
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

const APPEARANCES: Appearance[] = ["system", "light", "dark"];
const CONTRASTS: Contrast[] = ["system", "high"];
const CLOCKS: Clock[] = ["12", "24"];
const CHOICES: LanguageChoice[] = ["system", ...(Object.keys(LANGUAGES) as Language[])];

export default function About() {
  const p = usePalette();
  const health = useHealth();
  const appearance = useAppearance();
  const contrast = useContrast();
  const clock = useClock();
  const language = useLanguageChoice();
  const t = useT();

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
        <Text variant="heading">{t.about.title}</Text>
        <Text variant="body" tone="muted">
          {t.about.intro}
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
                  {t.about.promises[item.key].body}
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
          {t.about.data}
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
        <Choices label={t.about.language.label}>
          {CHOICES.map((c) => {
            const label = c === "system" ? t.about.language.system : LANGUAGES[c].name;
            return <Chip key={c} radio label={label} accessibilityLabel={`${label}, ${t.about.language.label}`} selected={language === c} onPress={() => setLanguage(c)} />;
          })}
        </Choices>
        <Choices label={t.about.appearance.label}>
          {APPEARANCES.map((a) => (
            <Chip key={a} radio label={t.about.appearance[a]} accessibilityLabel={`${t.about.appearance[a]}, ${t.about.appearance.label}`} selected={appearance === a} onPress={() => setAppearance(a)} />
          ))}
        </Choices>
        <Choices label={t.about.contrast.label}>
          {CONTRASTS.map((c) => (
            <Chip key={c} radio label={t.about.contrast[c]} accessibilityLabel={`${t.about.contrast[c]}, ${t.about.contrast.label}`} selected={contrast === c} onPress={() => setContrast(c)} />
          ))}
        </Choices>
        <Choices label={t.about.clock.label}>
          {CLOCKS.map((c) => (
            <Chip key={c} radio label={t.about.clock[c]} accessibilityLabel={`${t.about.clock[c]}, ${t.about.clock.label}`} selected={clock === c} onPress={() => setClock(c)} />
          ))}
        </Choices>
        <Text variant="callout" tone="muted">
          {t.about.accessibility}
        </Text>
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

function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choices}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: layout.tabBarClearance, gap: space[10] },
  hero: { gap: space[3] },
  mark: { marginBottom: space[2] },
  section: { gap: space[3] },
  promise: { flexDirection: "row", gap: space[4], paddingVertical: space[4], alignItems: "flex-start" },
  promiseText: { flex: 1, gap: space[0.5] },
  group: { gap: space[2] },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: space[2] },
});
