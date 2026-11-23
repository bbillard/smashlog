import { useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";

import { ShotNumberBadge } from "@/src/components/exercise/ShotNumberBadge";
import { SCHEMA_SCREEN_COLORS } from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence } from "@/src/types/index";
import {
  LIST_ROWS,
  LIST_VISIBLE_COLUMNS,
  SequenceListItem,
  listColumns,
  listLayout,
  listPageCount,
  listPageIndex,
  sequenceListItems,
} from "@/src/utils/diagramLayout";

interface SequenceShotListProps {
  sequence: ExerciseSequence;
  /**
   * « screen » : grille de 3 lignes, défilement horizontal accroché colonne
   * par colonne au-delà de 6 éléments. « export » : liste complète sur
   * 2 colonnes, sans défilement (PNG).
   */
  mode: "screen" | "export";
  /** Largeur totale du composant (px), marges latérales comprises. */
  width: number;
}

/** Marge latérale de la liste (alignée sur l'en-tête). */
export const LIST_SIDE_PADDING = 16;
const ROW_HEIGHT = 30;
const ROW_GAP = 2;
const COLUMN_GAP = 12;
/** Largeur d'une colonne à l'écran : la 3e colonne dépasse du bord droit. */
const SCREEN_COLUMN_RATIO = 0.46;
/** Une seule colonne (multivolant) : la colonne suivante dépasse aussi du bord droit. */
const SINGLE_COLUMN_RATIO = 0.9;

/** Hauteur fixe de la grille à l'écran (3 lignes). */
export const SCREEN_LIST_HEIGHT = LIST_ROWS * ROW_HEIGHT + (LIST_ROWS - 1) * ROW_GAP;

/**
 * Liste sous le terrain (écran 5 bis) : une ligne par coup (pastille
 * numérotée à la couleur du joueur, coup en gras, direction en gris), puis la
 * ligne de fin. En poste fixe : zones d'envoi (pastille flèche ou numéro) ou
 * frappes du multivolant sur une seule colonne (lignes longues).
 * Répartition calculée par listColumns (src/utils/diagramLayout.ts).
 */
export function SequenceShotList({ sequence, mode, width }: SequenceShotListProps) {
  const items = sequenceListItems(sequence);
  const layout = listLayout(sequence);
  const visibleColumns = layout === "single" ? 1 : LIST_VISIBLE_COLUMNS;
  const columns = listColumns(items, mode, layout);
  const innerWidth = Math.max(0, width - LIST_SIDE_PADDING * 2);
  const [page, setPage] = useState(0);

  if (mode === "export") {
    const columnWidth = layout === "single" ? innerWidth : (innerWidth - COLUMN_GAP) / 2;
    return (
      <View style={[styles.exportRow, { paddingHorizontal: LIST_SIDE_PADDING }]}>
        {columns.map((column, c) => (
          <View key={`c${c}`} style={[styles.column, { width: columnWidth }]}>
            {column.map((item) => (
              <ListRow key={item.key} item={item} wrap />
            ))}
          </View>
        ))}
      </View>
    );
  }

  const columnWidth = Math.floor(innerWidth * (layout === "single" ? SINGLE_COLUMN_RATIO : SCREEN_COLUMN_RATIO));
  const snapInterval = columnWidth + COLUMN_GAP;
  const pageCount = listPageCount(columns.length, visibleColumns);
  const scrollable = columns.length > visibleColumns;

  const grid = columns.map((column, c) => (
    <View key={`c${c}`} style={[styles.column, { width: columnWidth, height: SCREEN_LIST_HEIGHT }]}>
      {column.map((item) => (
        <ListRow key={item.key} item={item} />
      ))}
    </View>
  ));

  if (!scrollable) {
    return <View style={[styles.screenRow, { paddingHorizontal: LIST_SIDE_PADDING }]}>{grid}</View>;
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(listPageIndex(e.nativeEvent.contentOffset.x, snapInterval, pageCount));

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={[styles.screenRow, { paddingHorizontal: LIST_SIDE_PADDING }]}
        accessibilityLabel="Liste du schéma, faire défiler horizontalement pour voir la suite"
      >
        {grid}
      </ScrollView>
      <View style={styles.dots} accessibilityLabel={`Page ${page + 1} sur ${pageCount}`}>
        {Array.from({ length: pageCount }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? SCHEMA_SCREEN_COLORS.accent : SCHEMA_SCREEN_COLORS.pageDot },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ListRow({ item, wrap = false }: { item: SequenceListItem; wrap?: boolean }) {
  // Dans le PNG, un libellé trop long passe sur 2 lignes plutôt que d'être tronqué.
  const lines = wrap ? 2 : 1;
  if (item.kind === "ending") {
    return (
      <View style={[styles.row, wrap ? styles.rowWrap : styles.rowFixed]}>
        <ShotNumberBadge kind="ending" mode={item.mode} />
        <Text style={styles.endingLabel} numberOfLines={lines}>
          {item.label}
        </Text>
      </View>
    );
  }
  if (item.kind === "send") {
    return (
      <View
        style={[styles.row, wrap ? styles.rowWrap : styles.rowFixed]}
        accessible
        accessibilityLabel={`${item.number !== undefined ? `Envoi ${item.number}` : "Envoi"} du joueur ${item.player} vers : ${item.label}`}
      >
        {item.number !== undefined ? (
          <ShotNumberBadge kind="shot" number={item.number} player={item.player} />
        ) : (
          <ShotNumberBadge kind="send" player={item.player} />
        )}
        <Text style={styles.shot} numberOfLines={lines}>
          {item.label}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[styles.row, wrap ? styles.rowWrap : styles.rowFixed]}
      accessible
      accessibilityLabel={`${item.number !== undefined ? `Coup ${item.number}` : "Coup"}, joueur ${item.player} : ${item.shot}${item.direction ? ` ${item.direction}` : ""}`}
    >
      {item.number !== undefined ? (
        <ShotNumberBadge kind="shot" number={item.number} player={item.player} />
      ) : (
        <ShotNumberBadge kind="send" player={item.player} />
      )}
      <Text style={styles.shot} numberOfLines={lines}>
        {item.shot}
        {item.direction ? <Text style={styles.direction}> {item.direction}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRow: {
    flexDirection: "row",
    gap: COLUMN_GAP,
  },
  exportRow: {
    flexDirection: "row",
    gap: COLUMN_GAP,
    alignItems: "flex-start",
  },
  column: {
    gap: ROW_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  rowFixed: {
    height: ROW_HEIGHT,
  },
  rowWrap: {
    minHeight: ROW_HEIGHT,
  },
  shot: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: SCHEMA_SCREEN_COLORS.title,
  },
  direction: {
    fontFamily: fonts.bodyMedium,
    color: SCHEMA_SCREEN_COLORS.muted,
  },
  endingLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: SCHEMA_SCREEN_COLORS.muted,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
