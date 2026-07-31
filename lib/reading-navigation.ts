import { getBooksSync } from "@/lib/bible-books";
import {
  isPronunciationVerseCompleted,
  type PronunciationProgressSnapshot,
} from "@/lib/pronunciation-progress";

export interface BibleReadingPosition {
  bookSlug: string;
  chapter: number;
  verseNum: number;
}

const books = getBooksSync();
const firstBook = books[0];
const bookIndexBySlug = new Map(
  books.map((book, index) => [book.slug, index]),
);

function getFirstBiblePosition(): BibleReadingPosition {
  return {
    bookSlug: firstBook?.slug ?? "genesis",
    chapter: 1,
    verseNum: 1,
  };
}

function getPositionKey(position: BibleReadingPosition): string {
  return `${position.bookSlug}:${position.chapter}:${position.verseNum}`;
}

export function getNextBibleReadingPosition(
  snapshot: PronunciationProgressSnapshot,
  position: BibleReadingPosition,
): BibleReadingPosition {
  const bookIndex = bookIndexBySlug.get(position.bookSlug);
  if (bookIndex === undefined) return getFirstBiblePosition();

  const book = books[bookIndex];
  const totalVerses =
    snapshot.chapterVerseCounts[
      `${position.bookSlug}:${position.chapter}`
    ] ?? 0;

  if (totalVerses < 1 || position.verseNum < totalVerses) {
    return {
      ...position,
      verseNum: position.verseNum + 1,
    };
  }

  if (position.chapter < book.chapters) {
    return {
      bookSlug: book.slug,
      chapter: position.chapter + 1,
      verseNum: 1,
    };
  }

  const nextBook = books[(bookIndex + 1) % books.length];
  return nextBook
    ? {
        bookSlug: nextBook.slug,
        chapter: 1,
        verseNum: 1,
      }
    : getFirstBiblePosition();
}

export function getNextUnreadBibleReadingPosition(
  snapshot: PronunciationProgressSnapshot,
  position: BibleReadingPosition,
): BibleReadingPosition {
  if (
    !isPronunciationVerseCompleted(
      snapshot,
      position.bookSlug,
      position.chapter,
      position.verseNum,
    )
  ) {
    return position;
  }

  const startingPositionKey = getPositionKey(position);
  let candidate = getNextBibleReadingPosition(snapshot, position);

  for (
    let checkedPositionCount = 0;
    checkedPositionCount <= snapshot.completedVerseKeys.size;
    checkedPositionCount++
  ) {
    if (
      !isPronunciationVerseCompleted(
        snapshot,
        candidate.bookSlug,
        candidate.chapter,
        candidate.verseNum,
      )
    ) {
      return candidate;
    }

    if (getPositionKey(candidate) === startingPositionKey) {
      return candidate;
    }

    candidate = getNextBibleReadingPosition(snapshot, candidate);
  }

  return candidate;
}

export function getBiblePracticeHref(
  position: BibleReadingPosition,
): string {
  return `/read/${position.bookSlug}/${position.chapter}?practice=1#verse-${position.verseNum}`;
}
