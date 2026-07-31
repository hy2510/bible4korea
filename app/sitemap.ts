import type { MetadataRoute } from "next";
import { getBooksSync } from "@/lib/bible-books";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const books = getBooksSync();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/books`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/licenses`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const chapterPages: MetadataRoute.Sitemap = books.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, index) => ({
      url: `${baseUrl}/read/${book.slug}/${index + 1}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return [...staticPages, ...chapterPages];
}
