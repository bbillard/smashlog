import { StyleSheet, Text, View } from "react-native";
import { Svg, Path, Circle } from "react-native-svg";

import { SpecialCard } from "@/src/services/sharingOrchestrator";
import { Session } from "@/src/types/session";
import { fonts } from "@/src/theme/typography";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
type CardTheme = {
  backgroundColor: string;
  accentColor: string;
  brightAccentColor: string;
  dimAccentColor: string;
  borderColor: string;
  borderWidth: number;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  badgeLabel: string;
  logoColor: string;
  logoDimColor: string;
  topLineMode: "none" | "soft" | "epic";
  topLineColor: string;
  isEpic: boolean;
  showCrown: boolean;
  allDaysLit: boolean;
  milestoneNumberColor: string;
  milestoneSupColor: string;
  messageColor: string;
};

function formatUsername(username: string) {
  return username.trim().startsWith("@") ? username.trim() : `@${username.trim()}`;
}

function getStartOfCurrentWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return start;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCurrentWeekSessions(sessions: Session[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = getStartOfCurrentWeek(today);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    const count = sessions.filter((session) => isSameCalendarDay(new Date(session.createdAt), date)).length;

    return {
      key: date.toISOString(),
      label: DAY_LABELS[index],
      count,
      isToday: isSameCalendarDay(date, today),
      isFuture: date.getTime() > today.getTime(),
    };
  });
}

function getRecentMonthsActivity(sessions: Session[], monthsCount = 8) {
  const today = new Date();

  return Array.from({ length: monthsCount }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (monthsCount - 1 - index), 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const count = sessions.filter((session) => {
      const sessionDate = new Date(session.createdAt);
      return sessionDate.getFullYear() === year && sessionDate.getMonth() === month;
    }).length;

    return {
      key: `${year}-${month}`,
      label: MONTH_LABELS[month],
      count,
      isCurrent: year === today.getFullYear() && month === today.getMonth(),
    };
  });
}

function getWeeksStreakDisplay(weeks: number) {
  if (weeks >= 52 && weeks % 52 === 0) {
    const years = weeks / 52;
    return {
      value: years,
      shortUnit: years > 1 ? "ans" : "an",
      sublabel: "de streak consécutif",
      label: years > 1 ? "années\nd'affilée" : "année\nd'affilée",
    };
  }

  if (weeks === 78) {
    return {
      value: 18,
      shortUnit: "mois",
      sublabel: "de streak consécutif",
      label: "mois\nd'affilée",
    };
  }

  if (weeks >= 4 && weeks % 4 === 0) {
    const months = weeks / 4;
    return {
      value: months,
      shortUnit: "mois",
      sublabel: "de streak consécutif",
      label: "mois\nd'affilée",
    };
  }

  return {
    value: weeks,
    shortUnit: weeks > 1 ? "sem." : "sem.",
    sublabel: "de streak consécutif",
    label: weeks > 1 ? "semaines\nd'affilée" : "semaine\nd'affilée",
  };
}

