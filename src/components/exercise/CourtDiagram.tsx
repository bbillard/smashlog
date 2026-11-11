import { useMemo } from "react";
import { Circle, G, Line, Path, Polygon, Rect, Svg, Text as SvgText } from "react-native-svg";

import {
  COURT_DIAGRAM_COLORS,
  SEQUENCE_PLAYER_COLORS,
  SEQUENCE_PLAYER_ON_COLOR,
} from "@/src/constants/sequenceColors";
import { fonts } from "@/src/theme/typography";
import { ExerciseSequence } from "@/src/types/index";
import {
  COURT,
  DiagramPoint,
  arrowGeometry,
  computeDiagramShots,
  courtLines,
  courtNet,
  polygonPoints,
  toLandscape,
} from "@/src/utils/courtDiagram";
import { sequencePreview } from "@/src/utils/exerciseSequence";

interface CourtDiagramProps {
  sequence: ExerciseSequence;
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
 * Schéma de terrain généré depuis la séquence (react-native-svg). Le repère
 * SVG est en mètres ; les tailles « visuelles » (pastilles, traits, police)
 * sont exprimées en px puis converties pour rester lisibles quelle que soit
 * la taille d'affichage. Les positions viennent de computeDiagramShots
 * (src/utils/courtDiagram.ts) et ne sont jamais stockées.
 */
export function CourtDiagram({ sequence, playersCount, orientation, width }: CourtDiagramProps) {
  const landscape = orientation === "landscape";
  const viewW = (landscape ? COURT.length : COURT.width) + MARGIN * 2;
  const viewH = (landscape ? COURT.width : COURT.length) + MARGIN * 2;
  const height = width * (viewH / viewW);
  const pxToM = viewW / width;

  const project = (p: DiagramPoint): DiagramPoint => (landscape ? toLandscape(p) : p);

  const shots = useMemo(() => computeDiagramShots(sequence, playersCount), [sequence, playersCount]);

  const badgeRadius = (landscape ? 8 : 13) * pxToM;
  const lineWidth = (landscape ? 1 : 1.5) * pxToM;
  const arrowWidth = (landscape ? 1.6 : 2.5) * pxToM;
  const headLength = (landscape ? 6 : 10) * pxToM;
  const headWidth = (landscape ? 6 : 10) * pxToM;
  const fontSize = (landscape ? 8.5 : 13.5) * pxToM;
  const borderWidth = 2 * pxToM;

  const courtTopLeft = project({ x: 0, y: 0 });
  const courtBottomRight = project({ x: COURT.width, y: COURT.length });
  const rectX = Math.min(courtTopLeft.x, courtBottomRight.x);
  const rectY = Math.min(courtTopLeft.y, courtBottomRight.y);
  const net = courtNet();

  const label = `Schéma terrain de la séquence : ${sequencePreview(sequence)}`;

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

      {/* Flèches d'abord, pastilles ensuite (au-dessus). */}
      {shots.map((shot) => {
        const color = SEQUENCE_PLAYER_COLORS[shot.player];
        const geometry = arrowGeometry(project(shot.from), project(shot.to), {
          // Courbure alternée d'un coup à l'autre pour limiter les chevauchements.
          curvature: shot.index % 2 === 0 ? 0.12 : -0.12,
          trimStart: badgeRadius,
          trimEnd: shot.approximate ? 0 : badgeRadius + 2 * pxToM,
          headLength,
          headWidth,
          withHead: !shot.approximate,
        });
        if (!geometry.path) return null;
        return (
          <G key={`a${shot.stepId}`}>
            <Path
              d={geometry.path}
              fill="none"
              stroke={color}
              strokeWidth={arrowWidth}
              strokeLinecap="round"
              strokeDasharray={shot.approximate ? `${arrowWidth * 2.5} ${arrowWidth * 2.5}` : undefined}
              opacity={shot.approximate ? 0.85 : 1}
            />
            {geometry.head.length > 0 ? (
              <Polygon points={polygonPoints(geometry.head)} fill={color} />
            ) : null}
          </G>
        );
      })}

      {shots.map((shot) => {
        const p = project(shot.from);
        return (
          <G key={`b${shot.stepId}`}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={badgeRadius}
              fill={SEQUENCE_PLAYER_COLORS[shot.player]}
              stroke={COURT_DIAGRAM_COLORS.background}
              strokeWidth={borderWidth}
            />
            <SvgText
              x={p.x}
              y={p.y + fontSize * 0.35}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily={fonts.displayExtraBold}
              fontWeight="800"
              fill={SEQUENCE_PLAYER_ON_COLOR}
            >
              {String(shot.index + 1)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
