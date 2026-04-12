import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Svg, Circle, Path } from "react-native-svg";

import { OnboardingButton, OnboardingScaffold } from "@/src/components/onboarding/OnboardingScaffold";
import { fonts } from "@/src/theme/typography";

function StepIcon({ type }: { type: "journal" | "target" | "progress" }) {
  if (type === "journal") {
    return (
      <Svg height={18} viewBox="0 0 18 18" width={18}>
        <Path
          d="M5 2.9H13a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4.9a2 2 0 0 1 2-2Z"
          stroke="#CEFF00"
          strokeWidth={1.8}
          fill="none"
        />
        <Path d="M6 6h6M6 9h6M6 12h3" stroke="#CEFF00" strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === "target") {
    return (
      <Svg height={18} viewBox="0 0 18 18" width={18}>
        <Circle cx={9} cy={9} r={6} stroke="#00E5FF" strokeWidth={1.8} fill="none" />
        <Path d="M9 6v3M9 12v.5" stroke="#00E5FF" strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg height={18} viewBox="0 0 18 18" width={18}>
      <Path d="M3 12L6 8L9 10L12 5L15 7" stroke="#FF4D6D" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Circle cx={15} cy={7} r={0.9} fill="#FF4D6D" />
    </Svg>
  );
}

function StepCard({
  title,
  description,
  type,
  backgroundColor,
}: {
  title: string;
  description: string;
  type: "journal" | "target" | "progress";
  backgroundColor: string;
}) {
  return (
    <View style={styles.stepCard}>
      <View style={[styles.iconWrap, { backgroundColor }]}>
        <StepIcon type={type} />
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </View>
  );
}

export default function OnboardingConceptScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      progress={1}
      title={
        <Text style={styles.title}>
          Joue.{"\n"}Note.{"\n"}
          <Text style={styles.titleAccent}>Progresse.</Text>
        </Text>
      }
      body="Smashlog transforme chaque séance en leçon. En 30 secondes, tu analyses ce qui s'est passé et tu prépares la suivante."
      footer={<OnboardingButton label="C'est parti →" onPress={() => router.push("/onboarding/planning")} />}
    >
      <View style={styles.steps}>
        <StepCard
          backgroundColor="rgba(206,255,0,0.1)"
          description="Ce qui a bien marché, ce qui a moins bien marché."
          title="Journalise ta séance"
          type="journal"
        />
        <View style={styles.connector} />
        <StepCard
          backgroundColor="rgba(0,229,255,0.1)"
          description="Un objectif concret pour ta prochaine séance."
          title="Fixe ton intention"
          type="target"
        />
        <View style={styles.connector} />
        <StepCard
          backgroundColor="rgba(255,77,109,0.1)"
          description="Tes stats et insights au fil du temps."
          title="Suis ton activité"
          type="progress"
        />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    lineHeight: 29,
    color: "#f0f0f2",
    fontFamily: fonts.displayExtraBold,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#CEFF00",
  },
  steps: {
    flex: 1,
    gap: 10,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#16161a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    color: "#f0f0f2",
    fontFamily: fonts.displayBold,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: "#6b6b7a",
    fontFamily: fonts.bodyRegular,
  },
  connector: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginLeft: 31,
  },
});
