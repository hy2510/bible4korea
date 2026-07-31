interface AchievementIconProps {
  className?: string;
}

export function MedalIcon({
  className = "size-6",
}: AchievementIconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M153 275 49 427c-6 9 1 21 12 19l65-6 33 60c5 10 19 10 24 0l78-137-108-88Z"
        fill="#C9232D"
      />
      <path
        d="m359 275 104 152c6 9-1 21-12 19l-65-6-33 60c-5 10-19 10-24 0l-78-137 108-88Z"
        fill="#C9232D"
      />
      <path
        d="m153 275 108 88-28 49-119-119 39-18Z"
        fill="#B51F2A"
      />
      <path
        d="m359 275-108 88 28 49 119-119-39-18Z"
        fill="#B51F2A"
      />
      <circle cx="256" cy="208" r="190" fill="#FFAD05" />
      <circle cx="256" cy="208" r="137" fill="#FFE500" />
    </svg>
  );
}

export function TrophyIcon({
  className = "size-6",
}: AchievementIconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M177 4h31c9 0 17 5 22 13l65 110-62 41L162 32c-7-13 2-28 15-28Z"
        fill="#4B68CE"
      />
      <path
        d="M208 4h-17l73 142 31-19-65-110c-5-8-13-13-22-13Z"
        fill="#2F55C7"
      />
      <path
        d="M304 4h31c14 0 22 15 15 28l-71 136-62-41 65-110c5-8 13-13 22-13Z"
        fill="#2945A8"
      />
      <path
        d="M0 29h110v38H73v53c0 49 19 73 55 75l9 37C49 232 0 191 0 119V29Z"
        fill="#FFD15C"
      />
      <path d="M73 29h55v203h-9c-17-5-32-11-46-20V29Z" fill="#FFB237" />
      <path
        d="M512 29H402v38h37v53c0 49-19 73-55 75l-9 37c88 0 137-41 137-113V29Z"
        fill="#FFB237"
      />
      <path
        d="M402 11H110v113c0 83 36 131 91 168 30 20 40 56 40 126v12h30v-12c0-70 10-106 40-126 55-37 91-85 91-168V21c0-6-5-10-10-10Z"
        fill="#FFB137"
      />
      <path
        d="M110 11h59l98 176c17 31 54 41 82 24 24-15 42-41 53-76-3 71-37 120-91 157-30 20-40 56-40 126v12h-30v-12c0-70-10-106-40-126-55-37-91-85-91-168V11Z"
        fill="#FFD15C"
      />
      <path
        d="M358 80c4-5 11-2 11 4v111c0 19-7 37-21 50l-24 22 34-187Z"
        fill="#FFD15C"
      />
      <circle cx="256" cy="161" r="91" fill="#FFE79A" />
      <path
        d="M256 70a91 91 0 1 1-65 155 91 91 0 0 0 65-155Z"
        fill="#FFF0B8"
      />
      <circle cx="256" cy="161" r="56" fill="#FFB137" />
      <path
        d="M218 173c-7 2-12-6-7-12l19-20c8-8 20-8 28 0l7 7 7-7c8-8 20-8 28 0 7 8 7 20 0 28l-19 20c-5 6-14 2-14-5v-15l-4 4c-8 8-20 8-28 0l-7-7-10 7Z"
        fill="#FF8A00"
      />
      <path
        d="M166 429h180c9 0 17 8 17 17v23H149v-23c0-9 8-17 17-17Z"
        fill="#FFB137"
      />
      <path d="M320 429h26c9 0 17 8 17 17v23h-43v-40Z" fill="#FF9700" />
      <rect x="110" y="469" width="292" height="40" rx="20" fill="#FFD15C" />
      <path
        d="M320 469h62c11 0 20 9 20 20s-9 20-20 20h-62c11 0 20-9 20-20s-9-20-20-20Z"
        fill="#FFB137"
      />
    </svg>
  );
}
