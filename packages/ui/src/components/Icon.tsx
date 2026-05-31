import type { CSSProperties } from "react";
import { AURA_ICONS, type IconName, type IconPath } from "../icons/paths";

export interface IconProps {
  name: IconName | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function renderPath(d: IconPath, i: number) {
  if (typeof d === "string") return <path key={i} d={d} />;
  if ("c" in d) return <circle key={i} cx={d.cx} cy={d.cy} r={d.r} />;
  if ("l" in d) return <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />;
  if ("rect" in d) return <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} rx={d.rx} />;
  return null;
}

export function Icon({ name, size = 18, className, style }: IconProps) {
  const paths = AURA_ICONS[name] ?? [];
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map(renderPath)}
    </svg>
  );
}
