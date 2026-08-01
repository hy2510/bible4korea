export interface VerseWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

export interface HebrewVerseGroup {
  verseNum: number;
  words: VerseWord[];
}

export interface GreekVerseGroup {
  verseNum: number;
  words: VerseWord[];
}

export interface ChapterVerse {
  verseNum: number;
  korean: string;
  hebrewWords?: VerseWord[];
  hebrewWordGroups?: HebrewVerseGroup[];
  greekWords?: VerseWord[];
  greekWordGroups?: GreekVerseGroup[];
}
