"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProfileFriends } from "@/components/ProfileFriends";

export function FriendsPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/about");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div
        className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-stone-400"
        aria-label="로그인 상태 확인 중"
      >
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7">
        <h1 className="font-serif text-2xl font-bold text-foreground">
          내 친구
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          친구를 찾고 서로의 말씀 읽기 활동을 확인합니다.
        </p>
      </div>

      <ProfileFriends />
    </div>
  );
}
