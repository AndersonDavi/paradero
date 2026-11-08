import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { PressableScale } from "pressto";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Dot } from "@/components/dot";
import { Glass } from "@/components/glass";
import { StopSignGlyph } from "@/components/glyphs";
import { Icon, icons } from "@/components/icon";
import { Text } from "@/components/text";
import { askForLocation } from "@/lib/location";
import { finishOnboarding } from "@/lib/onboarding";
import { signal, usePalette } from "@/theme/colors";
import { radius, space } from "@/theme/tokens";

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
      <Animated.View key={`photo-${step}`} entering={FadeIn.duration(600)} exiting={FadeOut.duration(400)} style={[styles.photo, { height: height * (step === 0 ? 0.68 : 0.52) }]}>
        <Image source={PHOTOS[step]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessibilityIgnoresInvertColors />
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000" stopOpacity="0.38" />
              <Stop offset="0.22" stopColor="#000" stopOpacity="0" />
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

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.progress}>
          {[0, 1].map((i) => (
            <Segment key={i} active={i <= step} />
          ))}
        </View>
        <View style={styles.brand}>
          <StopSignGlyph size={18} color="#FFFFFF" cut="rgba(0,0,0,0.35)" />
          <Text variant="headline" color="#FFFFFF">
            Paradero
          </Text>
        </View>
      </View>

      {step === 1 && (
        <Animated.View entering={FadeInDown.delay(250).springify().damping(18)} style={[styles.preview, { top: height * 0.25 }]}>
          <Glass style={styles.previewGlass}>
            <View style={styles.previewRow}>
              <View style={[styles.previewIcon, { backgroundColor: p.ink }]}>
                <StopSignGlyph size={16} color={p.onInk} cut={p.ink} />
              </View>
              <View style={{ flex: 1 }}>
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

      <View style={[styles.content, { paddingBottom: insets.bottom + space.lg }]}>
        {step === 0 ? (
          <Animated.View key="welcome" entering={FadeInDown.duration(500)} exiting={FadeOut.duration(200)} style={styles.copy}>
            <Text variant="eyebrow" tone="faint">
              Un bien público para Bogotá
            </Text>
            <Text variant="serif" style={styles.title}>
              Tu bus, sin adivinar.
            </Text>
            <Text variant="body" tone="muted">
              Cuándo llega tu bus, desde el paradero de la esquina hasta el portal. TransMilenio, SITP y alimentadores en un solo lugar.
            </Text>
            <View style={styles.actions}>
              <Primary label="Empezar" onPress={next} />
              <Text variant="caption" tone="faint" style={styles.center}>
                Gratis · Sin cuenta · Sin anuncios
              </Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="location" entering={FadeInDown.duration(500)} style={styles.copy}>
            <Text variant="eyebrow" tone="faint">
              Tu ubicación
            </Text>
            <Text variant="serif" style={[styles.title, styles.titleTight]}>
              Te ponemos en el mapa.
            </Text>
            <View style={styles.reasons}>
              {REASONS.map((r, i) => (
                <Animated.View key={r.text} entering={FadeInDown.delay(120 + i * 80).duration(420)} style={styles.reason}>
                  <View style={[styles.reasonIcon, { backgroundColor: p.surface }]}>
                    <Icon name={r.icon} color={p.text} size={15} weight="medium" />
                  </View>
                  <Text variant="callout" style={{ flex: 1 }}>
                    {r.text}
                  </Text>
                </Animated.View>
              ))}
            </View>
            <View style={styles.actions}>
              <Primary label={asking ? "Un momento…" : "Permitir ubicación"} onPress={() => void allow()} disabled={asking} />
              <PressableScale accessibilityRole="button" accessibilityLabel="Ahora no, buscar sin ubicación" onPress={skip} style={styles.secondary}>
                <Text variant="headline" weight={500} tone="muted">
                  Ahora no
                </Text>
              </PressableScale>
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

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const p = usePalette();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={disabled ? undefined : onPress} style={[styles.primary, { backgroundColor: p.ink, opacity: disabled ? 0.7 : 1 }]}>
      <Text variant="headline" tone="inverse">
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  photo: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: space.lg, gap: space.md },
  progress: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  segmentFill: { height: 3, backgroundColor: "#FFFFFF" },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  preview: { position: "absolute", left: space.xl, right: space.xl },
  previewGlass: { borderRadius: radius.xl, overflow: "hidden" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md + 2 },
  previewIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  previewEta: { flexDirection: "row", alignItems: "center", gap: 7 },
  content: { flex: 1, justifyContent: "flex-end", paddingHorizontal: space.xl - 2 },
  copy: { gap: space.md },
  title: { fontSize: 46, lineHeight: 48 },
  titleTight: { fontSize: 38, lineHeight: 40 },
  reasons: { gap: space.md, marginTop: space.xs },
  reason: { flexDirection: "row", alignItems: "center", gap: space.md },
  reasonIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actions: { marginTop: space.xl, gap: space.sm },
  primary: { height: 58, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  secondary: { height: 50, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center", marginTop: space.xs },
});
