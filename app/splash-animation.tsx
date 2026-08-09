import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const logoSource: ImageSourcePropType = require("../img/smashlog-logo.png");

const ENTER_DURATION = 300;
const PAUSE_DURATION = 400;
const EXIT_DURATION = 300;
const NAVIGATION_DELAY = ENTER_DURATION + PAUSE_DURATION + EXIT_DURATION + 60;

export default function SplashAnimationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ target?: string }>();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const target = typeof params.target === "string" ? params.target : "/(tabs)";

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, {
        duration: ENTER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      withTiming(1, {
        duration: PAUSE_DURATION,
      }),
      withTiming(0, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.ease),
      }),
    );
    scale.value = withSequence(
      withTiming(1, {
        duration: ENTER_DURATION + PAUSE_DURATION,
      }),
      withTiming(1.15, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.ease),
      }),
    );

    const timeout = setTimeout(() => {
      router.replace(target as Href);
    }, NAVIGATION_DELAY);

    return () => clearTimeout(timeout);
  }, [opacity, router, scale, target]);

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
