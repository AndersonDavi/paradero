import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

/** Calm, ease-out motion. Nothing springs or bounces; everything settles. */
const settle = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * On the web, Reanimated keeps an arriving element out of the layout (position: absolute) and can leave it there,
 * so rows pile on top of the buttons below them. The web shows content without the arrival instead.
 */
const web = process.env.EXPO_OS === "web";

export const motion = {
  /** Content arriving: a short rise and a fade. */
  enter: (delay = 0) => (web ? undefined : FadeInDown.delay(delay).duration(420).easing(settle).withInitialValues({ transform: [{ translateY: 8 }] })),
  /** A whole surface appearing, like a photo. */
  appear: (delay = 0) => (web ? undefined : FadeIn.delay(delay).duration(500).easing(settle)),
  leave: FadeOut.duration(200),
  /** Rows changing place in a list. */
  layout: LinearTransition.duration(240).easing(settle),
};