function getCardTheme(cardType: SpecialCard["cardType"], level: SpecialCard["level"]): CardTheme {
  if (cardType === "weeksStreak") {
    if (level === 5) {
      return {
        backgroundColor: "#110d00",
        accentColor: "#FFD166",
        brightAccentColor: "#FFE08A",
        dimAccentColor: "rgba(255,209,102,0.35)",
        borderColor: "rgba(255,209,102,0.2)",
        borderWidth: 1,
        badgeBackgroundColor: "#FFD166",
        badgeTextColor: "#000000",
        badgeLabel: "Légende",
        logoColor: "#FFD166",
        logoDimColor: "rgba(255,209,102,0.4)",
        topLineMode: "epic",
        topLineColor: "#FFD166",
        isEpic: true,
        showCrown: true,
        allDaysLit: false,
        milestoneNumberColor: "#FFFFFF",
        milestoneSupColor: "#FF4D6D",
        messageColor: "#FFE08A",
      };
    }

    if (level === 4) {
      return {
        backgroundColor: "#0d0a00",
        accentColor: "#FFD166",
        brightAccentColor: "#FFD166",
        dimAccentColor: "rgba(255,209,102,0.45)",
        borderColor: "rgba(255,209,102,0.3)",
        borderWidth: 1,
        badgeBackgroundColor: "#FFD166",
        badgeTextColor: "#000000",
        badgeLabel: "Streak",
        logoColor: "#CEFF00",
        logoDimColor: "rgba(255,255,255,0.35)",
        topLineMode: "soft",
        topLineColor: "rgba(255,209,102,0.4)",
        isEpic: false,
        showCrown: false,
        allDaysLit: false,
        milestoneNumberColor: "#FFFFFF",
        milestoneSupColor: "#FF4D6D",
        messageColor: "#F0F0F2",
      };
    }

    return {
      backgroundColor: "#0A1628",
      accentColor: "#CEFF00",
      brightAccentColor: "#CEFF00",
      dimAccentColor: "rgba(206,255,0,0.45)",
      borderColor: level === 3 ? "rgba(206,255,0,0.18)" : "transparent",
      borderWidth: level === 3 ? 1 : 0,
      badgeBackgroundColor: "#CEFF00",
      badgeTextColor: "#000000",
      badgeLabel: "Streak",
      logoColor: "#CEFF00",
      logoDimColor: "rgba(255,255,255,0.35)",
      topLineMode: "none",
      topLineColor: "transparent",
      isEpic: false,
      showCrown: false,
      allDaysLit: false,
      milestoneNumberColor: "#FFFFFF",
      milestoneSupColor: "#FF4D6D",
      messageColor: "#F0F0F2",
    };
  }

  if (cardType === "sessionsPerWeek") {
    if (level === 5) {
      return {
        backgroundColor: "#140500",
        accentColor: "#FF5722",
        brightAccentColor: "#FF8A50",
        dimAccentColor: "rgba(255,87,34,0.35)",
        borderColor: "rgba(255,87,34,0.2)",
        borderWidth: 1,
        badgeBackgroundColor: "#FF5722",
        badgeTextColor: "#FFFFFF",
        badgeLabel: "Légende",
        logoColor: "#FF8A50",
        logoDimColor: "rgba(255,87,34,0.4)",
        topLineMode: "epic",
        topLineColor: "#FF5722",
        isEpic: true,
        showCrown: true,
        allDaysLit: true,
        milestoneNumberColor: "#FFFFFF",
        milestoneSupColor: "#FF4D6D",
        messageColor: "#FF8A50",
      };
    }

    if (level === 4) {
      return {
        backgroundColor: "#00100f",
        accentColor: "#00E5C8",
        brightAccentColor: "#1EF2D8",
        dimAccentColor: "rgba(0,229,200,0.45)",
        borderColor: "rgba(0,229,200,0.25)",
        borderWidth: 1,
        badgeBackgroundColor: "#00E5C8",
        badgeTextColor: "#000000",
        badgeLabel: "Streak",
        logoColor: "#CEFF00",
        logoDimColor: "rgba(255,255,255,0.35)",
        topLineMode: "soft",
        topLineColor: "rgba(0,229,200,0.4)",
        isEpic: false,
        showCrown: false,
        allDaysLit: false,
        milestoneNumberColor: "#FFFFFF",
        milestoneSupColor: "#FF4D6D",
        messageColor: "#F0F0F2",
      };
    }

    return {
      backgroundColor: "#00191A",
      accentColor: "#00E5C8",
      brightAccentColor: "#00E5C8",
      dimAccentColor: "rgba(0,229,200,0.4)",
      borderColor: level === 3 ? "rgba(0,229,200,0.16)" : "transparent",
      borderWidth: level === 3 ? 1 : 0,
      badgeBackgroundColor: "#00E5C8",
      badgeTextColor: "#000000",
      badgeLabel: "Streak",
      logoColor: "#CEFF00",
      logoDimColor: "rgba(255,255,255,0.35)",
      topLineMode: "none",
      topLineColor: "transparent",
      isEpic: false,
      showCrown: false,
      allDaysLit: false,
      milestoneNumberColor: "#FFFFFF",
      milestoneSupColor: "#FF4D6D",
      messageColor: "#F0F0F2",
    };
  }

  if (level === 5) {
    return {
      backgroundColor: "#0c0014",
      accentColor: "#C084FC",
      brightAccentColor: "#E8D5FF",
      dimAccentColor: "rgba(192,132,252,0.35)",
      borderColor: "rgba(192,132,252,0.25)",
      borderWidth: 1,
      badgeBackgroundColor: "#C084FC",
      badgeTextColor: "#FFFFFF",
      badgeLabel: "Légende",
      logoColor: "#C084FC",
      logoDimColor: "rgba(192,132,252,0.35)",
      topLineMode: "epic",
      topLineColor: "#C084FC",
      isEpic: true,
      showCrown: true,
      allDaysLit: false,
      milestoneNumberColor: "#E8D5FF",
      milestoneSupColor: "#C084FC",
      messageColor: "#E8D5FF",
    };
  }

  if (level === 4) {
    return {
      backgroundColor: "#180A22",
      accentColor: "#FF6C88",
      brightAccentColor: "#FF8FA3",
      dimAccentColor: "rgba(255,108,136,0.4)",
      borderColor: "rgba(255,108,136,0.22)",
      borderWidth: 1,
      badgeBackgroundColor: "#FF6C88",
      badgeTextColor: "#FFFFFF",
      badgeLabel: "Milestone",
      logoColor: "#CEFF00",
      logoDimColor: "rgba(255,255,255,0.35)",
      topLineMode: "soft",
      topLineColor: "rgba(255,108,136,0.4)",
      isEpic: false,
      showCrown: false,
      allDaysLit: false,
      milestoneNumberColor: "#FFFFFF",
      milestoneSupColor: "#FF6C88",
      messageColor: "#F0F0F2",
    };
  }

  return {
    backgroundColor: "#110820",
    accentColor: "#FF4D6D",
    brightAccentColor: "#FF4D6D",
    dimAccentColor: "rgba(255,77,109,0.4)",
    borderColor: level === 3 ? "rgba(255,77,109,0.16)" : "transparent",
    borderWidth: level === 3 ? 1 : 0,
    badgeBackgroundColor: "#FF4D6D",
    badgeTextColor: "#FFFFFF",
    badgeLabel: "Milestone",
    logoColor: "#CEFF00",
    logoDimColor: "rgba(255,255,255,0.35)",
    topLineMode: "none",
    topLineColor: "transparent",
    isEpic: false,
    showCrown: false,
    allDaysLit: false,
    milestoneNumberColor: "#FFFFFF",
    milestoneSupColor: "#FF4D6D",
    messageColor: "#F0F0F2",
  };
}

