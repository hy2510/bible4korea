"use client";

import Link from "next/link";
import { useReadingFontSize } from "@/components/ReadingFontSizeProvider";
import { useTheme } from "@/components/ThemeProvider";
import type { ReadingFontSize } from "@/lib/reading-font-size";
import { SAFE_AREA } from "@/lib/safe-area";
import type { ThemeMode } from "@/lib/theme";

function toggleButtonClassName(active: boolean) {
  return `cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "bg-amber-800 text-white shadow-sm"
      : "text-muted hover:bg-surface-muted hover:text-foreground"
  }`;
}

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <div
        className="inline-flex rounded-xl border border-border bg-surface p-1"
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={toggleButtonClassName(value === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup
      label="사이트 테마"
      value={theme}
      onChange={setTheme}
      options={[
        { value: "light" as ThemeMode, label: "라이트" },
        { value: "dark" as ThemeMode, label: "다크" },
      ]}
    />
  );
}

function ReadingFontSizeToggle() {
  const { readingFontSize, setReadingFontSize } = useReadingFontSize();

  return (
    <ToggleGroup
      label="본문 글씨 크기"
      value={readingFontSize}
      onChange={setReadingFontSize}
      options={[
        { value: "small" as ReadingFontSize, label: "작게" },
        { value: "normal" as ReadingFontSize, label: "보통" },
        { value: "large" as ReadingFontSize, label: "크게" },
      ]}
    />
  );
}

export function SiteFooter() {
  return (
    <footer
      className={`notranslate border-t border-border bg-background pt-6 ${SAFE_AREA.x} ${SAFE_AREA.bottomLg}`}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4">
        <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
          <ThemeToggle />
          <ReadingFontSizeToggle />
        </div>
        <p className="text-center text-xs leading-relaxed text-muted">
          성경 본문: Midvash API · 개역한글판 · 구약 히브리어(OSHB) · 신약
          헬라어(MorphGNT/SBLGNT) · Strong&apos;s (LOG) | 개발 참여: 호열과
          사랑하는 라엘 · 준범 · 준서
        </p>
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/licenses"
            className="text-xs text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            오픈 소스 라이선스
          </Link>
          <Link
            href="/reading-history"
            className="text-xs text-muted underline-offset-2 transition-colors hover:text-rose-700 hover:underline dark:hover:text-rose-400"
          >
            기록 관리
          </Link>
        </div>
      </div>
    </footer>
  );
}
