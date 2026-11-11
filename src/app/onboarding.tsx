import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { city } from "@/cities";
import { Button } from "@/components/button";
import { CromaSymbol, CromaWordmark } from "@/components/croma-mark";
import { Dot } from "@/components/dot";
import { Glass } from "@/components/glass";
import { StopSignGlyph } from "@/components/glyphs";
import { Icon, icons } from "@/components/icon";
import { ParaderoMark } from "@/components/paradero-mark";
import { Text } from "@/components/text";
import { Tile } from "@/components/tile";
import { useT } from "@/i18n";
import { announce, useLargeText } from "@/lib/accessibility";
import { askForLocation } from "@/lib/location";
import { finishOnboarding } from "@/lib/onboarding";
import { photo, signal, usePalette } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { radius, size, space } from "@/theme/tokens";

const PHOTOS: Record<number, number> = {
  0: require("@/assets/images/onboarding/welcome.jpg"),
  2: require("@/assets/images/onboarding/location.jpg"),
};
const STEPS = 3;

const REASONS = [
  { icon: icons.stop, key: "stops" },
  { icon: icons.walk, key: "walk" },
  { icon: icons.lock, key: "privacy" },
] as const;

export default function Onboarding() {
  const p = usePalette();
  const t = useT();
  // What names the city, its operator and its note; the rest of the welcome is the same everywhere.
  const here = t.places[city.id].onboarding;
  const large = useLargeText();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(params.step === "1" ? 1 : params.step === "2" ? 2 : 0);
  const photoStep = step !== 1;
  const chrome = photoStep ? photo.text : p.text;
  const [asking, setAsking] = useState(false);

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
    announce(`${here.note.eyebrow}. ${here.note.title}`);
  };

  const back = () => {
    if (step === 0) return;
    void Haptics.selectionAsync();
    setStep(step - 1);
  };

  // Like stories: a tap on the right moves on, on the left goes back. The last step asks for a real choice, so a tap never answers it.
  const forward = () => {
    if (step === 0) next();
    else if (step === 1) toLocation();
  };

  const [copyTop, setCopyTop] = useState(0);
  const measureCopy = (e: LayoutChangeEvent) => setCopyTop(e.nativeEvent.layout.y);
  const zonesTop = insets.top + space[12];

  const toLocation = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
    announce(`${t.onboarding.locationEyebrow}. ${t.onboarding.locationTitle}`);
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
      {photoStep && (
        <Animated.View key={`photo-${step}`} entering={motion.appear()} exiting={motion.leave} style={[styles.photo, { height: height * (step === 0 ? 0.68 : 0.52) }]}>
          <Image source={PHOTOS[step]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessibilityIgnoresInvertColors />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
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
      )}

      <View style={[styles.top, { paddingTop: insets.top + space[2] }]}>
        <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS, now: step + 1 }}>
          {Array.from({ length: STEPS }, (_, i) => (
            <Segment key={i} active={i <= step} onPhoto={photoStep} />
          ))}
        </View>
        <View style={styles.brand}>
          <View style={styles.name}>
            <ParaderoMark size={size.icon.lg} color={chrome} ring={photoStep ? photo.track : p.fillStrong} />
            <Text variant="headline" color={chrome} accessibilityRole="header">
              Paradero
            </Text>
          </View>
          <View style={styles.name} accessible accessibilityLabel={t.onboarding.byCroma}>
            <Text variant="chrome" color={chrome}>
              {t.onboarding.by}
            </Text>
            <CromaWordmark height={size.icon.xs} color={chrome} />
          </View>
        </View>
      </View>

      {step === 2 && !large && (
        <Animated.View entering={motion.enter(250)} accessible accessibilityLabel={here.preview.label} style={[styles.preview, { top: height * 0.25 }]}>
          <Glass style={styles.previewGlass}>
            <View style={styles.previewRow}>
              <Tile tier="sm" tone="ink">
                <StopSignGlyph size={size.glyph.sm} color={p.onInk} cut={p.ink} />
              </Tile>
              <View style={styles.grow}>
                <Text variant="headline">{here.preview.name}</Text>
                <Text variant="caption" tone="muted">
                  {here.preview.meta}
                </Text>
              </View>
              <View style={styles.previewEta}>
                <Dot color={signal.live} pulse />
                <Text variant="headline" tabular>
                  {here.preview.eta}
                </Text>
              </View>
            </View>
          </Glass>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: step === 1 ? insets.top + space[12] : height * (step === 0 ? 0.4 : 0.3),
            paddingBottom: insets.bottom + space[4],
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={large}>
        {step === 0 ? (
          <Animated.View key="welcome" entering={motion.enter()} exiting={motion.leave} style={styles.copy} onLayout={measureCopy}>
            <Text variant="eyebrow" tone="faint">
              {here.eyebrow}
            </Text>
            <Text variant="poster">{t.onboarding.title}</Text>
            <Text variant="body" tone="muted">
              {here.body}
            </Text>
            <View style={styles.actions}>
              <Button label={t.onboarding.start} onPress={next} />
              <Text variant="chrome" tone="faint" style={styles.center}>
                {t.onboarding.promise}
              </Text>
            </View>
          </Animated.View>
        ) : step === 1 ? (
          <Animated.View key="note" entering={motion.enter()} exiting={motion.leave} style={styles.note} onLayout={measureCopy}>
            {here.note.sign ? <CromaSymbol size={size.tile.xl} color={p.text} /> : <ParaderoMark size={size.tile.xl} color={p.text} ring={p.fillStrong} />}
            <View style={styles.copy}>
              <Text variant="eyebrow" tone="faint">
                {here.note.eyebrow}
              </Text>
              <Text variant="poster">{here.note.title}</Text>
            </View>
            <View
              style={[
                styles.letter,
                {
                  borderColor: p.border,
                  backgroundColor: p.elevated,
                  boxShadow: p.shadowSoft,
                },
              ]}>
              <Text variant="body">{here.note.body}</Text>
              <Text variant="body" tone="muted">
                {here.note.body2}
              </Text>
              {here.note.sign && (
                <View style={[styles.signature, { borderTopColor: p.separator }]}>
                  <CromaWordmark height={size.icon.xs} color={p.text} />
                  <Text variant="chrome" tone="muted">
                    {here.note.sign}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="chrome" tone="faint" style={styles.center}>
              {`+ ${t.onboarding.note.rail} +`}
            </Text>
            <View style={styles.noteActions}>
              <Button label={t.onboarding.note.next} onPress={toLocation} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="location" entering={motion.enter()} style={styles.copy} onLayout={measureCopy}>
            <Text variant="eyebrow" tone="faint">
              {t.onboarding.locationEyebrow}
            </Text>
            <Text variant="heading">{t.onboarding.locationTitle}</Text>
            <View style={styles.reasons}>
              {REASONS.map((r, i) => (
                <Animated.View key={r.key} entering={motion.enter(120 + i * 80)} style={styles.reason}>
                  <Tile tier="sm">
                    <Icon name={r.icon} color={p.text} size="sm" weight="medium" />
                  </Tile>
                  <Text variant="callout" style={styles.grow}>
                    {t.onboarding.reasons[r.key]}
                  </Text>
                </Animated.View>
              ))}
            </View>
            <View style={styles.actions}>
              <Button label={asking ? t.onboarding.asking : t.onboarding.allow} onPress={() => void allow()} disabled={asking} />
              <Button variant="quiet" height="md" label={t.onboarding.skip} onPress={skip} />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {copyTop > zonesTop && (
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.zones, { top: zonesTop, height: copyTop - zonesTop }]}>
          <Pressable accessible={false} style={styles.zoneBack} onPress={back} />
          <Pressable accessible={false} style={styles.zoneNext} onPress={forward} />
        </View>
      )}
    </View>
  );
}

function Segment({ active, onPhoto }: { active: boolean; onPhoto: boolean }) {
  const p = usePalette();
  const fill = useAnimatedStyle(() => ({
    width: withTiming(active ? "100%" : "0%", { duration: 500 }),
  }));
  return (
    <View style={[styles.segment, { backgroundColor: onPhoto ? photo.track : p.fillStrong }]}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: onPhoto ? photo.text : p.ink }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  screen: { flex: 1 },
  photo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space[4],
    gap: space[3],
  },
  progress: { flexDirection: "row", gap: space[1.5] },
  segment: {
    flex: 1,
    height: size.line.bar,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  segmentFill: { height: size.line.bar },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[2],
  },
  name: { flexDirection: "row", alignItems: "center", gap: space[2] },
  preview: { position: "absolute", left: space[6], right: space[6] },
  previewGlass: { borderRadius: radius.xl, overflow: "hidden" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
  },
  previewEta: { flexDirection: "row", alignItems: "center", gap: space[1.5] },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: space[6],
  },
  copy: { gap: space[3] },
  reasons: { gap: space[3], marginTop: space[1] },
  reason: { flexDirection: "row", alignItems: "center", gap: space[3] },
  actions: { marginTop: space[6], gap: space[2] },
  center: { textAlign: "center", marginTop: space[1] },
  note: { gap: space[5] },
  letter: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    padding: space[5],
    gap: space[3],
  },
  signature: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[3],
    marginTop: space[1],
  },
  noteActions: { gap: space[2] },
  zones: { position: "absolute", left: 0, right: 0, flexDirection: "row" },
  zoneBack: { flex: 1 },
  zoneNext: { flex: 2 },
});