function TopTrim({ theme }: { theme: CardTheme }) {
  if (theme.topLineMode === "none") {
    return null;
  }

  if (theme.topLineMode === "soft") {
    return <View style={[styles.topTrimSoft, { backgroundColor: theme.topLineColor }]} />;
  }

  return (
    <View style={styles.topTrimEpic}>
      <View style={styles.trimOuterEdge} />
      <View style={[styles.trimFarGlow, { backgroundColor: theme.accentColor, opacity: 0.08 }]} />
      <View style={[styles.trimMist, { backgroundColor: theme.accentColor, opacity: 0.14 }]} />
      <View style={[styles.trimGlow, { backgroundColor: theme.accentColor, opacity: 0.26 }]} />
      <View style={[styles.trimCore, { backgroundColor: theme.accentColor, opacity: 0.52 }]} />
      <View style={[styles.trimCenter, { backgroundColor: theme.brightAccentColor, opacity: 0.98 }]} />
      <View style={[styles.trimCore, { backgroundColor: theme.accentColor, opacity: 0.52 }]} />
      <View style={[styles.trimGlow, { backgroundColor: theme.accentColor, opacity: 0.26 }]} />
      <View style={[styles.trimMist, { backgroundColor: theme.accentColor, opacity: 0.14 }]} />
      <View style={[styles.trimFarGlow, { backgroundColor: theme.accentColor, opacity: 0.08 }]} />
      <View style={styles.trimOuterEdge} />
    </View>
  );
}

