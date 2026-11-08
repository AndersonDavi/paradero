import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { usePalette } from "@/theme/colors";
import { fonts, type, type TypeVariant, type Weight } from "@/theme/tokens";

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  weight?: Weight;
  tone?: "default" | "muted" | "faint" | "inverse";
  color?: string;
  tabular?: boolean;
}

/** One type scale for the whole app, so every screen reads like the same product. */
export function Text({ variant = "body", weight, tone = "default", color, tabular, style, ...rest }: TextProps) {
  const p = usePalette();
  const t = type[variant];
  const family = weight ? fonts[weight] : fonts[t.weight];
  const tint = color ?? (tone === "muted" ? p.muted : tone === "faint" ? p.faint : tone === "inverse" ? p.onInk : p.text);

  return (
    <RNText
      maxFontSizeMultiplier={variant === "hero" || variant === "serif" || variant === "display" ? 1.3 : 2}
      {...rest}
      style={[
        { fontFamily: family, fontSize: t.fontSize, lineHeight: t.lineHeight, letterSpacing: t.tracking, color: tint, fontVariant: tabular ? ["tabular-nums"] : undefined },
        style,
      ]}
    />
  );
}
