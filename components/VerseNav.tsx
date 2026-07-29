import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ChevronIcons";

interface VerseNavProps {
  currentVerse: number;
  totalVerses: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export function VerseNav({
  currentVerse,
  totalVerses,
  onPrev,
  onNext,
  className = "",
}: VerseNavProps) {
  const hasPrev = currentVerse > 1;
  const hasNext = currentVerse < totalVerses;
  const spacerClassName = "w-10 sm:w-[5.5rem]";

  return (
    <nav
      className={`flex items-center justify-between gap-3 ${className}`.trim()}
    >
      {hasPrev ? (
        <button
          type="button"
          onClick={onPrev}
          aria-label="이전 절"
          aria-keyshortcuts="ArrowLeft"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition-colors hover:border-amber-300 hover:text-amber-900 sm:px-4"
        >
          <ChevronLeftIcon />
          <span className="hidden sm:inline">이전 절</span>
        </button>
      ) : (
        <span className={spacerClassName} aria-hidden />
      )}
      <span className="text-center text-sm text-stone-500">
        {currentVerse} / {totalVerses}절
      </span>
      {hasNext ? (
        <button
          type="button"
          onClick={onNext}
          aria-label="다음 절"
          aria-keyshortcuts="ArrowRight"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition-colors hover:border-amber-300 hover:text-amber-900 sm:px-4"
        >
          <span className="hidden sm:inline">다음 절</span>
          <ChevronRightIcon />
        </button>
      ) : (
        <span className={spacerClassName} aria-hidden />
      )}
    </nav>
  );
}
