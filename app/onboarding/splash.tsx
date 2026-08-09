import { useRouter } from "expo-router";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { Svg, Circle } from "react-native-svg";

import { fonts } from "@/src/theme/typography";

const logoSource: ImageSourcePropType = require("../../img/smashlog-logo.png");

export default function OnboardingSplashScreen() {
  const router = useRouter();

  return (
    <Pressable style={styles.container} onPress={() => router.replace("/onboarding/concept")}>
      <View style={styles.background} pointerEvents="none">
        <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
          <Circle cx="42" cy="120" r="130" stroke="rgba(206,255,0,0.07)" strokeWidth="1" fill="none" />
          <Circle cx="280" cy="620" r="90" stroke="rgba(206,255,0,0.04)" strokeWidth="1" fill="none" />
        </Svg>
      </View>

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <View style={styles.logoSquare}>
            <Image resizeMode="cover" source={logoSource} style={styles.logoImage} />
          </View>
          <View style={styles.glow} />
        </View>

        <Text style={styles.name}>
          Smash<Text style={styles.nameAccent}>log</Text>
        </Text>
        <Text style={styles.tagline}>Le journal de bord du joueur qui progresse.</Text>
      </View>

      <Text style={styles.tap}>Appuie pour commencer</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    marginBottom: 28,
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
  glow: {
    width: 60,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(206,255,0,0.25)",
    alignSelf: "center",
    marginTop: 10,
  },
  name: {
    fontSize: 28,
    color: "#f0f0f2",
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  nameAccent: {
    color: "#CEFF00",
  },
  tagline: {
    maxWidth: 220,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: "#9999aa",
    fontFamily: fonts.bodyRegular,
  },
  tap: {
    fontSize: 12,
    color: "#6b6b7a",
    letterSpacing: 0.6,
    fontFamily: fonts.bodyRegular,
  },
});
