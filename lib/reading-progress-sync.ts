import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePronunciationProgress,
  type PronunciationProgressSnapshot,
  type SerializedPronunciationProgress,
} from "@/lib/pronunciation-progress";
import type { Database } from "@/lib/supabase/database.types";

const MUTATION_BATCH_SIZE = 200;
const UNKNOWN_COMPLETION_DATE = "1970-01-01";
const UNKNOWN_COMPLETION_AT = "1970-01-01T00:00:00.000Z";

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function fetchNormalizedPronunciationProgress(
  supabase: SupabaseClient<Database>,
): Promise<PronunciationProgressSnapshot> {
  const { data, error } = await supabase.rpc(
    "get_my_normalized_reading_progress",
  );
  if (error) throw error;
  const progress = data?.[0];

  return normalizePronunciationProgress({
    completedVerseKeys: progress?.completed_verse_keys ?? [],
    chapterVerseCounts: progress?.chapter_verse_counts ?? {},
    completedVerseDetails: progress?.completed_verse_details ?? {},
  });
}

function parseVerseKey(verseKey: string) {
  const [bookSlug, chapterText, verseText, ...rest] = verseKey.split(":");
  const chapter = Number(chapterText);
  const verseNum = Number(verseText);
  if (
    rest.length > 0 ||
    !bookSlug ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    !Number.isInteger(verseNum) ||
    verseNum < 1
  ) {
    return null;
  }
  return { bookSlug, chapter, verseNum };
}

function parseChapterKey(chapterKey: string) {
  const [bookSlug, chapterText, ...rest] = chapterKey.split(":");
  const chapter = Number(chapterText);
  if (
    rest.length > 0 ||
    !bookSlug ||
    !Number.isInteger(chapter) ||
    chapter < 1
  ) {
    return null;
  }
  return { bookSlug, chapter };
}

function completionChanged(
  previous: PronunciationProgressSnapshot,
  next: PronunciationProgressSnapshot,
  verseKey: string,
): boolean {
  if (!previous.completedVerseKeys.has(verseKey)) return true;
  const previousDetail = previous.completedVerseDetails[verseKey];
  const nextDetail = next.completedVerseDetails[verseKey];
  return (
    previousDetail?.completedAt !== nextDetail?.completedAt ||
    previousDetail?.completedDate !== nextDetail?.completedDate
  );
}

function toSnapshot(
  value: PronunciationProgressSnapshot | SerializedPronunciationProgress,
): PronunciationProgressSnapshot {
  return Array.isArray(value.completedVerseKeys)
    ? normalizePronunciationProgress(value)
    : (value as PronunciationProgressSnapshot);
}

export async function syncNormalizedPronunciationProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  previousValue: PronunciationProgressSnapshot | SerializedPronunciationProgress,
  nextValue: PronunciationProgressSnapshot | SerializedPronunciationProgress,
): Promise<void> {
  const previous = toSnapshot(previousValue);
  const next = toSnapshot(nextValue);

  const removedVerseKeys = Array.from(previous.completedVerseKeys).filter(
    (verseKey) => !next.completedVerseKeys.has(verseKey),
  );
  const changedCompletionRows = Array.from(next.completedVerseKeys).flatMap(
    (verseKey) => {
      if (!completionChanged(previous, next, verseKey)) return [];
      const parsed = parseVerseKey(verseKey);
      if (!parsed) return [];
      const detail = next.completedVerseDetails[verseKey];
      return [
        {
          user_id: userId,
          verse_key: verseKey,
          book_slug: parsed.bookSlug,
          chapter: parsed.chapter,
          verse_num: parsed.verseNum,
          completed_at: detail?.completedAt ?? UNKNOWN_COMPLETION_AT,
          completed_date: detail?.completedDate ?? UNKNOWN_COMPLETION_DATE,
        },
      ];
    },
  );

  for (const batch of chunks(removedVerseKeys, MUTATION_BATCH_SIZE)) {
    const { error } = await supabase
      .from("user_verse_completions")
      .delete()
      .eq("user_id", userId)
      .in("verse_key", batch);
    if (error) throw error;
  }

  for (const batch of chunks(changedCompletionRows, MUTATION_BATCH_SIZE)) {
    const { error } = await supabase
      .from("user_verse_completions")
      .upsert(batch, { onConflict: "user_id,verse_key" });
    if (error) throw error;
  }

  const removedChapterKeys = Object.keys(
    previous.chapterVerseCounts,
  ).filter((chapterKey) => !(chapterKey in next.chapterVerseCounts));
  const changedChapterRows = Object.entries(
    next.chapterVerseCounts,
  ).flatMap(([chapterKey, totalVerses]) => {
    if (previous.chapterVerseCounts[chapterKey] === totalVerses) return [];
    const parsed = parseChapterKey(chapterKey);
    if (!parsed) return [];
    return [
      {
        user_id: userId,
        chapter_key: chapterKey,
        book_slug: parsed.bookSlug,
        chapter: parsed.chapter,
        total_verses: totalVerses,
        updated_at: new Date().toISOString(),
      },
    ];
  });

  for (const batch of chunks(removedChapterKeys, MUTATION_BATCH_SIZE)) {
    const { error } = await supabase
      .from("user_reading_chapters")
      .delete()
      .eq("user_id", userId)
      .in("chapter_key", batch);
    if (error) throw error;
  }

  for (const batch of chunks(changedChapterRows, MUTATION_BATCH_SIZE)) {
    const { error } = await supabase
      .from("user_reading_chapters")
      .upsert(batch, { onConflict: "user_id,chapter_key" });
    if (error) throw error;
  }
}
