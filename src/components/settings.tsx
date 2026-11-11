import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { chooseCity, cities, useCity, type CityId } from "@/cities";
import { LANGUAGES, setLanguage, useLanguageChoice, useT, type Language, type LanguageChoice } from "@/i18n";
import { setAppearance, setClock, setContrast, useAppearance, useClock, useContrast, type Appearance, type Clock, type Contrast } from "@/lib/appearance";
import { space } from "@/theme/tokens";

import { Chip } from "./chip";
import { Text } from "./text";

const APPEARANCES: Appearance[] = ["system", "light", "dark"];
const CONTRASTS: Contrast[] = ["system", "high"];
const CLOCKS: Clock[] = ["12", "24"];
const CHOICES: LanguageChoice[] = ["system", ...(Object.keys(LANGUAGES) as Language[])];
const CITIES = Object.keys(cities) as CityId[];

/** The rider's choices: which city, and how the app reads and looks. Each one applies at once and stays on the phone. */
export function Settings() {
  const city = useCity();
  const appearance = useAppearance();
  const contrast = useContrast();
  const clock = useClock();
  const language = useLanguageChoice();
  const t = useT();

  return (
    <View style={styles.list}>
      <View style={styles.group}>
        <Choices label={t.settings.city}>
          {CITIES.map((id) => (
            <Chip key={id} radio label={cities[id].name} accessibilityLabel={`${cities[id].name}, ${t.settings.city}`} selected={city.id === id} onPress={() => chooseCity(id)} />
          ))}
        </Choices>
        <Text variant="caption" tone="faint">
          {t.settings.cityHint}
        </Text>
      </View>
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
  );
}

export function Choices({ label, children }: { label: string; children: ReactNode }) {
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
  list: { gap: space[5] },
  group: { gap: space[2] },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
