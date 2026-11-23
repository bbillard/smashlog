import { StyleSheet, Text, View } from "react-native";

import { PlayerBadge } from "@/src/components/exercise/PlayerBadge";
import { ShotNumberBadge } from "@/src/components/exercise/ShotNumberBadge";
import { SectionCard } from "@/src/components/SectionCard";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";
import { FixedPostSequence } from "@/src/types/index";
import { distributionLabel, endingLabel } from "@/src/utils/exerciseSequence";
import {
  continuousWorkers,
  feedersSentence,
  isMultishuttleOrdered,
  sendNumber,
  shuttlesLabel,
  spotKey,
  spotLabel,
  spotLocative,
  strikeFromText,
  strikeShotText,
  workersHint,
} from "@/src/utils/fixedPost";

interface FixedPostDetailsProps {
  sequence: FixedPostSequence;
  playersCount: number;
}

/**
 * Section de la fiche exercice qui remplace la frise de séquence en mode
 * « Poste fixe » :
 * - volant continu : « Poste fixe », chaque relanceur avec sa position et
 *   ses zones d'envoi (numérotées en « Dans l'ordre »), le ou les joueurs
 *   qui travaillent ; badges distribution et fin ;
 * - multivolant : « Frappes de A », une ligne par frappe, distributeurs ;
 *   badges distribution et volants par passage.
 * Purement présentationnel.
 */
export function FixedPostDetails({ sequence, playersCount }: FixedPostDetailsProps) {
  const { theme } = useAppTheme();
  const multishuttle = sequence.distribution === "multivolant";
  const title = multishuttle ? `Frappes de ${sequence.worker}` : "Poste fixe";
  const secondBadge = multishuttle
    ? `${shuttlesLabel(sequence.shuttlesPerRound)}${isMultishuttleOrdered(sequence) ? "" : " · aléatoire"}`
    : endingLabel(sequence);

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>{title}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.07)" }]}>
            <Text style={[styles.badgeText, { color: theme.tertiaryText }]}>{distributionLabel(sequence)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "rgba(206,255,0,0.1)" }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>{secondBadge}</Text>
          </View>
        </View>
      </View>

      {multishuttle ? (
        <View style={styles.list}>
          {sequence.strikes.map((strike, i) => (
            <View key={strike.id} style={styles.row}>
              {isMultishuttleOrdered(sequence) ? (
                <ShotNumberBadge kind="shot" number={i + 1} player={sequence.worker} size={26} />
              ) : (
                <ShotNumberBadge kind="send" player={sequence.worker} size={26} />
              )}
              <Text style={[styles.rowText, { color: theme.text }]}>
                {strikeShotText(strike)}
                <Text style={[styles.rowMeta, { color: theme.secondaryText }]}> {strikeFromText(strike)}</Text>
              </Text>
            </View>
          ))}
          <Text style={[styles.hint, { color: theme.secondaryText }]}>{feedersSentence(sequence.feeders)}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sequence.fixedPosts.map((post) => (
            <View key={post.player} style={styles.post}>
              <View style={styles.row}>
                <PlayerBadge player={post.player} size={26} weight="bold" />
                <Text style={[styles.rowText, { color: theme.text }]}>
                  {post.player} {spotLocative(post.zone)}
                </Text>
              </View>
              <View style={styles.targets}>
                {post.targets.map((target) => {
                  const number = sendNumber(sequence, post.player, target);
                  return (
                    <View key={spotKey(target)} style={styles.target}>
                      {number !== undefined ? (
                        <ShotNumberBadge kind="shot" number={number} player={post.player} size={20} />
                      ) : (
                        <ShotNumberBadge kind="send" player={post.player} size={20} />
                      )}
                      <Text style={[styles.targetText, { color: theme.text }]}>{spotLabel(target)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          <Text style={[styles.hint, { color: theme.secondaryText }]}>
            {workersHint(continuousWorkers(sequence.fixedPosts, playersCount))}
          </Text>
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  list: {
    gap: 10,
  },
  post: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
  },
  rowMeta: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
  targets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 38,
  },
  target: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
  hint: {
    fontSize: 13,
    fontFamily: fonts.bodyRegular,
  },
});
