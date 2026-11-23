import { useMemo } from "react";
import { Circle, G, Line, Path, Polygon, Rect, Svg, Text as SvgText } from "react-native-svg";

import {
  COURT_DIAGRAM_COLORS,
  SCHEMA_SCREEN_COLORS,
  SEQUENCE_PLAYER_COLORS,
  SEQUENCE_PLAYER_ON_COLOR,
  playerTint,
} from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence } from "@/src/types/index";
import {
  COURT,
  DiagramPoint,
  arrowGeometry,
  courtLines,
  courtNet,
  polygonPoints,
  quadraticPoint,
  toLandscape,
} from "@/src/utils/courtDiagram";
import { computeDiagramScene } from "@/src/utils/diagramScene";
import { generateExpressText } from "@/src/utils/expressEntry";

interface CourtDiagramProps {
  sequence: ExerciseSequence;
  /** Nombre de joueurs de l'exercice (joueurs qui travaillent en poste fixe). */
  playersCount: number;
  orientation: "portrait" | "landscape";
  /** Largeur affichée en px ; la hauteur découle des proportions du terrain. */
  width: number;
}

/** Marge autour du terrain, en mètres (place pour les pastilles près des lignes). */
const MARGIN = 0.45;

/** Rapport hauteur / largeur du schéma selon l'orientation. */
export function courtDiagramAspect(orientation: CourtDiagramProps["orientation"]): number {
  const w = COURT.width + MARGIN * 2;
  const l = COURT.length + MARGIN * 2;
  return orientation === "portrait" ? l / w : w / l;
}

/**
 * Schéma de terrain généré depuis la saisie express (react-native-svg), quel
 * que soit le mode (séquence de coups, poste fixe, multivolant). Le repère
 * SVG est en mètres ; les tailles « visuelles » (pastilles, traits, police)
 * sont exprimées en px puis converties pour rester lisibles quelle que soit
 * la taille d'affichage. Zones, flèches et pastilles viennent de
 * computeDiagramScene (src/utils/diagramScene.ts) et ne sont jamais stockées.
 */
