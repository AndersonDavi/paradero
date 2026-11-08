import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

/** Calm, ease-out motion. Nothing springs or bounces; everything settles. */
const settle = Easing.bezier(0.22, 1, 0.36, 1);

export const motion = {
  /** Content arriving: a short rise and a fade. */
  enter: (delay = 0) => FadeInDown.delay(delay).duration(420).easing(settle).withInitialValues({ transform: [{ translateY: 8 }] }),
  /** A whole surface appearing, like a photo. */
  appear: (delay = 0) => FadeIn.delay(delay).duration(500).easing(settle),
  leave: FadeOut.duration(200),
  /** Rows changing place in a list. */
  layout: LinearTransition.duration(240).easing(settle),
};
