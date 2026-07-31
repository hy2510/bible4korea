import type { BibleBook } from "@/lib/bible-api";
import type { PronunciationProgressSnapshot } from "@/lib/pronunciation-progress";

export interface BookReadingAchievement {
  bookSlug: string;
  bookTitle: string;
  completionCount: number;
  completedAt: string;
}

export interface BibleReadingAchievement {
  completionCount: number;
  completedAt: string;
}

export type ReadingAchievementCelebration =
  | {
      kind: "book";
      achievement: BookReadingAchievement;
    }
  | {
      kind: "bible";
      achievement: BibleReadingAchievement;
    };

export interface BibleReadingRoundProgress {
  targetCompletionCount: number;
  completedVerses: number;
  remainingVerses: number;
  totalVerses: number;
  percentage: number;
  ready: boolean;
}

export const BOOK_CELEBRATION_MESSAGES = [
  "한 권의 말씀을 처음부터 끝까지 마음에 담았어요. 귀한 완독을 진심으로 축하해요!",
  "말씀의 한 여정을 온전히 마쳤어요. 오늘의 기쁨이 다음 독서의 힘이 되길 바라요.",
  "꾸준히 이어 온 읽기가 빛나는 메달이 되었어요. 정말 훌륭해요!",
  "한 절 한 절 쌓아 완독에 도착했어요. 말씀과 함께한 시간을 오래 간직해 보세요.",
] as const;

export const BIBLE_CELEBRATION_MESSAGES = [
  "창세기부터 요한계시록까지 말씀의 큰 여정을 완주했어요. 성경 통독을 진심으로 축하해요!",
  "성경 66권을 모두 읽는 귀한 발걸음을 완성했어요. 오늘의 감동을 오래 간직하세요.",
  "말씀 전체를 품은 값진 통독이에요. 꾸준함으로 세운 빛나는 여정을 축하해요!",
] as const;

export function formatAchievementDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function isBookReadingComplete(
  snapshot: PronunciationProgressSnapshot,
  book: BibleBook,
): boolean {
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const chapterKey = `${book.slug}:${chapter}`;
    const versePrefix = `${chapterKey}:`;
    const totalVerses = snapshot.chapterVerseCounts[chapterKey] ?? 0;
    if (totalVerses < 1) return false;

    let completedVerses = 0;
    snapshot.completedVerseKeys.forEach((verseKey) => {
      if (verseKey.startsWith(versePrefix)) completedVerses++;
    });
    if (completedVerses < totalVerses) return false;
  }

  return true;
}

export function getBookAchievementCounts(
  achievements: readonly BookReadingAchievement[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const achievement of achievements) {
    counts[achievement.bookSlug] = Math.max(
      counts[achievement.bookSlug] ?? 0,
      achievement.completionCount,
    );
  }
  return counts;
}

export function getBibleReadingRoundProgress(
  snapshot: PronunciationProgressSnapshot,
  books: readonly BibleBook[],
  bibleVerseCounts: Readonly<Record<string, number>>,
  bookCompletionCounts: Readonly<Record<string, number>>,
  bibleAchievements: readonly BibleReadingAchievement[],
): BibleReadingRoundProgress {
  let completedBibleRounds = 0;
  for (const achievement of bibleAchievements) {
    completedBibleRounds = Math.max(
      completedBibleRounds,
      achievement.completionCount,
    );
  }
  const targetCompletionCount = completedBibleRounds + 1;
  const completedVersesByBook: Record<string, number> = {};

  snapshot.completedVerseKeys.forEach((verseKey) => {
    const separatorIndex = verseKey.indexOf(":");
    if (separatorIndex < 1) return;
    const bookSlug = verseKey.slice(0, separatorIndex);
    completedVersesByBook[bookSlug] =
      (completedVersesByBook[bookSlug] ?? 0) + 1;
  });

  let totalVerses = 0;
  let remainingVerses = 0;
  let ready = books.length > 0;

  for (const book of books) {
    const bookTotalVerses = bibleVerseCounts[book.slug] ?? 0;
    if (bookTotalVerses < 1) {
      ready = false;
      continue;
    }

    totalVerses += bookTotalVerses;
    const bookCompletionCount = bookCompletionCounts[book.slug] ?? 0;
    if (bookCompletionCount >= targetCompletionCount) continue;

    const missingBookCompletions =
      targetCompletionCount - bookCompletionCount;
    const storedCompletedVerses = Math.min(
      completedVersesByBook[book.slug] ?? 0,
      bookTotalVerses,
    );
    const activeCompletedVerses =
      bookCompletionCount > 0 &&
      storedCompletedVerses === bookTotalVerses
        ? 0
        : storedCompletedVerses;

    remainingVerses +=
      missingBookCompletions * bookTotalVerses - activeCompletedVerses;
  }

  const boundedRemainingVerses = Math.min(
    Math.max(remainingVerses, 0),
    totalVerses,
  );
  const completedVerses = Math.max(
    totalVerses - boundedRemainingVerses,
    0,
  );
  const percentage =
    totalVerses > 0
      ? Math.min(100, Math.round((completedVerses / totalVerses) * 100))
      : 0;

  return {
    targetCompletionCount,
    completedVerses,
    remainingVerses: boundedRemainingVerses,
    totalVerses,
    percentage,
    ready: ready && totalVerses > 0,
  };
}
