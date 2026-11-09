import Svg, { Circle, Defs, G, Mask, Rect } from "react-native-svg";

/** Bars around the sign, in Croma's symbol language: [x, y, rotation] on a 1024 grid. */
const RING = [
  [942.0, 507.0, 90.0],
  [939.3, 555.1, 96.43],
  [931.2, 602.7, 102.86],
  [917.9, 649.0, 109.29],
  [899.4, 693.6, 115.71],
  [876.1, 735.8, 122.14],
  [848.2, 775.1, 128.57],
  [816.1, 811.1, 135.0],
  [780.1, 843.2, 141.43],
  [740.8, 871.1, 147.86],
  [698.6, 894.4, 154.29],
  [654.0, 912.9, 160.71],
  [607.7, 926.2, 167.14],
  [560.1, 934.3, 173.57],
  [512.0, 937.0, 180.0],
  [463.9, 934.3, 186.43],
  [416.3, 926.2, 192.86],
  [370.0, 912.9, 199.29],
  [325.4, 894.4, 205.71],
  [283.2, 871.1, 212.14],
  [243.9, 843.2, 218.57],
  [207.9, 811.1, 225.0],
  [175.8, 775.1, 231.43],
  [147.9, 735.8, 237.86],
  [124.6, 693.6, 244.29],
  [106.1, 649.0, 250.71],
  [92.8, 602.7, 257.14],
  [84.7, 555.1, 263.57],
  [82.0, 507.0, 270.0],
  [84.7, 458.9, 276.43],
  [92.8, 411.3, 282.86],
  [106.1, 365.0, 289.29],
  [124.6, 320.4, 295.71],
  [147.9, 278.2, 302.14],
  [175.8, 238.9, 308.57],
  [207.9, 202.9, 315.0],
  [243.9, 170.8, 321.43],
  [283.2, 142.9, 327.86],
  [325.4, 119.6, 334.29],
  [370.0, 101.1, 340.71],
  [416.3, 87.8, 347.14],
  [463.9, 79.7, 353.57],
  [512.0, 77.0, 360.0],
  [560.1, 79.7, 366.43],
  [607.7, 87.8, 372.86],
  [654.0, 101.1, 379.29],
  [698.6, 119.6, 385.71],
  [740.8, 142.9, 392.14],
  [780.1, 170.8, 398.57],
  [816.1, 202.9, 405.0],
  [848.2, 238.9, 411.43],
  [876.1, 278.2, 417.86],
  [899.4, 320.4, 424.29],
  [917.9, 365.0, 430.71],
  [931.2, 411.3, 437.14],
  [939.3, 458.9, 443.57],
] as const;

/** The Paradero mark: a stop sign inside a ring of data bars, the same drawing as the app icon. */
export function ParaderoMark({ size, color, ring }: { size: number; color: string; ring: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessible accessibilityRole="image" accessibilityLabel="Paradero">
      <Defs>
        <Mask id="sign" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <Rect width="1024" height="1024" fill="black" />
          <Rect x="300" y="170" width="424" height="424" rx="104" fill="white" />
          <Rect x="376" y="246" width="272" height="252" rx="58" fill="black" />
          <Rect x="410" y="284" width="204" height="102" rx="22" fill="white" />
          <Circle cx="440" cy="448" r="19" fill="white" />
          <Circle cx="584" cy="448" r="19" fill="white" />
          <Rect x="404" y="486" width="46" height="52" rx="14" fill="black" />
          <Rect x="574" y="486" width="46" height="52" rx="14" fill="black" />
          <Rect x="484" y="594" width="56" height="250" rx="28" fill="white" />
        </Mask>
      </Defs>
      <G>
        {RING.map(([x, y, r]) => (
          <Rect key={r} x={x - 5} y={y - 26} width="10" height="52" rx="5" fill={ring} transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </G>
      <Rect width="1024" height="1024" fill={color} mask="url(#sign)" />
    </Svg>
  );
}
