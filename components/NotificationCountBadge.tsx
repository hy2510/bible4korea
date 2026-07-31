export function NotificationCountBadge({
  count,
  className = "",
  ariaHidden = false,
}: {
  count: number;
  className?: string;
  ariaHidden?: boolean;
}) {
  if (count < 1) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : `가입 대기 ${count}명`}
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {label}
    </span>
  );
}
