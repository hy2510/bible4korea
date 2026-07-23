import {
  HEBREW_ALPHABET,
  type HebrewAlphabetEntry,
} from "@/data/hebrew-alphabet";
import { computeHebrewGematria } from "@/lib/hebrew-gematria";

const FINAL_TO_REGULAR: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

/** 히브리어 결합 기호(니쿠드·악센트 등) */
const HEBREW_MARKS_RE = /[\u0591-\u05C7]/g;

const HEBREW_LETTER_BY_CHAR = new Map(
  HEBREW_ALPHABET.map((entry) => [entry.letter, entry]),
);

export interface HebrewLetterAnalysis {
  /** 단어에 나타난 형태(종서 포함) */
  letter: string;
  /** 알파벳 표 lookup용 일반형 */
  normalized: string;
  entry: HebrewAlphabetEntry | null;
}

export function normalizeHebrewLetter(letter: string): string {
  return FINAL_TO_REGULAR[letter] ?? letter;
}

export function analyzeHebrewWordLetters(text: string): HebrewLetterAnalysis[] {
  const consonants = Array.from(
    text.replace(HEBREW_MARKS_RE, "").replace(/\//g, ""),
  ).filter((char) => /[\u05D0-\u05EA]/.test(char));

  return consonants.map((letter) => {
    const normalized = normalizeHebrewLetter(letter);
    return {
      letter,
      normalized,
      entry: HEBREW_LETTER_BY_CHAR.get(normalized) ?? null,
    };
  });
}

export function sumHebrewLetterValues(
  letters: HebrewLetterAnalysis[],
): number {
  return letters.reduce((sum, item) => sum + (item.entry?.value ?? 0), 0);
}

export type HebrewLetterRole = "root" | "affix" | "plain";

export interface MarkedHebrewLetter extends HebrewLetterAnalysis {
  role: HebrewLetterRole;
}

/** 본문 자음 안에서 어근 자음을 순서대로 매칭해 역할을 표시합니다. */
export function markSurfaceLettersWithRoot(
  surface: HebrewLetterAnalysis[],
  root: HebrewLetterAnalysis[],
): MarkedHebrewLetter[] {
  if (surface.length === 0) return [];
  if (root.length === 0) {
    return surface.map((letter) => ({ ...letter, role: "plain" }));
  }

  const roles: HebrewLetterRole[] = surface.map(() => "affix");
  let rootIndex = 0;

  for (
    let surfaceIndex = 0;
    surfaceIndex < surface.length && rootIndex < root.length;
    surfaceIndex += 1
  ) {
    if (surface[surfaceIndex].normalized === root[rootIndex].normalized) {
      roles[surfaceIndex] = "root";
      rootIndex += 1;
    }
  }

  return surface.map((letter, index) => ({
    ...letter,
    role: roles[index],
  }));
}

export { computeHebrewGematria };
