import genesisData from "@/data/rnksv-genesis.json";

interface LocalBibleData {
  version: string;
  translation: string;
  bookSlug: string;
  bookName: string;
  copyrightNotice: string;
  chapters: string[][];
}

export interface LocalKoreanChapter {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verses: string[];
  translation: string;
  version: string;
}

const genesis = genesisData as LocalBibleData;

export const RNKSV_COPYRIGHT_NOTICE = genesis.copyrightNotice;

export function getLocalKoreanChapter(
  bookSlug: string,
  chapter: number,
): LocalKoreanChapter | null {
  if (
    bookSlug !== genesis.bookSlug ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > genesis.chapters.length
  ) {
    return null;
  }

  return {
    bookSlug: genesis.bookSlug,
    bookName: genesis.bookName,
    chapter,
    verses: genesis.chapters[chapter - 1],
    translation: genesis.translation,
    version: genesis.version,
  };
}

