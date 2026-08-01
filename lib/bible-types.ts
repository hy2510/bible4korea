export type Testament = "old" | "new";

export interface BibleBook {
  id: number;
  name: string;
  slug: string;
  koSlug: string;
  abbrev: string;
  chapters: number;
  testament: Testament;
  category: string;
}

export interface Chapter {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verses: string[];
  translation?: string;
  version?: string;
}

export interface VerseWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

export type HebrewWord = VerseWord;
export type GreekWord = VerseWord;

export interface ParallelChapter extends Chapter {
  hebrewWordVerses: HebrewWord[][] | null;
  greekWordVerses: GreekWord[][] | null;
}
