import booksData from "@/data/books.json";
import type { BibleBook } from "@/lib/bible-types";

const books = booksData as BibleBook[];

export function getBooksSync(): BibleBook[] {
  return books;
}

export function getBookSync(slug: string): BibleBook | undefined {
  const decoded = decodeURIComponent(slug);
  return books.find(
    (book) =>
      book.slug === decoded ||
      book.koSlug === decoded ||
      book.name === decoded,
  );
}

export function resolveBookSlugSync(slug: string): string | undefined {
  return getBookSync(slug)?.slug;
}
