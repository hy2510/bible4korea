"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface AboutHeroActionsProps {
  variant?: "hero" | "closing";
}

export function AboutHeroActions({
  variant = "hero",
}: AboutHeroActionsProps) {
  const { user, loading } = useAuth();
  const isClosing = variant === "closing";
  const wrapperClassName = isClosing
    ? "mx-auto mt-6 flex w-full justify-center"
    : "mt-8 flex flex-wrap gap-3";
  const buttonClassName = isClosing
    ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-800 px-5 text-sm font-bold text-white transition-colors hover:bg-amber-900 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
    : "inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-900";

  if (loading) {
    return (
      <div className={wrapperClassName} aria-label="로그인 상태 확인 중">
        <span
          aria-hidden
          className={`h-11 w-40 animate-pulse rounded-xl ${
            isClosing
              ? "bg-amber-800/20 dark:bg-amber-400/30"
              : "bg-amber-800/20 dark:bg-amber-400/15"
          }`}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <Link href={user ? "/books" : "/login"} className={buttonClassName}>
        {user ? "성경 목차 보기" : "로그인 / 회원 가입"}
      </Link>
    </div>
  );
}
