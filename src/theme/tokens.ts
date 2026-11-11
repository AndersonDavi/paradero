/** The 4-point grid. Keys are steps, so space[4] is 16. Every gap, padding and margin comes from here. */
export const space = { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, sheet: 32, pill: 999 } as const;

/** Fixed dimensions, named by role so the same thing is the same size on every screen. */
export const size = {
  icon: { xs: 12, sm: 16, md: 20, lg: 24 },
  control: { sm: 36, md: 48, lg: 56 },
  tile: { sm: 36, md: 44, lg: 52, xl: 72 },
  glyph: { sm: 16, md: 20, lg: 24, xl: 32 },
  dot: { sm: 6, md: 8 },
  line: { hair: 1, rule: 2, bar: 3 },
} as const;

/** Screen-level measures shared by every layout. */
export const layout = {
  gutter: space[4],
  tabBarClearance: 120,
  sheetOverlap: 28,
  cardWidth: 228,
  readable: 320,
  shadowBleed: space[6],
  screenEnd: 80,
  badgeColumn: 116,
  mapInset: { top: 96, right: space[6], bottom: space[10], left: space[6] },
  sheetMap: 0.38,
  /** On a web window at least this wide, the sheet is a panel on the side of the map. */
  wideFrom: 900,
  panel: 420,
  /** The widest a column of text and buttons gets on a large screen. */
  column: 640,
} as const;

export const fonts = {
  400: "Geist_400Regular",
  500: "Geist_500Medium",
  600: "Geist_600SemiBold",
  700: "Geist_700Bold",
  mono: "GeistMono_500Medium",
  chrome: "VictorMono-Bold",
} as const;

export type Weight = 400 | 500 | 600 | 700;

interface Style {
  fontSize: number;
  lineHeight: number;
  weight: Weight | "mono" | "chrome";
  tracking: number;
  upper?: boolean;
}

/**
 * Croma's voice, as on usecroma.com: tight Geist titles that fade toward the bottom,
 * Geist Mono in wide capitals for labels, Victor Mono for the frame (corners, footers, the web address).
 */
export const type = {
  poster: { fontSize: 44, lineHeight: 46, weight: 600, tracking: -1.5 },
  hero: { fontSize: 56, lineHeight: 58, weight: 600, tracking: -2 },
  heading: { fontSize: 34, lineHeight: 36, weight: 600, tracking: -1.2 },
  display: { fontSize: 30, lineHeight: 32, weight: 600, tracking: -1.05 },
  title: { fontSize: 21, lineHeight: 26, weight: 600, tracking: -0.6 },
  headline: { fontSize: 16, lineHeight: 21, weight: 500, tracking: -0.3 },
  body: { fontSize: 16, lineHeight: 23, weight: 400, tracking: -0.2 },
  callout: { fontSize: 15, lineHeight: 21, weight: 400, tracking: -0.15 },
  caption: { fontSize: 13, lineHeight: 17, weight: 500, tracking: -0.05 },
  micro: { fontSize: 10, lineHeight: 13, weight: 500, tracking: 0 },
  eyebrow: { fontSize: 11, lineHeight: 15, weight: "mono", tracking: 1.8, upper: true },
  chrome: { fontSize: 11, lineHeight: 15, weight: "chrome", tracking: 2.6, upper: true },
} as const satisfies Record<string, Style>;

export type TypeVariant = keyof typeof type;
