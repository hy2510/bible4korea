"use client";

import { stripKoreanBibleQuotes } from "@/lib/korean-verse-text";
import { normalizePronunciationText } from "@/lib/pronunciation-match";

export type PronunciationHighlightMode = "text" | "word-background";

interface KoreanVerseTextProps {
  text: string;
  onSelect?: () => void;
  pronunciationCharacterCount?: number;
  pronunciationHighlightMode?: PronunciationHighlightMode;
}

function getWordSegments(displayText: string) {
  return displayText.split(/(\s+)/).map((part) => ({
    text: part,
    isSpace: /^\s+$/.test(part),
    normalizedLength: normalizePronunciationText(part).length,
  }));
}

export function KoreanVerseText({
  text,
  onSelect,
  pronunciationCharacterCount = 0,
  pronunciationHighlightMode = "text",
}: KoreanVerseTextProps) {
  const displayText = stripKoreanBibleQuotes(text);

  const renderedText =
    pronunciationHighlightMode === "word-background"
      ? (() => {
          const segments = getWordSegments(displayText);
          let runningNormalizedCount = 0;

          return segments.map((segment, segmentIndex) => {
            if (segment.isSpace || segment.normalizedLength === 0) {
              return <span key={segmentIndex}>{segment.text}</span>;
            }

            const wordStart = runningNormalizedCount;
            runningNormalizedCount += segment.normalizedLength;
            const isActive =
              pronunciationCharacterCount > wordStart &&
              pronunciationCharacterCount <= runningNormalizedCount;

            return (
              <span
                key={segmentIndex}
                data-pronunciation-current={isActive ? "true" : undefined}
                className={
                  isActive
                    ? "rounded-sm bg-amber-300 px-0.5 dark:bg-amber-400/45"
                    : "rounded-sm px-0.5"
                }
              >
                {segment.text}
              </span>
            );
          });
        })()
      : Array.from(displayText).map((character, characterIndex, textCharacters) => {
          const characterLength = normalizePronunciationText(character).length;
          const previousCharacterCount = textCharacters
            .slice(0, characterIndex)
            .reduce(
              (count, previousCharacter) =>
                count + normalizePronunciationText(previousCharacter).length,
              0,
            );
          const isCompleted =
            characterLength > 0 &&
            previousCharacterCount + characterLength <=
              pronunciationCharacterCount;

          return (
            <span
              key={characterIndex}
              data-pronunciation-completed={isCompleted ? "true" : undefined}
              className={
                isCompleted
                  ? "text-amber-700 transition-colors duration-150 dark:text-amber-400"
                  : "transition-colors"
              }
            >
              {character}
            </span>
          );
        });

  if (!onSelect) {
    return <span>{renderedText}</span>;
  }

  const handleClick = () => {
    onSelect();
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className="cursor-pointer rounded-sm transition-colors hover:bg-amber-50/80"
    >
      {renderedText}
    </span>
  );
}

/** 눈으로 읽기 진행용: 표시 텍스트의 단어별 누적 정규화 글자 수 */
export function getSilentReadingWordCharacterCounts(text: string): number[] {
  const displayText = stripKoreanBibleQuotes(text);
  const segments = getWordSegments(displayText);
  const counts: number[] = [];
  let running = 0;

  for (const segment of segments) {
    if (segment.isSpace || segment.normalizedLength === 0) continue;
    running += segment.normalizedLength;
    counts.push(running);
  }

  return counts;
}
