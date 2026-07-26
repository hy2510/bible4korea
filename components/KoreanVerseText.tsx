"use client";

import { stripKoreanBibleQuotes } from "@/lib/korean-verse-text";
import { normalizePronunciationText } from "@/lib/pronunciation-match";

interface KoreanVerseTextProps {
  text: string;
  onSelect?: () => void;
  pronunciationCharacterCount?: number;
}

export function KoreanVerseText({
  text,
  onSelect,
  pronunciationCharacterCount = 0,
}: KoreanVerseTextProps) {
  const displayText = stripKoreanBibleQuotes(text);
  const textCharacters = Array.from(displayText);
  const renderedText = textCharacters.map((character, characterIndex) => {
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
