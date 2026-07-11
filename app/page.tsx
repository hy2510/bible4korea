import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeContent } from "@/components/HomeContent";
import { createPageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-stone-400">
          불러오는 중…
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
