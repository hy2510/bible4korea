"use client";

import { memo } from "react";
import { LinkIcon } from "@/components/ChevronIcons";
import { OriginalWordRow } from "@/components/OriginalWordRow";
import { KoreanVerseText } from "@/components/KoreanVerseText";
import type { ChapterVerse } from "@/lib/verse-types";
import {
  getGreekStrongsDictionaryUrl,
  getHebrewStrongsDictionaryUrl,
} from "@/lib/strongs-links";

interface VerseDisplayProps extends ChapterVerse {
  onVerseSelect?: (verseNum: number) => void;
  highlightStrongs?: string;
  hasSefariaCommentary?: boolean;
  onOpenSefariaCommentary?: (verseNum: number) => void;
}

function VerseDisplayComponent({
  verseNum,
  korean,
  hebrewWords,
  greekWords,
  onVerseSelect,
  highlightStrongs,
  hasSefariaCommentary = false,
  onOpenSefariaCommentary,
}: VerseDisplayProps) {
  const scrollHighlightToWord = !onVerseSelect;

  return (
    <div
      id={`verse-${verseNum}`}
      className={`scroll-mt-24 rounded-xl border border-transparent px-3 py-3 transition-[background-color,border-color,box-shadow] duration-500${
        onVerseSelect ? " hover:border-stone-100 hover:bg-stone-50/60" : ""
      }`}
    >
      <p className="font-serif text-reading text-stone-800">
        <sup className="text-reading-verse-num mr-1.5 inline-block min-w-[1.25rem] font-semibold text-amber-800">
          {verseNum}
        </sup>
        <KoreanVerseText
          text={korean}
          onSelect={
            onVerseSelect ? () => onVerseSelect(verseNum) : undefined
          }
        />
        {hasSefariaCommentary && onOpenSefariaCommentary && (
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
      </p>

      {hebrewWords && hebrewWords.length > 0 && (
        <OriginalWordRow
          words={hebrewWords}
          language="hebrew"
          getDictionaryUrl={getHebrewStrongsDictionaryUrl}
          highlightStrongs={highlightStrongs}
          scrollHighlightToWord={scrollHighlightToWord}
        />
      )}

      {greekWords && greekWords.length > 0 && (
        <OriginalWordRow
          words={greekWords}
          language="greek"
          getDictionaryUrl={getGreekStrongsDictionaryUrl}
          highlightStrongs={highlightStrongs}
          scrollHighlightToWord={scrollHighlightToWord}
        />
      )}
    </div>
  );
}

export const VerseDisplay = memo(VerseDisplayComponent);
