import { useEffect } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const logoSource: ImageSourcePropType = require("../../img/smashlog-logo.png");

export const SPLASH_ENTER_DURATION = 300;
export const SPLASH_PAUSE_DURATION = 400;
export const SPLASH_EXIT_DURATION = 300;
/** Durée totale de la séquence visuelle (fade in + pause + fade out), hors marge. */
export const SPLASH_ANIMATION_DURATION = SPLASH_ENTER_DURATION + SPLASH_PAUSE_DURATION + SPLASH_EXIT_DURATION;

interface SplashLogoAnimationProps {
  /** Appelé une fois l'animation terminée (+ une petite marge). Optionnel : sans callback, l'animation se joue simplement en boucle unique sans effet de bord. */
  onFinished?: () => void;
  /** Marge (ms) ajoutée après la fin visuelle de l'animation avant d'appeler onFinished. */
  finishDelay?: number;
}

/**
 * Logo Smashlog animé (fade in → pause → fade out + scale) utilisé à deux
 * endroits :
 * - app/splash-animation.tsx : transition en sortie d'onboarding (cf.
 *   app/onboarding/account.tsx), qui navigue vers sa cible une fois
 *   l'animation terminée.
 * - app/_layout.tsx : recouvre l'app à chaque démarrage à froid, le temps
 *   que l'animation se joue, avant de révéler l'écran réel (onboarding ou
 *   onglets selon l'état de l'utilisateur).
 */
export function SplashLogoAnimation({ onFinished, finishDelay = 60 }: SplashLogoAnimationProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, {
        duration: SPLASH_ENTER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      withTiming(1, {
        duration: SPLASH_PAUSE_DURATION,
      }),
      withTiming(0, {
        duration: SPLASH_EXIT_DURATION,
        easing: Easing.in(Easing.ease),
      }),
    );
    scale.value = withSequence(
      withTiming(1, {
        duration: SPLASH_ENTER_DURATION + SPLASH_PAUSE_DURATION,
      }),
      withTiming(1.15, {
        duration: SPLASH_EXIT_DURATION,
        easing: Easing.in(Easing.ease),
      }),
    );

    if (!onFinished) {
      return;
    }

    const timeout = setTimeout(onFinished, SPLASH_ANIMATION_DURATION + finishDelay);
    return () => clearTimeout(timeout);
  }, [finishDelay, onFinished, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.logoSquare, animatedStyle]}>
        <Image resizeMode="cover" source={logoSource} style={styles.logoImage} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d0d0f",
    alignItems: "center",
    justifyContent: "center",
  },
  logoSquare: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: "#16161a",
    borderWidth: 1.5,
    borderColor: "rgba(206,255,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
});
