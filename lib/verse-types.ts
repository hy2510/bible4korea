export interface VerseWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

export interface ChapterVerse {
  verseNum: number;
  korean: string;
  hebrewWords?: VerseWord[];
  greekWords?: VerseWord[];
}
