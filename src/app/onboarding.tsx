import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Button } from "@/components/button";
import { CromaWordmark } from "@/components/croma-mark";
import { Dot } from "@/components/dot";
import { Glass } from "@/components/glass";
import { StopSignGlyph } from "@/components/glyphs";
import { Icon, icons } from "@/components/icon";
import { ParaderoMark } from "@/components/paradero-mark";
import { Text } from "@/components/text";
import { Tile } from "@/components/tile";
import { askForLocation } from "@/lib/location";
import { finishOnboarding } from "@/lib/onboarding";
import { photo, signal, usePalette } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { radius, size, space } from "@/theme/tokens";

const PHOTOS = [require("@/assets/images/onboarding/welcome.jpg"), require("@/assets/images/onboarding/location.jpg")];

const REASONS = [
  { icon: icons.stop, text: "Los paraderos y estaciones a una cuadra de ti" },
  { icon: icons.walk, text: "Cuántos minutos caminas hasta cada uno" },
  { icon: icons.lock, text: "Solo con la app abierta y redondeada a una cuadra. Nunca la guardamos." },
];

export default function Onboarding() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(params.step === "1" ? 1 : 0);
  const [asking, setAsking] = useState(false);

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
  };

  const allow = async () => {
    setAsking(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await askForLocation().catch(() => false);
    finishOnboarding();
  };

  const skip = () => {
    void Haptics.selectionAsync();
    finishOnboarding();
  };

  return (
    <View style={[styles.screen, { backgroundColor: p.background }]}>
      <Animated.View key={`photo-${step}`} entering={motion.appear()} exiting={motion.leave} style={[styles.photo, { height: height * (step === 0 ? 0.68 : 0.52) }]}>
        <Image source={PHOTOS[step]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessibilityIgnoresInvertColors />
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={photo.scrim} stopOpacity="0.38" />
              <Stop offset="0.22" stopColor={photo.scrim} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.45" stopColor={p.background} stopOpacity="0" />
              <Stop offset="0.78" stopColor={p.background} stopOpacity="0.85" />
              <Stop offset="1" stopColor={p.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#top)" />
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </Animated.View>

      <View style={[styles.top, { paddingTop: insets.top + space[2] }]}>
        <View style={styles.progress}>
          {[0, 1].map((i) => (
            <Segment key={i} active={i <= step} />
          ))}
        </View>
        <View style={styles.brand}>
          <View style={styles.name}>
            <ParaderoMark size={size.icon.lg} color={photo.text} ring={photo.track} />
            <Text variant="headline" color={photo.text}>
              Paradero
            </Text>
          </View>
          <View style={styles.name} accessible accessibilityLabel="Un bien público de Croma">
            <Text variant="chrome" color={photo.text}>
              por
            </Text>
            <CromaWordmark height={size.icon.xs} color={photo.text} />
          </View>
        </View>
      </View>

      {step === 1 && (
        <Animated.View entering={motion.enter(250)} style={[styles.preview, { top: height * 0.25 }]}>
          <Glass style={styles.previewGlass}>
            <View style={styles.previewRow}>
              <Tile tier="sm" tone="ink">
                <StopSignGlyph size={size.glyph.sm} color={p.onInk} cut={p.ink} />
              </Tile>
              <View style={styles.grow}>
                <Text variant="headline">C.C. Lourdes</Text>
                <Text variant="caption" tone="muted">
                  Paradero · 58 m · 1 min a pie
                </Text>
              </View>
              <View style={styles.previewEta}>
                <Dot color={signal.live} pulse />
                <Text variant="headline" tabular>
                  4 min
                </Text>
              </View>
            </View>
          </Glass>
        </Animated.View>
      )}

      <View style={[styles.content, { paddingBottom: insets.bottom + space[4] }]}>
        {step === 0 ? (
          <Animated.View key="welcome" entering={motion.enter()} exiting={motion.leave} style={styles.copy}>
            <Text variant="eyebrow" tone="faint">
              Un bien público para Bogotá
            </Text>
            <Text variant="poster">
              Tu bus, sin adivinar.
            </Text>
            <Text variant="body" tone="muted">
              Cuándo llega tu bus, desde el paradero de la esquina hasta el portal. TransMilenio, SITP y alimentadores en un solo lugar.
            </Text>
            <View style={styles.actions}>
              <Button label="Empezar" onPress={next} />
              <Text variant="chrome" tone="faint" style={styles.center}>
                Gratis · Sin cuenta · Sin anuncios
              </Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="location" entering={motion.enter()} style={styles.copy}>
            <Text variant="eyebrow" tone="faint">
              Tu ubicación
            </Text>
            <Text variant="heading">
              Te ponemos en el mapa.
            </Text>
            <View style={styles.reasons}>
              {REASONS.map((r, i) => (
                <Animated.View key={r.text} entering={motion.enter(120 + i * 80)} style={styles.reason}>
                  <Tile tier="sm">
                    <Icon name={r.icon} color={p.text} size="sm" weight="medium" />
                  </Tile>
                  <Text variant="callout" style={styles.grow}>
                    {r.text}
                  </Text>
                </Animated.View>
              ))}
            </View>
            <View style={styles.actions}>
              <Button label={asking ? "Un momento…" : "Permitir ubicación"} onPress={() => void allow()} disabled={asking} />
              <Button variant="quiet" height="md" label="Ahora no" accessibilityLabel="Ahora no, buscar sin ubicación" onPress={skip} />
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function Segment({ active }: { active: boolean }) {
  const fill = useAnimatedStyle(() => ({ width: withTiming(active ? "100%" : "0%", { duration: 500 }) }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  screen: { flex: 1 },
  photo: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: space[4], gap: space[3] },
  progress: { flexDirection: "row", gap: space[1.5] },
  segment: { flex: 1, height: size.line.bar, borderRadius: radius.pill, backgroundColor: photo.track, overflow: "hidden" },
  segmentFill: { height: size.line.bar, backgroundColor: photo.text },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] },
  name: { flexDirection: "row", alignItems: "center", gap: space[2] },
  preview: { position: "absolute", left: space[6], right: space[6] },
  previewGlass: { borderRadius: radius.xl, overflow: "hidden" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[3] },
  previewEta: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  content: { flex: 1, justifyContent: "flex-end", paddingHorizontal: space[6] },
  copy: { gap: space[3] },
  reasons: { gap: space[3], marginTop: space[1] },
  reason: { flexDirection: "row", alignItems: "center", gap: space[3] },
  actions: { marginTop: space[6], gap: space[2] },
  center: { textAlign: "center", marginTop: space[1] },
});
