import Svg, { Circle, Path, Rect } from "react-native-svg";

interface GlyphProps {
  size?: number;
  color: string;
  cut?: string;
}

/** The Paradero mark: a stop sign with a bus front. Used in the tab bar, empty states and the brand header. */
export function StopSignGlyph({ size = 24, color, cut = "transparent" }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={1.5} width={16} height={14} rx={4} fill={color} />
      <Rect x={7.2} y={4.4} width={9.6} height={4.2} rx={1.2} fill={cut} />
      <Circle cx={9.2} cy={11.6} r={1.1} fill={cut} />
      <Circle cx={14.8} cy={11.6} r={1.1} fill={cut} />
      <Path d="M12 15.5v6.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function BusGlyph({ size = 24, color, cut = "transparent" }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4.5} y={2.5} width={15} height={15.5} rx={3.6} fill={color} />
      <Rect x={6.6} y={5} width={10.8} height={5.4} rx={1.4} fill={cut} />
      <Circle cx={8.4} cy={14} r={1.15} fill={cut} />
      <Circle cx={15.6} cy={14} r={1.15} fill={cut} />
      <Rect x={6.2} y={17} width={2.8} height={4} rx={1.2} fill={color} />
      <Rect x={15} y={17} width={2.8} height={4} rx={1.2} fill={color} />
    </Svg>
  );
}

export function StationGlyph({ size = 24, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9.5 12 4l9 5.5" />
      <Path d="M6 9v11M18 9v11M3.5 20.5h17" />
      <Rect x={9} y={12} width={6} height={5.5} rx={1.4} fill={color} stroke="none" />
    </Svg>
  );
}

export function CableGlyph({ size = 24, color }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2.5 5.5 21.5 3" />
      <Path d="M12 4.3V8" />
      <Rect x={6} y={8} width={12} height={12} rx={3.2} fill={color} stroke="none" />
    </Svg>
  );
}