function CrownIcon({ accentColor, brightColor }: { accentColor: string; brightColor: string }) {
  return (
    <Svg height={20} viewBox="0 0 32 20" width={32}>
      <Path
        d="M2 18L6 6L12 12L16 2L20 12L26 6L30 18H2Z"
        fill="none"
        stroke={accentColor}
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <Circle cx={2} cy={18} fill={accentColor} r={2} />
      <Circle cx={16} cy={2} fill={brightColor} r={2} />
      <Circle cx={30} cy={18} fill={accentColor} r={2} />
    </Svg>
  );
}

function Footer({
  logoColor,
  logoDimColor,
  username,
}: {
  logoColor: string;
  logoDimColor: string;
  username: string;
}) {
  return (
    <View style={styles.footer}>
      <Text style={[styles.logo, { color: logoColor }]}>
        Smash<Text style={{ color: logoDimColor }}>log</Text>
      </Text>
      <Text style={styles.username}>{username}</Text>
    </View>
  );
}

function SessionsPerWeekShareCard({
  card,
  username,
  sessions,
}: {
  card: SpecialCard;
  username: string;
  sessions: Session[];
}) {
  const theme = getCardTheme("sessionsPerWeek", card.level);
  const shareUsername = formatUsername(username);
  const days = getCurrentWeekSessions(sessions);

  return (
    <View style={[styles.cardBase, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor, borderWidth: theme.borderWidth }]}>
      <TopTrim theme={theme} />

      <View>
        <View style={styles.spwTop}>
          <View>
            {theme.showCrown ? (
              <View style={styles.crownWrap}>
                <CrownIcon accentColor={theme.accentColor} brightColor={theme.brightAccentColor} />
              </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: theme.badgeBackgroundColor }]}>
              <Text style={[styles.badgeText, { color: theme.badgeTextColor }]}>{theme.badgeLabel}</Text>
            </View>
          </View>
          <View style={styles.spwCount}>
            <Text style={[styles.spwCountNum, { color: theme.brightAccentColor }]}>{card.value}</Text>
            <Text style={[styles.spwCountLabel, { color: theme.dimAccentColor }]}>séances cette semaine</Text>
          </View>
        </View>

        <View style={styles.spwWeek}>
          {days.map((day) => {
            const displayedCount = day.count;
            const height = displayedCount >= 3 ? 44 : displayedCount === 2 ? 36 : 28;
            const isDone = displayedCount > 0;
            const dayBackgroundColor = isDone ? theme.accentColor : `${theme.accentColor}12`;

            return (
              <View key={day.key} style={styles.spwDay}>
                <View
                  style={[
                    styles.spwDayDot,
                    { height, backgroundColor: day.isFuture ? `${theme.accentColor}12` : dayBackgroundColor },
                    day.isToday ? [styles.spwDayDotToday, { borderColor: theme.dimAccentColor }] : null,
                  ]}
                >
                  {displayedCount > 0 ? (
                    <Text style={[styles.spwDayCount, { color: theme.badgeTextColor }]}>x{displayedCount}</Text>
                  ) : null}
                </View>
                <Text style={[styles.spwDayLabel, { color: theme.dimAccentColor }, day.isToday ? { color: theme.brightAccentColor, fontFamily: fonts.bodySemiBold } : null]}>
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text
          adjustsFontSizeToFit
          ellipsizeMode="tail"
          minimumFontScale={0.76}
          numberOfLines={4}
          style={[styles.spwMessage, { color: theme.messageColor, borderLeftColor: theme.accentColor }]}
        >
          {card.message.text}
        </Text>
      </View>

      <Footer logoColor={theme.logoColor} logoDimColor={theme.logoDimColor} username={shareUsername} />
    </View>
  );
}

function WeeksStreakShareCard({
  card,
  username,
  sessions,
}: {
  card: SpecialCard;
  username: string;
  sessions: Session[];
}) {
  const theme = getCardTheme("weeksStreak", card.level);
  const shareUsername = formatUsername(username);
  const months = getRecentMonthsActivity(sessions, 8);
  const maxCount = Math.max(...months.map((month) => month.count), 1);
  const streakDisplay = getWeeksStreakDisplay(card.value);

  return (
    <View style={[styles.cardBase, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor, borderWidth: theme.borderWidth }]}>
      <TopTrim theme={theme} />

      <View style={styles.weeksContent}>
        <View style={styles.ewTop}>
          <View>
            {theme.showCrown ? (
              <View style={styles.crownWrap}>
                <CrownIcon accentColor={theme.accentColor} brightColor={theme.brightAccentColor} />
              </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: theme.badgeBackgroundColor }]}>
              <Text style={[styles.badgeText, { color: theme.badgeTextColor }]}>{theme.badgeLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.ewNumberWrap}>
          <Text style={[styles.ewNumber, { color: theme.brightAccentColor }]}>{streakDisplay.value}</Text>
          <Text style={[styles.ewUnit, { color: theme.dimAccentColor }]}>{streakDisplay.shortUnit}</Text>
        </View>
        <Text style={[styles.ewSublabel, { color: theme.dimAccentColor }]}>{streakDisplay.sublabel}</Text>

        <View style={styles.streakChart}>
          {months.map((month) => {
            const height = month.count === 0 ? 22 : Math.max(26, 22 + (month.count / maxCount) * 48);

            return (
              <View key={month.key} style={styles.streakMonth}>
                <View
                  style={[
                    styles.streakDot,
                    { height, backgroundColor: month.count > 0 ? theme.accentColor : `${theme.accentColor}18` },
                    month.isCurrent ? [styles.streakDotToday, { borderColor: theme.dimAccentColor }] : null,
                  ]}
                />
                <Text style={[styles.streakMonthLabel, { color: theme.dimAccentColor }, month.isCurrent ? { color: theme.brightAccentColor, fontFamily: fonts.bodySemiBold } : null]}>
                  {month.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text
          adjustsFontSizeToFit
          ellipsizeMode="tail"
          minimumFontScale={0.74}
          numberOfLines={4}
          style={[styles.ewMessage, { color: theme.messageColor, borderLeftColor: theme.accentColor }]}
        >
          {card.message.text}
        </Text>
      </View>

      <Footer logoColor={theme.logoColor} logoDimColor={theme.logoDimColor} username={shareUsername} />
    </View>
  );
}

function MilestoneShareCard({
  card,
  username,
}: {
  card: SpecialCard;
  username: string;
}) {
  const theme = getCardTheme("milestone", card.level);
  const shareUsername = formatUsername(username);

  return (
    <View style={[styles.cardBase, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor, borderWidth: theme.borderWidth }]}>
      <TopTrim theme={theme} />

      <View>
        {theme.showCrown ? (
          <View style={styles.crownWrap}>
            <CrownIcon accentColor={theme.accentColor} brightColor={theme.brightAccentColor} />
          </View>
        ) : null}

        <View style={styles.milestoneTop}>
          <View style={[styles.badge, { backgroundColor: theme.badgeBackgroundColor }]}>
            <Text style={[styles.badgeText, { color: theme.badgeTextColor }]}>{theme.badgeLabel}</Text>
          </View>
        </View>

        <Text style={[styles.milestoneNumber, { color: theme.milestoneNumberColor }]}>
          {card.value}
          <Text style={[styles.milestoneSup, { color: theme.milestoneSupColor }]}>e</Text>
        </Text>
        <Text style={[styles.milestoneLabel, { color: theme.dimAccentColor }]}>séance enregistrée</Text>
        <Text
          adjustsFontSizeToFit
          ellipsizeMode="tail"
          minimumFontScale={0.76}
          numberOfLines={4}
          style={[styles.milestoneMessage, { color: theme.messageColor, borderLeftColor: theme.accentColor }]}
        >
          {card.message.text}
        </Text>
      </View>

      <Footer logoColor={theme.logoColor} logoDimColor={theme.logoDimColor} username={shareUsername} />
    </View>
  );
}

export function SpecialShareCard({
  card,
  username,
  sessions = [],
}: {
  card: SpecialCard;
  username: string;
  sessions?: Session[];
}) {
  if (card.cardType === "weeksStreak") {
    return <WeeksStreakShareCard card={card} sessions={sessions} username={username} />;
  }

  if (card.cardType === "milestone") {
    return <MilestoneShareCard card={card} username={username} />;
  }

  return <SessionsPerWeekShareCard card={card} sessions={sessions} username={username} />;
}

const styles = StyleSheet.create({
  cardBase: {
    aspectRatio: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  topTrimSoft: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  topTrimEpic: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    flexDirection: "row",
  },
  trimOuterEdge: {
    flex: 1.35,
    backgroundColor: "transparent",
  },
  trimFarGlow: {
    flex: 0.9,
    borderRadius: 2,
  },
  trimMist: {
    flex: 0.8,
    borderRadius: 2,
  },
  trimGlow: {
    flex: 1.1,
    borderRadius: 2,
  },
  trimCore: {
    flex: 0.95,
    borderRadius: 2,
  },
  trimCenter: {
    flex: 1.1,
    borderRadius: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 12,
  },
  username: {
    fontFamily: fonts.bodyRegular,
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
  },
  spwTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  spwCount: {
    alignItems: "flex-end",
  },
  spwCountNum: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 52,
    lineHeight: 52,
  },
  spwCountLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    marginTop: 2,
  },
  spwWeek: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 12,
  },
  spwDay: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  spwDayDot: {
    width: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 3,
  },
  spwDayDotToday: {
    borderWidth: 2,
  },
  spwDayCount: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 8,
    lineHeight: 8,
  },
  spwDayLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
  },
  spwMessage: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    lineHeight: 17,
    borderLeftWidth: 2,
    paddingLeft: 9,
    marginBottom: 12,
  },
  ewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  weeksContent: {
    flexShrink: 1,
  },
  ewNumberWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 2,
  },
  ewNumber: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -2,
  },
  ewUnit: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    lineHeight: 13,
    paddingBottom: 5,
  },
  ewSublabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 10,
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  streakChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 10,
  },
  streakMonth: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  streakDot: {
    width: "100%",
    minWidth: 16,
    borderRadius: 6,
  },
  streakDotToday: {
    borderWidth: 2,
  },
  streakMonthLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
  },
  ewMessage: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    lineHeight: 15,
    borderLeftWidth: 2,
    paddingLeft: 9,
    marginBottom: 8,
  },
  crownWrap: {
    marginBottom: 6,
  },
  milestoneTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  milestoneNumber: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2,
  },
  milestoneSup: {
    fontSize: 20,
    lineHeight: 20,
  },
  milestoneLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  milestoneMessage: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    lineHeight: 17,
    borderLeftWidth: 2,
    paddingLeft: 9,
    marginBottom: 12,
  },
});
