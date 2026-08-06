"use client";

import { memo } from "react";
import { LinkIcon } from "@/components/ChevronIcons";
import { OriginalWordRow } from "@/components/OriginalWordRow";
import { KoreanVerseText } from "@/components/KoreanVerseText";
import type { PronunciationHighlightMode } from "@/components/KoreanVerseText";
import {
  CheckIcon,
} from "@/components/PronunciationIcons";
import type { ChapterVerse } from "@/lib/verse-types";

const SHOW_SEFARIA_COMMENTARY_BUTTON = false;

interface VerseDisplayProps extends ChapterVerse {
  onVerseSelect?: (verseNum: number) => void;
  /** false in single-verse mode so #verse hash does not trigger a second browser scroll */
  registerAnchor?: boolean;
  highlightStrongs?: string;
  pronunciationCharacterCount?: number;
  pronunciationHighlightMode?: PronunciationHighlightMode;
  pronunciationCompleted?: boolean;
  pronunciationPanelOpen?: boolean;
  onOpenPronunciationPractice?: (verseNum: number) => void;
  hasSefariaCommentary?: boolean;
  onOpenSefariaCommentary?: (verseNum: number) => void;
}

function VerseDisplayComponent({
  verseNum,
  korean,
  hebrewWords,
  hebrewWordGroups,
  greekWords,
  greekWordGroups,
  onVerseSelect,
  registerAnchor = true,
  highlightStrongs,
  pronunciationCharacterCount,
  pronunciationHighlightMode,
  pronunciationCompleted = false,
  pronunciationPanelOpen = false,
  onOpenPronunciationPractice,
  hasSefariaCommentary = false,
  onOpenSefariaCommentary,
}: VerseDisplayProps) {
  const scrollHighlightToWord = !onVerseSelect;

  return (
    <div
      {...(registerAnchor ? { id: `verse-${verseNum}` } : {})}
      className={`rounded-xl border border-transparent px-3 py-3 transition-[background-color,border-color,box-shadow] duration-500${
        onVerseSelect ? " hover:border-stone-100 hover:bg-stone-50/60" : ""
      }`}
    >
      <p className="font-serif text-reading text-stone-800">
        <sup className="text-reading-verse-num mr-1.5 inline-block min-w-[1.25rem] font-semibold text-amber-800">
          {verseNum}
        </sup>
        <KoreanVerseText
          text={korean}
          pronunciationCharacterCount={pronunciationCharacterCount}
          pronunciationHighlightMode={pronunciationHighlightMode}
          onSelect={
            onVerseSelect ? () => onVerseSelect(verseNum) : undefined
          }
        />
        {SHOW_SEFARIA_COMMENTARY_BUTTON &&
          hasSefariaCommentary &&
          onOpenSefariaCommentary && (
          <button
            type="button"
            aria-label={`${verseNum}절 Sefaria 주석 보기`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenSefariaCommentary(verseNum);
            }}
            className="ms-1.5 inline-flex translate-y-px cursor-pointer items-center rounded-md p-0.5 text-amber-700/70 transition-colors hover:bg-amber-100/80 hover:text-amber-900 dark:text-amber-500/70 dark:hover:bg-stone-800/80 dark:hover:text-amber-400"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          )}
        {onOpenPronunciationPractice && (
          <button
            type="button"
            aria-label={
              pronunciationCompleted
                ? `${verseNum}절 소리 내어 읽기 완료, 다시 열기`
                : `${verseNum}절 소리 내어 읽기`
            }
            aria-expanded={pronunciationPanelOpen}
            aria-controls={`pronunciation-panel-${verseNum}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenPronunciationPractice(verseNum);
            }}
            className={`ms-1.5 inline-flex translate-y-0.5 cursor-pointer items-center justify-center rounded-full p-0.5 transition-colors ${
              pronunciationCompleted
                ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-stone-800/80"
                : "text-amber-800/40 hover:bg-amber-100/80 hover:text-amber-800/70 dark:text-amber-400/35 dark:hover:bg-stone-800/80 dark:hover:text-amber-400/70"
            }`}
          >
            <CheckIcon className="h-4 w-4" active={pronunciationCompleted} />
          </button>
        )}
      </p>

      {hebrewWordGroups && hebrewWordGroups.length > 0
        ? hebrewWordGroups.map((group, groupIndex) => (
            <div key={`he-${group.verseNum}`}>
              {hebrewWordGroups.length > 1 && (
                <p
                  dir="ltr"
                  className={`text-[11px] font-medium text-stone-400 ${
                    groupIndex === 0
                      ? "mt-3 border-t border-stone-100 pt-3"
                      : "mt-3"
                  }`}
                >
                  원문 {group.verseNum}절
                </p>
              )}
              <OriginalWordRow
                words={group.words}
                language="hebrew"
                highlightStrongs={highlightStrongs}
                scrollHighlightToWord={
                  scrollHighlightToWord && groupIndex === 0
                }
                suppressTopBorder={
                  hebrewWordGroups.length > 1 || groupIndex > 0
                }
              />
            </div>
          ))
        : hebrewWords &&
          hebrewWords.length > 0 && (
            <OriginalWordRow
              words={hebrewWords}
              language="hebrew"
              highlightStrongs={highlightStrongs}
              scrollHighlightToWord={scrollHighlightToWord}
            />
          )}

      {greekWordGroups && greekWordGroups.length > 0
        ? greekWordGroups.map((group, groupIndex) => (
            <div key={`el-${group.verseNum}-${groupIndex}`}>
              {greekWordGroups.length > 1 && (
                <p
                  dir="ltr"
                  className={`text-[11px] font-medium text-stone-400 ${
                    groupIndex === 0
                      ? "mt-3 border-t border-stone-100 pt-3"
                      : "mt-3"
                  }`}
                >
                  원문 {group.verseNum}절
                </p>
              )}
              <OriginalWordRow
                words={group.words}
                language="greek"
                highlightStrongs={highlightStrongs}
                scrollHighlightToWord={
                  scrollHighlightToWord && groupIndex === 0
                }
                suppressTopBorder={
                  greekWordGroups.length > 1 || groupIndex > 0
                }
              />
            </div>
          ))
        : greekWords &&
          greekWords.length > 0 && (
            <OriginalWordRow
              words={greekWords}
              language="greek"
              highlightStrongs={highlightStrongs}
              scrollHighlightToWord={scrollHighlightToWord}
            />
          )}
    </div>
  );
}

export const VerseDisplay = memo(VerseDisplayComponent);
