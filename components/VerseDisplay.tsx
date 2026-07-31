"use client";

import { memo } from "react";
import { LinkIcon } from "@/components/ChevronIcons";
import { OriginalWordRow } from "@/components/OriginalWordRow";
import { KoreanVerseText } from "@/components/KoreanVerseText";
import {
  CheckIcon,
  MicrophoneIcon,
} from "@/components/PronunciationIcons";
import type { ChapterVerse } from "@/lib/verse-types";

const SHOW_SEFARIA_COMMENTARY_BUTTON = false;

interface VerseDisplayProps extends ChapterVerse {
  onVerseSelect?: (verseNum: number) => void;
  /** false in single-verse mode so #verse hash does not trigger a second browser scroll */
  registerAnchor?: boolean;
  highlightStrongs?: string;
  pronunciationCharacterCount?: number;
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
  greekWords,
  onVerseSelect,
  registerAnchor = true,
  highlightStrongs,
  pronunciationCharacterCount,
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
            className={`ms-1.5 inline-flex translate-y-0.5 cursor-pointer items-center justify-center transition-colors ${
              pronunciationCompleted
                ? "gap-0.5 rounded-full border border-emerald-700 bg-emerald-600 px-1.5 py-0.5 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                : "rounded-full p-0.5 text-amber-800 hover:bg-amber-100/80 hover:text-amber-950 dark:text-amber-400 dark:hover:bg-stone-800/80 dark:hover:text-amber-300"
            }`}
          >
            <MicrophoneIcon className="h-4 w-4" />
            {pronunciationCompleted && <CheckIcon className="h-3.5 w-3.5" />}
          </button>
        )}
      </p>

      {hebrewWords && hebrewWords.length > 0 && (
        <OriginalWordRow
          words={hebrewWords}
          language="hebrew"
          highlightStrongs={highlightStrongs}
          scrollHighlightToWord={scrollHighlightToWord}
        />
      )}

      {greekWords && greekWords.length > 0 && (
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
