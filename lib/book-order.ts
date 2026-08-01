import type { BibleBook } from "@/lib/bible-types";

export interface TanakhSection {
  id: "torah" | "neviim" | "ketuvim";
  title: string;
  subtitle: string;
  slugs: string[];
}

export const TANAKH_SECTIONS: TanakhSection[] = [
  {
    id: "torah",
    title: "토라",
    subtitle: "율법 5권",
    slugs: [
      "genesis",
      "exodus",
      "leviticus",
      "numbers",
      "deuteronomy",
    ],
  },
  {
    id: "neviim",
    title: "네비임",
    subtitle: "예언서 21권",
    slugs: [
      "joshua",
      "judges",
      "1-samuel",
      "2-samuel",
      "1-kings",
      "2-kings",
      "isaiah",
      "jeremiah",
      "ezekiel",
      "hosea",
      "joel",
      "amos",
      "obadiah",
      "jonah",
      "micah",
      "nahum",
      "habakkuk",
      "zephaniah",
      "haggai",
      "zechariah",
      "malachi",
    ],
  },
  {
    id: "ketuvim",
    title: "케투빔",
    subtitle: "성문서 13권",
    slugs: [
      "psalms",
      "proverbs",
      "job",
      "song-of-solomon",
      "ruth",
      "lamentations",
      "ecclesiastes",
      "esther",
      "daniel",
      "ezra",
      "nehemiah",
      "1-chronicles",
      "2-chronicles",
    ],
  },
];

const TANAKH_SLUG_ORDER = TANAKH_SECTIONS.flatMap((section) => section.slugs);

const tanakhSlugIndex = new Map(
  TANAKH_SLUG_ORDER.map((slug, index) => [slug, index]),
);

export function sortOldTestamentByTanakh(books: BibleBook[]): BibleBook[] {
  return [...books].sort((a, b) => {
    const aIndex = tanakhSlugIndex.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = tanakhSlugIndex.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

export function groupOldTestamentByTanakh(
  books: BibleBook[],
): { section: TanakhSection; books: BibleBook[] }[] {
  const bookBySlug = new Map(books.map((book) => [book.slug, book]));

  return TANAKH_SECTIONS.map((section) => ({
    section,
    books: section.slugs
      .map((slug) => bookBySlug.get(slug))
      .filter((book): book is BibleBook => Boolean(book)),
  }));
}

export interface NewTestamentSection {
  id: "gospels" | "history" | "pauline" | "general" | "prophecy";
  title: string;
  subtitle: string;
  slugs: string[];
}

export const NEW_TESTAMENT_SECTIONS: NewTestamentSection[] = [
  {
    id: "gospels",
    title: "복음서",
    subtitle: "4권",
    slugs: ["matthew", "mark", "luke", "john"],
  },
  {
    id: "history",
    title: "역사서",
    subtitle: "1권",
    slugs: ["acts"],
  },
  {
    id: "pauline",
    title: "바울서신",
    subtitle: "13권",
    slugs: [
      "romans",
      "1-corinthians",
      "2-corinthians",
      "galatians",
      "ephesians",
      "philippians",
      "colossians",
      "1-thessalonians",
      "2-thessalonians",
      "1-timothy",
      "2-timothy",
      "titus",
      "philemon",
    ],
  },
  {
    id: "general",
    title: "공동서신",
    subtitle: "8권",
    slugs: [
      "hebrews",
      "james",
      "1-peter",
      "2-peter",
      "1-john",
      "2-john",
      "3-john",
      "jude",
    ],
  },
  {
    id: "prophecy",
    title: "예언서",
    subtitle: "1권",
    slugs: ["revelation"],
  },
];

/** 성경 목록 UI(타나크 + 신약 분류)와 동일한 권 순서 */
export const BIBLE_LIST_SLUG_ORDER = [
  ...TANAKH_SLUG_ORDER,
  ...NEW_TESTAMENT_SECTIONS.flatMap((section) => section.slugs),
];

const bibleListSlugIndex = new Map(
  BIBLE_LIST_SLUG_ORDER.map((slug, index) => [slug, index]),
);

export function compareBibleListOrder(aSlug: string, bSlug: string): number {
  const aIndex = bibleListSlugIndex.get(aSlug) ?? Number.MAX_SAFE_INTEGER;
  const bIndex = bibleListSlugIndex.get(bSlug) ?? Number.MAX_SAFE_INTEGER;
  return aIndex - bIndex;
}

export function groupNewTestamentBySection(
  books: BibleBook[],
): { section: NewTestamentSection; books: BibleBook[] }[] {
  const bookBySlug = new Map(books.map((book) => [book.slug, book]));

  return NEW_TESTAMENT_SECTIONS.map((section) => ({
    section,
    books: section.slugs
      .map((slug) => bookBySlug.get(slug))
      .filter((book): book is BibleBook => Boolean(book)),
  }));
}
