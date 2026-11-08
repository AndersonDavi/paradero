import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { CromaWordmark } from "@/components/croma-mark";
import { FeedStatus } from "@/components/feed-status";
import { Icon, icons } from "@/components/icon";
import { Text } from "@/components/text";
import { useHealth } from "@/lib/api";
import { setAppearance, setContrast, useAppearance, useContrast, type Appearance, type Contrast } from "@/lib/appearance";
import { usePalette } from "@/theme/colors";
import { layout, size, space } from "@/theme/tokens";

const REPO = "https://github.com/croma-labs/paradero";
const CROMA = "https://usecroma.com";

const PROMISES = [
  { icon: icons.person, title: "Sin cuenta", body: "Abres la app y ya. No pedimos correo, teléfono ni cédula." },
  { icon: icons.noAds, title: "Sin publicidad, nunca", body: "Moverte por tu ciudad no debería venir con anuncios." },
  { icon: icons.location, title: "Tu ubicación no se guarda", body: "Solo la usamos con la app abierta, redondeada a una cuadra." },
  { icon: icons.clock, title: "Te decimos qué es en vivo", body: "Si TransMilenio deja de publicar, lo ves en pantalla y usamos el horario publicado." },
  { icon: icons.code, title: "Código abierto", body: "Cualquiera puede revisarlo, mejorarlo o llevárselo. Licencia MIT." },
];

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: "system", label: "Automática" },
  { value: "light", label: "Clara" },
  { value: "dark", label: "Oscura" },
];

const CONTRASTS: { value: Contrast; label: string }[] = [
  { value: "system", label: "Contraste del teléfono" },
  { value: "high", label: "Alto contraste" },
];

export default function About() {
  const p = usePalette();
  const health = useHealth();
  const appearance = useAppearance();
  const contrast = useContrast();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <CromaWordmark height={size.icon.md} color={p.text} />
        </View>
        <Text variant="eyebrow" tone="faint">
          Bienes Públicos Digitales ·{" "}
          <Text
            variant="eyebrow"
            tone="muted"
            accessibilityRole="link"
            accessibilityHint="Abre la página de Croma"
            onPress={() => WebBrowser.openBrowserAsync(CROMA)}
            style={{ textDecorationLine: "underline" }}>
            Croma
          </Text>
        </Text>
        <Text variant="heading">Bogotá merece la mejor app para moverse.</Text>
        <Text variant="body" tone="muted">
          Paradero es gratis, abierta y de todos. La ponemos a disposición de la Alcaldía de Bogotá y de TransMilenio para que la adopten, la mantengan y la hagan suya.
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint">
          Lo que te prometemos
        </Text>
        <View>
          {PROMISES.map((item, i) => (
            <View key={item.title} style={[styles.promise, { borderTopColor: p.separator, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}>
              <Icon name={item.icon} color={p.text} size="sm" weight="medium" />
              <View style={styles.promiseText}>
                <Text variant="headline">{item.title}</Text>
                <Text variant="callout" tone="muted">
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint">
          De dónde salen los datos
        </Text>
        <Text variant="body" tone="muted">
          De los datos abiertos de TransMilenio: la posición de cada bus cada 20 segundos, los horarios y las novedades del servicio. Croma los organiza para que cualquiera pueda construir sobre ellos.
        </Text>
        <FeedStatus feed={health.data?.feed} />
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint">
          Hazla mejor con nosotros
        </Text>
        <Text variant="body" tone="muted">
          Si una ruta no aparece, una hora está mal o se te ocurre algo que te haría la vida más fácil, cuéntanos. No necesitas cuenta.
        </Text>
        <Button label="Reportar un problema o una idea" onPress={() => router.push("/report")} />
        <Button role="link" variant="secondary" label="Ver el código" onPress={() => void WebBrowser.openBrowserAsync(REPO)} />
      </View>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="faint">
          Apariencia y accesibilidad
        </Text>
        <View style={styles.choices}>
          {APPEARANCES.map((a) => (
            <Chip key={a.value} label={a.label} accessibilityLabel={`Apariencia: ${a.label}`} selected={appearance === a.value} onPress={() => setAppearance(a.value)} />
          ))}
        </View>
        <View style={styles.choices}>
          {CONTRASTS.map((c) => (
            <Chip key={c.value} label={c.label} accessibilityLabel={`Contraste: ${c.label}`} selected={contrast === c.value} onPress={() => setContrast(c.value)} />
          ))}
        </View>
        <Text variant="callout" tone="muted">
          Paradero sigue la accesibilidad de tu teléfono: texto grande, negrita, más contraste, menos movimiento, menos transparencia y lectores de pantalla como VoiceOver y TalkBack.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.footer}>
          <Text variant="chrome" tone="faint">
            + Infraestructura de datos públicos
          </Text>
          <Text variant="chrome" tone="faint">
            usecroma.com +
          </Text>
        </View>
        <Text variant="caption" tone="faint">
          Paradero {Constants.expoConfig?.version} · Hecho en Bogotá por Croma y la comunidad
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
  choices: { flexDirection: "row", gap: space[2] },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: space[2] },
});
