import { getSiteJsonLd } from "@/lib/seo";

export function SiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(getSiteJsonLd()) }}
    />
  );
}
