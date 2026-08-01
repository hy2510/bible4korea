"use client";

import Link from "next/link";
import { useReadingFontSize } from "@/components/ReadingFontSizeProvider";
import { useTheme } from "@/components/ThemeProvider";
import type { ReadingFontSize } from "@/lib/reading-font-size";
import { SAFE_AREA } from "@/lib/safe-area";
import { SITE_NAME } from "@/lib/seo";
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
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`notranslate border-t border-border bg-background pt-6 ${SAFE_AREA.x} ${SAFE_AREA.bottomLg}`}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4">
        <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
          <ThemeToggle />
          <ReadingFontSizeToggle />
        </div>
        <div className="grid justify-items-center gap-y-2 text-center text-xs text-muted">
          <p className="leading-5">
            Copyright ©{currentYear} {SITE_NAME}. All rights reserved.
          </p>
          <p className="leading-5">
            성경 본문: 새번역(RNKSV) · 구약 히브리어(OSHB) ·
            신약 헬라어(MorphGNT/SBLGNT) · Strong&apos;s (LOG)
          </p>
          <p className="max-w-2xl leading-5">
            본 제품에 사용한 『성경전서 새번역』의 저작권은 재단법인
            대한성서공회 소유이며 재단법인 대한성서공회의 허락을 받고
            사용하였음.
          </p>
          <p className="leading-5">
            Credit: 호열 · 라엘 · 준범 · 준서
          </p>
          <p className="leading-5">
            <Link
              href="/licenses"
              className="cursor-pointer underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              오픈 소스 라이선스
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
