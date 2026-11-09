import NativeMaskedView from "@react-native-masked-view/masked-view";
import { createContext, useContext, type ComponentType, type ReactElement } from "react";
import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type ViewProps } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { LANGUAGES, useLanguage } from "@/i18n";
import { useAccessibility } from "@/lib/accessibility";
import { usePalette } from "@/theme/colors";
import { fonts, type, type TypeVariant, type Weight } from "@/theme/tokens";

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  weight?: Weight;
  tone?: "default" | "muted" | "faint" | "inverse";
  color?: string;
  tabular?: boolean;
}

/** The package still types itself as a React 18 class component; this is the same component, typed for React 19. */
const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

const LARGE: ReadonlySet<TypeVariant> = new Set(["poster", "hero", "heading", "display"]);
const HEADERS: ReadonlySet<TypeVariant> = new Set(["poster", "hero", "heading", "display", "title"]);

/** With the phone's Bold Text on, every weight steps up one, because custom fonts do not do it themselves. */
const BOLDER: Record<Weight, Weight> = { 400: 500, 500: 600, 600: 700, 700: 700 };

/** Spans inside a title must stay plain text, so a title only fades at the top level. */
const Nested = createContext(false);

/** One type scale for the whole app, so every screen reads like the same product. */
export function Text({ variant = "body", weight, tone = "default", color, tabular, style, children, ...rest }: TextProps) {
  const p = usePalette();
  const { boldText } = useAccessibility();
  const nested = useContext(Nested);
  const voice = LANGUAGES[useLanguage()].tag;
  const t: { fontSize: number; lineHeight: number; weight: Weight | "mono" | "chrome"; tracking: number; upper?: boolean } = type[variant];
  const base = weight ?? t.weight;
  const family = typeof base === "number" ? fonts[boldText ? BOLDER[base] : base] : fonts[base];
  const tint = color ?? (tone === "muted" ? p.muted : tone === "faint" ? p.faint : tone === "inverse" ? p.onInk : p.text);
  const fade = LARGE.has(variant) && !nested && !color && tone === "default" && !p.high;

  const render = (hidden: boolean) => (
    <RNText
      maxFontSizeMultiplier={LARGE.has(variant) ? 1.6 : 2.4}
      accessibilityRole={HEADERS.has(variant) && !nested ? "header" : undefined}
      accessibilityLanguage={voice}
      {...rest}
      {...(hidden && { accessible: false, importantForAccessibility: "no-hide-descendants" as const })}
      style={[
        { fontFamily: family, fontSize: t.fontSize, lineHeight: t.lineHeight, letterSpacing: t.tracking, color: tint, fontVariant: tabular ? ["tabular-nums"] : undefined },
        t.upper && styles.upper,
        style,
      ]}>
      <Nested.Provider value>{children}</Nested.Provider>
    </RNText>
  );

  if (!fade) return render(false);

  return (
    <MaskedView maskElement={render(true)}>
      {render(false)}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="title-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.text} />
            <Stop offset="0.44" stopColor={p.text} />
            <Stop offset="1" stopColor={p.fadeTo} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#title-fade)" />
      </Svg>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: "uppercase" },
});
