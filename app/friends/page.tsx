import type { Metadata } from "next";
import { FriendsPageContent } from "@/components/FriendsPageContent";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "내 친구",
    description: "친구를 찾고 친구의 말씀 읽기 활동을 확인합니다.",
    path: "/friends",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function FriendsPage() {
  return <FriendsPageContent />;
}
