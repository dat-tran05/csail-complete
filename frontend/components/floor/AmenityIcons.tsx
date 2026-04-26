import type { AmenityKind } from "./floor-7-rooms";

interface Props {
  kind: AmenityKind;
  cx: number;
  cy: number;
  size?: number;
}

/**
 * Compact SVG glyphs for floor-plan amenities. Drawn in normalized
 * coordinate space (paths use the size param as a multiplier so the
 * default ~2 unit glyph scales nicely with the existing room cells).
 */
export function AmenityGlyph({ kind, cx, cy, size = 1.2 }: Props) {
  const stroke = "rgba(244,237,224,0.62)";
  const sw = 0.12;
  const transform = `translate(${cx} ${cy}) scale(${size})`;

  switch (kind) {
    case "stair":
      return (
        <g transform={transform} pointerEvents="none">
          {/* Three stepped lines */}
          <path d="M -1.0 0.6 L -0.4 0.6 L -0.4 0.0 L 0.2 0.0 L 0.2 -0.6 L 1.0 -0.6"
                stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -1.0 0.0 L -1.0 0.6" stroke={stroke} strokeWidth={sw * 0.6} />
          <path d="M 1.0 -0.6 L 1.0 -1.2" stroke={stroke} strokeWidth={sw * 0.6} strokeLinecap="round" />
        </g>
      );
    case "elevator":
      return (
        <g transform={transform} pointerEvents="none">
          <rect x={-0.9} y={-0.9} width={1.8} height={1.8} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M 0 -0.55 L 0.35 -0.15 L -0.35 -0.15 Z" fill={stroke} />
          <path d="M 0 0.55 L 0.35 0.15 L -0.35 0.15 Z" fill={stroke} />
        </g>
      );
    case "bathroom":
      return (
        <g transform={transform} pointerEvents="none">
          {/* Two figures: M/W simplification — just two dots and lines */}
          <circle cx={-0.5} cy={-0.5} r={0.22} fill={stroke} />
          <path d="M -0.5 -0.25 L -0.5 0.55 M -0.85 0.05 L -0.15 0.05" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx={0.5} cy={-0.5} r={0.22} fill={stroke} />
          <path d="M 0.5 -0.25 L 0.5 0.55 M 0.15 0.05 L 0.85 0.05 M 0.5 0.4 L 0.25 0.85 M 0.5 0.4 L 0.75 0.85"
                stroke={stroke} strokeWidth={sw} strokeLinecap="round" fill="none" />
        </g>
      );
    case "kitchen":
      return (
        <g transform={transform} pointerEvents="none">
          {/* Mug + plate */}
          <path d="M -0.6 -0.3 L -0.6 0.5 Q -0.6 0.7 -0.4 0.7 L 0.2 0.7 Q 0.4 0.7 0.4 0.5 L 0.4 -0.3 Z"
                fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M 0.4 0.0 Q 0.8 0.0 0.8 0.3 Q 0.8 0.55 0.4 0.55"
                fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M -0.6 -0.3 L 0.4 -0.3" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case "lounge":
      return (
        <g transform={transform} pointerEvents="none">
          {/* Sofa silhouette */}
          <path d="M -1.0 0.4 L -1.0 -0.1 Q -1.0 -0.4 -0.7 -0.4 L 0.7 -0.4 Q 1.0 -0.4 1.0 -0.1 L 1.0 0.4 Z"
                fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M -0.8 0.0 L 0.8 0.0" stroke={stroke} strokeWidth={sw * 0.7} />
        </g>
      );
    case "service":
    default:
      return null;
  }
}
