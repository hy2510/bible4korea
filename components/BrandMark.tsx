const LOGO_BG = "#92400e";
const LOGO_TEXT = "#fffbeb";

interface BrandMarkProps {
  size?: number;
  className?: string;
  variant?: "filled" | "plain";
}

/** 히브리어 "את" — RTL 기준 오른쪽=א, 왼쪽=ת */
export function BrandMark({
  size = 32,
  className,
  variant = "filled",
}: BrandMarkProps) {
  const radius = Math.round(size * 0.25);
  const fontSize = Math.round(size * 0.5);
  const y = Math.round(size * 0.64);
  const isFilled = variant === "filled";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden
    >
      <rect
        width={size}
        height={size}
        rx={radius}
        fill={isFilled ? LOGO_BG : undefined}
        className={
          isFilled
            ? undefined
            : "fill-transparent dark:fill-surface-muted dark:group-hover:fill-stone-800/80"
        }
      />
      <text
        x={size / 2}
        y={y}
        fill={isFilled ? LOGO_TEXT : "currentColor"}
        fontFamily="'Noto Sans Hebrew', 'Arial Hebrew', sans-serif"
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="middle"
        direction="rtl"
        unicodeBidi="bidi-override"
      >
        {"\u05D0\u05EA"}
      </text>
    </svg>
  );
}
