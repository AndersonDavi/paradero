import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform, useWindowDimensions } from "react-native";

/** The phone's accessibility settings, kept current while the app runs. */
export interface Accessibility {
  /** iOS "Increase Contrast" or Android "High contrast text". */
  moreContrast: boolean;
  boldText: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  screenReader: boolean;
}

let state: Accessibility = { moreContrast: false, boldText: false, reduceMotion: false, reduceTransparency: false, screenReader: false };
const listeners = new Set<() => void>();

function set(patch: Partial<Accessibility>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const contrastEvent = Platform.OS === "android" ? "highTextContrastChanged" : "darkerSystemColorsChanged";
const contrastNow = Platform.OS === "android" ? AccessibilityInfo.isHighTextContrastEnabled : AccessibilityInfo.isDarkerSystemColorsEnabled;

if (Platform.OS !== "web") {
  void Promise.all([
    contrastNow(),
    AccessibilityInfo.isBoldTextEnabled(),
    AccessibilityInfo.isReduceMotionEnabled(),
    AccessibilityInfo.isReduceTransparencyEnabled(),
    AccessibilityInfo.isScreenReaderEnabled(),
  ])
    .then(([moreContrast, boldText, reduceMotion, reduceTransparency, screenReader]) => set({ moreContrast, boldText, reduceMotion, reduceTransparency, screenReader }))
    .catch(() => undefined);

  AccessibilityInfo.addEventListener(contrastEvent, (moreContrast: boolean) => set({ moreContrast }));
  AccessibilityInfo.addEventListener("boldTextChanged", (boldText: boolean) => set({ boldText }));
  AccessibilityInfo.addEventListener("reduceMotionChanged", (reduceMotion: boolean) => set({ reduceMotion }));
  AccessibilityInfo.addEventListener("reduceTransparencyChanged", (reduceTransparency: boolean) => set({ reduceTransparency }));
  AccessibilityInfo.addEventListener("screenReaderChanged", (screenReader: boolean) => set({ screenReader }));
}

export function useAccessibility(): Accessibility {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** iOS accessibility text sizes start around 1.35x. From there, rows stack instead of squeezing side by side. */
export function useLargeText(): boolean {
  return useWindowDimensions().fontScale >= 1.35;
}

/** Says something out loud to VoiceOver or TalkBack, for changes that happen off focus. */
export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}
