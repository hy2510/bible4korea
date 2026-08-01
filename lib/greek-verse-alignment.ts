import type { GreekVerseGroup, VerseWord } from "@/lib/verse-types";

export type { GreekVerseGroup };

export function isMissingKoreanVerseText(text: string | null | undefined): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;
  return /^\(?본문\s*없음\)?$/.test(trimmed);
}

/**
 * Align MorphGNT to RNKSV by verse number only (1:1).
 * Do not merge/carry into the next verse after "(본문 없음)".
 *
 * NT empty markers that previously caused double-bundling when Greek was
 * dense-packed: Matt 17:21→22, 18:11→12, 23:14→15; Mark 9:44→45, 9:46→47,
 * 11:26→27, 15:28→29; Luke 17:36→37, 23:17→18; Acts 8:37→38, 15:34→35,
 * 24:7→8, 28:29→30. Romans 16:24 keeps its own Greek on verse 24.
 */
export function alignGreekWordsToKoreanVerses(
  koreanVerses: string[],
  greekWordVerses: VerseWord[][] | null | undefined,
): GreekVerseGroup[][] | null {
  if (!greekWordVerses || greekWordVerses.length === 0) return null;

  return koreanVerses.map((_, index) => {
    const words = greekWordVerses[index] ?? [];
    if (words.length === 0) return [];
    return [{ verseNum: index + 1, words }];
  });
}
