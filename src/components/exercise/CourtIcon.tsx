import { Path, Polyline, Rect, Line, Svg } from "react-native-svg";

interface CourtIconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * Icône « Saisie express » : mini-terrain vu de dessus, filet et flèche
 * courbe avec pointe. Volontairement sans étincelles ni baguette magique
 * (codes visuels de l'IA à éviter, cf. ticket).
 */
export function CourtIcon({ size = 24, color, strokeWidth = 1.6 }: CourtIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={2.5} width={14} height={19} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M9 18 Q8 9 14.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Polyline
        points="11.3,6 14.5,6.5 12.5,9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
