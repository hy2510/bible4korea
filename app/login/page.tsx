import type { Metadata } from "next";
import { UsernameAuth } from "@/components/UsernameAuth";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "로그인",
    description:
      "아이디와 비밀번호로 로그인하고 말씀 기록을 안전하게 동기화합니다.",
    path: "/login",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-serif text-2xl font-bold text-foreground">
        회원 로그인
      </h1>
      <p className="mt-3 mb-7 text-sm leading-relaxed text-muted">
        아이디로 로그인하면 최근 본 말씀과 소리 내어 읽은 기록을 안전하게
        저장하고 동기화합니다.
      </p>
      <UsernameAuth />
    </div>
  );
}