export function CourtDiagram({ sequence, playersCount, orientation, width }: CourtDiagramProps) {
  const landscape = orientation === "landscape";
  const viewW = (landscape ? COURT.length : COURT.width) + MARGIN * 2;
  const viewH = (landscape ? COURT.width : COURT.length) + MARGIN * 2;
  const height = width * (viewH / viewW);
  const pxToM = viewW / width;

  const project = (p: DiagramPoint): DiagramPoint => (landscape ? toLandscape(p) : p);

  const badgeRadius = (landscape ? 8 : 11) * pxToM;
  // Pastilles jamais superposées : écart minimal = un diamètre (+ le liseré).
  const minDistance = badgeRadius * 2 + 2 * pxToM;
  const scene = useMemo(
    () => computeDiagramScene(sequence, playersCount, { minDistance }),
    [sequence, playersCount, minDistance],
  );

  const lineWidth = (landscape ? 1 : 1.3) * pxToM;
  const arrowWidth = (landscape ? 1.6 : 2) * pxToM;
  const headLength = (landscape ? 6 : 8) * pxToM;
  const headWidth = (landscape ? 6 : 8) * pxToM;
  const fontSize = (landscape ? 8.5 : 11.5) * pxToM;
  const borderWidth = 2 * pxToM;
  const captionSize = (landscape ? 7 : 10) * pxToM;
  const numberRadius = (landscape ? 6 : 8) * pxToM;
  const numberFontSize = (landscape ? 6.5 : 9) * pxToM;

  const courtTopLeft = project({ x: 0, y: 0 });
  const courtBottomRight = project({ x: COURT.width, y: COURT.length });
  const rectX = Math.min(courtTopLeft.x, courtBottomRight.x);
  const rectY = Math.min(courtTopLeft.y, courtBottomRight.y);
  const net = courtNet();

  const label = `Schéma terrain : ${generateExpressText(sequence, playersCount)}`;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${-MARGIN} ${-MARGIN} ${viewW} ${viewH}`}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Rect
        x={rectX}
        y={rectY}
        width={landscape ? COURT.length : COURT.width}
        height={landscape ? COURT.width : COURT.length}
        fill={COURT_DIAGRAM_COLORS.surface}
      />
      {courtLines().map((segment, i) => {
        const a = project(segment.from);
        const b = project(segment.to);
        return (
          <Line
            key={`l${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={COURT_DIAGRAM_COLORS.lines}
            strokeWidth={lineWidth}
          />
        );
      })}
      {(() => {
        const a = project(net.line.from);
        const b = project(net.line.to);
        return (
          <Line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={COURT_DIAGRAM_COLORS.net}
            strokeWidth={lineWidth * 2.2}
          />
        );
      })()}
      {net.posts.map((post, i) => {
        const p = project(post);
        return (
          <Circle key={`p${i}`} cx={p.x} cy={p.y} r={lineWidth * 2.2} fill={COURT_DIAGRAM_COLORS.net} />
        );
      })}

      {/* Zones du poste fixe : zones d'envoi (légères) puis zones fixes (pointillés). */}
      {scene.zones.map((zone) => {
        const a = project({ x: zone.x, y: zone.y });
        const b = project({ x: zone.x + zone.width, y: zone.y + zone.height });
        const post = zone.emphasis === "post";
        return (
          <Rect
            key={zone.key}
            x={Math.min(a.x, b.x)}
            y={Math.min(a.y, b.y)}
            width={Math.abs(b.x - a.x)}
            height={Math.abs(b.y - a.y)}
            rx={3 * pxToM}
            fill={playerTint(zone.player, post ? 0.22 : 0.12)}
            stroke={post ? SEQUENCE_PLAYER_COLORS[zone.player] : undefined}
            strokeWidth={post ? 1.2 * pxToM : 0}
            strokeDasharray={post ? `${3 * pxToM} ${3 * pxToM}` : undefined}
          />
        );
      })}

      {/* Flèches d'abord, pastilles ensuite (au-dessus). */}
      {scene.arrows.map((arrow) => {
        const color = SEQUENCE_PLAYER_COLORS[arrow.player];
        const geometry = arrowGeometry(project(arrow.from), project(arrow.to), {
          // Courbure calculée par le moteur (alternée, opposée pour deux
          // trajets similaires ; éventail bombé vers l'extérieur en poste fixe).
          curvature: 0.12 * arrow.curvature,
          trimStart: badgeRadius,
          trimEnd: arrow.approximate ? 0 : arrow.endsAtBadge ? badgeRadius + 2 * pxToM : 1 * pxToM,
          headLength,
          headWidth,
          withHead: !arrow.approximate,
        });
        if (!geometry.path) return null;
        const numberAt = arrow.number !== undefined && geometry.curve ? quadraticPoint(geometry.curve, 0.55) : null;
        return (
          <G key={arrow.key}>
            <Path
              d={geometry.path}
              fill="none"
              stroke={color}
              strokeWidth={arrowWidth}
              strokeLinecap="round"
              strokeDasharray={arrow.approximate ? `${arrowWidth * 2.5} ${arrowWidth * 2.5}` : undefined}
              opacity={arrow.approximate ? 0.85 : 1}
            />
            {geometry.head.length > 0 ? (
              <Polygon points={polygonPoints(geometry.head)} fill={color} />
            ) : null}
            {numberAt ? (
              <G>
                <Circle
                  cx={numberAt.x}
                  cy={numberAt.y}
                  r={numberRadius}
                  fill={color}
                  stroke={COURT_DIAGRAM_COLORS.background}
                  strokeWidth={borderWidth * 0.75}
                />
                <SvgText
                  x={numberAt.x}
                  y={numberAt.y + numberFontSize * 0.35}
                  textAnchor="middle"
                  fontSize={numberFontSize}
                  fontFamily={fonts.displayBold}
                  fontWeight="700"
                  fill={SEQUENCE_PLAYER_ON_COLOR}
                >
                  {String(arrow.number)}
                </SvgText>
              </G>
            ) : null}
          </G>
        );
      })}

      {scene.badges.map((badge) => {
        const p = project(badge.at);
        return (
          <G key={badge.key}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={badgeRadius}
              fill={SEQUENCE_PLAYER_COLORS[badge.player]}
              stroke={COURT_DIAGRAM_COLORS.background}
              strokeWidth={borderWidth}
            />
            <SvgText
              x={p.x}
              y={p.y + fontSize * 0.35}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily={fonts.displayBold}
              fontWeight="700"
              fill={SEQUENCE_PLAYER_ON_COLOR}
            >
              {badge.label}
            </SvgText>
          </G>
        );
      })}

      {scene.labels.map((label) => {
        const p = project(label.at);
        return (
          <SvgText
            key={label.key}
            x={p.x}
            y={p.y + badgeRadius + captionSize * 1.15}
            textAnchor="middle"
            fontSize={captionSize}
            fontFamily={fonts.bodySemiBold}
            fontWeight="600"
            fill={SCHEMA_SCREEN_COLORS.listTitle}
          >
            {label.text}
          </SvgText>
        );
      })}
    </Svg>
  );
}
