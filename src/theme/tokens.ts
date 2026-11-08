export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pill: 999 } as const;

export const fonts = {
  400: "InterTight_400Regular",
  500: "InterTight_500Medium",
  600: "InterTight_600SemiBold",
  700: "InterTight_700Bold",
  serif: "InstrumentSerif_400Regular",
} as const;

export type Weight = 400 | 500 | 600 | 700;

interface Style {
  fontSize: number;
  lineHeight: number;
  weight: Weight | "serif";
  tracking: number;
}

export const type = {
  hero: { fontSize: 56, lineHeight: 56, weight: 500, tracking: -2.4 },
  serif: { fontSize: 38, lineHeight: 40, weight: "serif", tracking: -0.6 },
  display: { fontSize: 30, lineHeight: 34, weight: 600, tracking: -1 },
  title: { fontSize: 21, lineHeight: 26, weight: 600, tracking: -0.6 },
  headline: { fontSize: 16, lineHeight: 21, weight: 600, tracking: -0.3 },
  body: { fontSize: 16, lineHeight: 23, weight: 400, tracking: -0.2 },
  callout: { fontSize: 15, lineHeight: 21, weight: 400, tracking: -0.15 },
  caption: { fontSize: 13, lineHeight: 17, weight: 500, tracking: -0.05 },
  eyebrow: { fontSize: 12, lineHeight: 15, weight: 500, tracking: 0 },
} as const satisfies Record<string, Style>;

export type TypeVariant = keyof typeof type;
