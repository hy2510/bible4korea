import type { VerseWord } from "@/lib/verse-types";

export interface HebrewVerseGroup {
  verseNum: number;
  words: VerseWord[];
}

interface HebrewMergeRule {
  bookSlug: string;
  chapter: number;
  /** 한글 절 번호 (1-based) */
  koreanVerse: number;
  /** 해당 한글 절에 묶을 히브리어 절 범위 (inclusive, 1-based) */
  hebrewFrom: number;
  hebrewTo: number;
}

/**
 * 새번역이 히브리어 여러 절을 한 절로 묶는 경우의 대응 규칙.
 * 합쳐진 절 이후의 한글 절은 히브리어 절이 (합친 개수 - 1)만큼 밀린다.
 */
const HEBREW_MERGE_RULES: HebrewMergeRule[] = [
  {
    bookSlug: "judges",
    chapter: 20,
    koreanVerse: 42,
    hebrewFrom: 42,
    hebrewTo: 43,
  },
  {
    bookSlug: "ezekiel",
    chapter: 15,
    koreanVerse: 4,
    hebrewFrom: 4,
    hebrewTo: 5,
  },
];

function getMergeRules(bookSlug: string, chapter: number): HebrewMergeRule[] {
  return HEBREW_MERGE_RULES.filter(
    (rule) => rule.bookSlug === bookSlug && rule.chapter === chapter,
  ).sort((a, b) => a.koreanVerse - b.koreanVerse);
}

/** 한글 절 번호(1-based) → 대응 히브리어 절 번호들(1-based) */
export function getHebrewVerseNumbersForKoreanVerse(
  bookSlug: string,
  chapter: number,
  koreanVerse: number,
): number[] {
  const rules = getMergeRules(bookSlug, chapter);
  if (rules.length === 0) return [koreanVerse];

  let hebrewCursor = 1;
  let koreanCursor = 1;

  for (const rule of rules) {
    while (koreanCursor < rule.koreanVerse) {
      if (koreanCursor === koreanVerse) return [hebrewCursor];
      hebrewCursor += 1;
      koreanCursor += 1;
    }

    if (koreanCursor === koreanVerse) {
      return Array.from(
        { length: rule.hebrewTo - rule.hebrewFrom + 1 },
        (_, index) => rule.hebrewFrom + index,
      );
    }

    hebrewCursor = rule.hebrewTo + 1;
    koreanCursor += 1;
  }

  const offset = hebrewCursor - koreanCursor;
  return [koreanVerse + offset];
}

export function alignHebrewWordsToKoreanVerses(
  bookSlug: string,
  chapter: number,
  hebrewWordVerses: VerseWord[][] | null | undefined,
  koreanVerseCount: number,
): HebrewVerseGroup[][] | null {
  if (!hebrewWordVerses || hebrewWordVerses.length === 0) return null;

  return Array.from({ length: koreanVerseCount }, (_, index) => {
    const koreanVerse = index + 1;
    const hebrewVerseNums = getHebrewVerseNumbersForKoreanVerse(
      bookSlug,
      chapter,
      koreanVerse,
    );

    return hebrewVerseNums.flatMap((hebrewVerseNum) => {
      const words = hebrewWordVerses[hebrewVerseNum - 1];
      if (!words || words.length === 0) return [];
      return [{ verseNum: hebrewVerseNum, words }];
    });
  });
}
