"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBibleSearch } from "@/components/BibleSearch";
import { DictionaryModal } from "@/components/DictionaryModal";
import {
  strongsWordHighlightClassName,
  strongsWordHighlightMetaClassName,
  strongsWordHighlightTextClassName,
} from "@/lib/featured-panel";
import {
  isNonNumericHebrewStrongs,
  strongsCodesMatch,
} from "@/lib/strongs-links";

export interface OriginalWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

export type WordLanguage = "hebrew" | "greek";

const VIEWPORT_MARGIN_PX = 8;

function computeMenuOffsetX(anchorRect: DOMRect, menuWidth: number): number {
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const menuLeft = anchorCenterX - menuWidth / 2;
  const menuRight = anchorCenterX + menuWidth / 2;
  const maxRight = window.innerWidth - VIEWPORT_MARGIN_PX;

  if (menuLeft < VIEWPORT_MARGIN_PX) {
    return VIEWPORT_MARGIN_PX - menuLeft;
  }

  if (menuRight > maxRight) {
    return maxRight - menuRight;
  }

  return 0;
}

interface OriginalWordRowProps {
  words: OriginalWord[];
  language: WordLanguage;
  getDictionaryUrl: (strongs: string) => string;
  highlightStrongs?: string;
  scrollHighlightToWord?: boolean;
}

