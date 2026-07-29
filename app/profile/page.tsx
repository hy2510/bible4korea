import type { Metadata } from "next";
import { ProfileSettings } from "@/components/ProfileSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "프로필",
    description: "회원 정보와 일일 읽기 목표를 관리합니다.",
    path: "/profile",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-serif text-2xl font-bold text-foreground">프로필</h1>
      <p className="mt-3 mb-7 text-sm leading-relaxed text-muted">
        계정 정보와 일일 읽기 목표를 관리할 수 있습니다.
      </p>
      <ProfileSettings />
    </div>
  );
}
