interface PronunciationIconProps {
  className?: string;
}

export function MicrophoneIcon({
  className = "h-5 w-5",
}: PronunciationIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EyeIcon({
  className = "h-5 w-5",
}: PronunciationIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" strokeWidth="1.8" />
    </svg>
  );
}

export function CheckIcon({
  className = "h-4 w-4",
  active = true,
}: PronunciationIconProps & { active?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      <path
        d="m8 12.2 2.6 2.6L16.2 9"
        fill="none"
        stroke={active ? "white" : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
