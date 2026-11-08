import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { PressableScale } from "pressto";
import { ScrollView, StyleSheet, View } from "react-native";

import { FeedStatus } from "@/components/feed-status";
import { StopSignGlyph } from "@/components/glyphs";
import { Icon, icons } from "@/components/icon";
import { Text } from "@/components/text";
import { useHealth } from "@/lib/api";
import { usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

const REPO = "https://github.com/croma-labs/paradero";

const PROMISES = [
  { icon: icons.person, title: "Sin cuenta", body: "Abres la app y ya. No pedimos correo, teléfono ni cédula." },
  { icon: icons.noAds, title: "Sin publicidad, nunca", body: "Moverte por tu ciudad no debería venir con anuncios." },
  { icon: icons.location, title: "Tu ubicación no se guarda", body: "Solo la usamos con la app abierta, redondeada a una cuadra." },
  { icon: icons.clock, title: "Te decimos qué es en vivo", body: "Si TransMilenio deja de publicar, lo ves en pantalla y usamos el horario publicado." },
  { icon: icons.code, title: "Código abierto", body: "Cualquiera puede revisarlo, mejorarlo o llevárselo. Licencia MIT." },
];

export default function About() {
  const p = usePalette();
  const health = useHealth();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: p.ink }]}>
          <StopSignGlyph size={24} color={p.onInk} cut={p.ink} />
        </View>
        <Text variant="eyebrow" tone="faint">
          Bienes Públicos Digitales · Croma
        </Text>
        <Text variant="serif">Bogotá merece la mejor app para moverse.</Text>
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
              <Icon name={item.icon} color={p.text} size={17} weight="medium" />
              <View style={{ flex: 1, gap: 2 }}>
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
          Si una ruta no aparece, una hora está mal o se te ocurre algo que te haría la vida más fácil, cuéntanos.
        </Text>
        <PressableScale accessibilityRole="link" accessibilityLabel="Reportar un problema o una idea" onPress={() => void WebBrowser.openBrowserAsync(`${REPO}/issues/new`)} style={[styles.button, { backgroundColor: p.ink }]}>
          <Text variant="headline" tone="inverse">
            Reportar un problema o una idea
          </Text>
        </PressableScale>
        <PressableScale accessibilityRole="link" accessibilityLabel="Ver el código" onPress={() => void WebBrowser.openBrowserAsync(REPO)} style={[styles.button, { borderColor: p.separator, borderWidth: StyleSheet.hairlineWidth }]}>
          <Text variant="headline">Ver el código</Text>
        </PressableScale>
      </View>

      <Text variant="caption" tone="faint" style={styles.footer}>
        Paradero {Constants.expoConfig?.version}  ·  Hecho en Bogotá por Croma y la comunidad
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl - 4, paddingTop: space.md, paddingBottom: 120, gap: space.xxl + 8 },
  hero: { gap: space.md },
  mark: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: space.sm, borderCurve: "continuous" },
  section: { gap: space.md },
  promise: { flexDirection: "row", gap: space.lg, paddingVertical: space.lg, alignItems: "flex-start" },
  button: { height: 54, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  footer: { textAlign: "center" },
});
