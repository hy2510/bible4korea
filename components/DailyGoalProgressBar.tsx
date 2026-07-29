interface DailyGoalProgressBarProps {
  value: number;
  max: number;
  completed?: boolean;
  label: string;
  trackClassName?: string;
  size?: "sm" | "md";
}

export function DailyGoalProgressBar({
  value,
  max,
  completed = false,
  label,
  trackClassName = "bg-stone-200 dark:bg-stone-700",
  size = "sm",
}: DailyGoalProgressBarProps) {
  const percentage =
    max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const inProgress = !completed && percentage > 0 && percentage < 100;

  return (
    <div
      className={`overflow-hidden rounded-full ${size === "md" ? "h-2.5" : "h-2"} ${trackClassName}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <div
        className={`daily-goal-progress-fill h-full rounded-full ${
          completed
            ? "daily-goal-progress-fill--complete bg-emerald-500"
            : "bg-amber-500"
        } ${inProgress ? "daily-goal-progress-fill--active" : ""}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
