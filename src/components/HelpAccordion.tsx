import { Ionicons } from "@expo/vector-icons";
import { ComponentProps, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/hooks/useAppTheme";
import { fonts } from "@/src/theme/typography";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface HelpQA {
  question: string;
  answer: string;
}

export interface HelpSection {
  icon: IoniconName;
  title: string;
  items: HelpQA[];
}

interface HelpAccordionItemProps {
  item: HelpQA;
  isLast: boolean;
}

function HelpAccordionItem({ item, isLast }: HelpAccordionItemProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={!isLast ? [styles.itemBorder, { borderColor: theme.surfaceAlt }] : null}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.questionRow}
      >
        <Text style={[styles.questionText, { color: theme.text }]}>{item.question}</Text>
        <Ionicons
          color={theme.secondaryText}
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          style={styles.chevron}
        />
      </Pressable>
      {open ? (
        <Text style={[styles.answerText, { color: theme.secondaryText }]}>{item.answer}</Text>
      ) : null}
    </View>
  );
}

interface HelpAccordionSectionProps {
  section: HelpSection;
}

export function HelpAccordionSection({ section }: HelpAccordionSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionIconBox, { backgroundColor: theme.primaryMuted }]}>
          <Ionicons color={theme.primary} name={section.icon} size={16} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
      </View>
      {section.items.map((item, index) => (
        <HelpAccordionItem
          isLast={index === section.items.length - 1}
          item={item}
          key={item.question}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
  },
  itemBorder: {
    borderBottomWidth: 1,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bodySemiBold,
  },
  chevron: {
    flexShrink: 0,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fonts.bodyRegular,
    paddingBottom: 14,
  },
});
