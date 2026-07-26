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

export function CheckIcon({
  className = "h-4 w-4",
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
        d="m5 12 4.2 4.2L19 6.5"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
