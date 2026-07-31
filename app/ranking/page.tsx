import type { Metadata } from "next";
import { RankingPageContent } from "@/components/RankingPageContent";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "내 모임",
    description: "같은 모임의 활동을 확인하고 모임 정보를 관리합니다.",
    path: "/ranking",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function RankingPage() {
  return <RankingPageContent />;
}