function OriginalWordRowComponent({
  words,
  language,
  getDictionaryUrl,
  highlightStrongs,
  scrollHighlightToWord = true,
}: OriginalWordRowProps) {
  const { openSearch } = useBibleSearch();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [menuOffsetX, setMenuOffsetX] = useState(0);
  const [dictionaryIndex, setDictionaryIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isHebrew = language === "hebrew";
  const firstHighlightRef = useRef<HTMLButtonElement>(null);
  const firstHighlightIndex = highlightStrongs
    ? words.findIndex((word) => {
        const isPlaceholderStrongs =
          isHebrew && isNonNumericHebrewStrongs(word.strongs);
        const hasLinkableStrongs =
          Boolean(word.strongs) && !isPlaceholderStrongs;
        return (
          hasLinkableStrongs &&
          strongsCodesMatch(word.strongs, highlightStrongs)
        );
      })
    : -1;

  useLayoutEffect(() => {
    if (!scrollHighlightToWord || firstHighlightIndex < 0 || !highlightStrongs) {
      return;
    }

    let attempts = 0;
    let frameId = 0;
    let cancelled = false;

    const scrollToHighlight = () => {
      if (cancelled) return;

      if (firstHighlightRef.current) {
        firstHighlightRef.current.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
        return;
      }

      if (++attempts < 30) {
        frameId = window.requestAnimationFrame(scrollToHighlight);
      }
    };

    scrollToHighlight();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [scrollHighlightToWord, firstHighlightIndex, highlightStrongs, words.length]);

  useLayoutEffect(() => {
    if (openIndex === null || !menuRef.current) return;

    let frameId = 0;

    const updateOffset = () => {
      const anchor = menuRef.current;
      if (!anchor) return;

      const menu = anchor.querySelector('[role="menu"]');
      if (!(menu instanceof HTMLElement)) return;

      const nextOffset = computeMenuOffsetX(
        anchor.getBoundingClientRect(),
        menu.offsetWidth,
      );
      setMenuOffsetX((current) => (current === nextOffset ? current : nextOffset));
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateOffset();
      });
    };

    updateOffset();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenIndex(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openIndex]);

  const handleWordClick = (index: number, isOpen: boolean) => {
    if (isOpen) {
      setOpenIndex(null);
      return;
    }

    setMenuOffsetX(0);
    setOpenIndex(index);
  };

  const wordBoxClassName =
    "relative inline-flex w-fit max-w-full shrink-0 flex-col items-center rounded-lg px-1.5 py-1 text-center";

  return (
    <>
      <div
        dir={isHebrew ? "rtl" : "ltr"}
        lang={isHebrew ? "he" : "el"}
        className="mt-3 flex flex-wrap gap-x-2 gap-y-3 border-t border-stone-100 pt-3 sm:gap-x-3"
      >
        {words.map((word, index) => {
          const isPlaceholderStrongs =
            isHebrew && isNonNumericHebrewStrongs(word.strongs);
          const hasLinkableStrongs =
            Boolean(word.strongs) && !isPlaceholderStrongs;
          const title = isPlaceholderStrongs
            ? undefined
            : hasLinkableStrongs
              ? word.gloss
                ? `${word.strongs} · ${word.gloss}`
                : `${word.strongs} 메뉴 열기`
              : (word.gloss ?? undefined);

          const isHighlighted =
            highlightStrongs &&
            hasLinkableStrongs &&
            strongsCodesMatch(word.strongs, highlightStrongs);
          const highlightClassName = isHighlighted
            ? strongsWordHighlightClassName
            : "hover:bg-amber-50";

          const wordTextClassName = `block whitespace-nowrap text-center leading-snug ${
            isHighlighted
              ? strongsWordHighlightTextClassName
              : "text-stone-600"
          } ${
            hasLinkableStrongs && !isHighlighted ? "group-hover:text-amber-900" : ""
          } ${
            isHebrew
              ? "text-reading-original font-hebrew"
              : "text-reading-original font-greek"
          }`;

          const content = (
            <>
              <span className={wordTextClassName}>{word.text}</span>
              {(hasLinkableStrongs || isPlaceholderStrongs) && (
                <span
                  dir="ltr"
                  lang="en"
                  className={`text-reading-meta mt-1 block whitespace-nowrap text-center font-mono font-medium tracking-tight ${
                    isHighlighted
                      ? strongsWordHighlightMetaClassName
                      : "text-amber-800/75"
                  } ${hasLinkableStrongs && !isHighlighted ? "group-hover:text-amber-900" : ""}`}
                >
                  {isPlaceholderStrongs ? "-" : word.strongs}
                </span>
              )}
              {(isPlaceholderStrongs || word.gloss) && (
                <span
                  dir="ltr"
                  lang="ko"
                  className={`text-reading-meta mt-1 block whitespace-nowrap text-center leading-tight text-stone-500 ${
                    hasLinkableStrongs ? "group-hover:text-stone-700" : ""
                  }`}
                >
                  {isPlaceholderStrongs ? "-" : word.gloss}
                </span>
              )}
            </>
          );

          if (!hasLinkableStrongs) {
            return (
              <div
                key={`${word.text}-${word.strongs}-${index}`}
                title={title}
                className={wordBoxClassName}
              >
                {content}
              </div>
            );
          }

          const isOpen = openIndex === index;

          return (
            <div
              key={`${word.strongs}-${index}`}
              ref={(node) => {
                if (isOpen) {
                  menuRef.current = node;
                } else if (menuRef.current === node) {
                  menuRef.current = null;
                }
              }}
              className={wordBoxClassName}
            >
              <button
                ref={index === firstHighlightIndex ? firstHighlightRef : undefined}
                type="button"
                title={title}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onClick={() => handleWordClick(index, isOpen)}
                className={`group flex w-fit cursor-pointer flex-col items-center rounded-lg transition-colors ${highlightClassName}`}
              >
                {content}
              </button>

              {isOpen && (
                <div
                  role="menu"
                  style={{ transform: `translateX(calc(-50% + ${menuOffsetX}px))` }}
                  className="absolute top-full left-1/2 z-30 mt-2 w-fit whitespace-nowrap"
                >
                  <span
                    aria-hidden
                    style={{ left: `calc(50% - ${menuOffsetX}px)` }}
                    className="absolute -top-[5px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border border-stone-200 border-b-0 border-r-0 bg-white"
                  />
                  <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg shadow-stone-900/10">
                    <button
                      type="button"
                      role="menuitem"
                      className="block cursor-pointer px-3.5 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-900"
                      onClick={() => {
                        setDictionaryIndex(index);
                        setOpenIndex(null);
                      }}
                    >
                      원어 사전
                    </button>
                    <div
                      role="separator"
                      className="border-t border-stone-100"
                    />
                    <button
                      type="button"
                      role="menuitem"
                      className="block cursor-pointer px-3.5 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-900"
                      onClick={() => {
                        openSearch(word.strongs);
                        setOpenIndex(null);
                      }}
                    >
                      구절 찾기
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {dictionaryIndex !== null && (
        <DictionaryModal
          key={dictionaryIndex}
          open
          initialIndex={dictionaryIndex}
          words={words}
          language={language}
          getDictionaryUrl={getDictionaryUrl}
          onClose={() => setDictionaryIndex(null)}
        />
      )}
    </>
  );
}

export const OriginalWordRow = memo(OriginalWordRowComponent);
