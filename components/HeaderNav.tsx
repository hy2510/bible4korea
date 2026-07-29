"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { BibleSearchButton } from "@/components/BibleSearch";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import { useUserNickname } from "@/components/useUserNickname";

function navLinkClassName(active: boolean) {
  return `cursor-pointer rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
    active
      ? "bg-amber-800 text-white"
      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
  }`;
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
    </svg>
  );
}

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { displayName } = useUserNickname();
  const {
    achievedToday,
    loading: dailyGoalLoading,
    replayCelebration,
  } = useDailyGoal();
  const menuRef = useRef<HTMLDivElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const isBooks = pathname === "/books" || pathname.startsWith("/read/");
  const isLogin = pathname === "/login";
  const isProfile = pathname === "/profile";
  const initial = (displayName.trim().charAt(0) || "회").toUpperCase();

  useEffect(() => {
    if (!accountMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  const handleSignOut = async () => {
    setSignOutPending(true);
    const errorMessage = await signOut();
    setSignOutPending(false);
    if (!errorMessage) {
      setAccountMenuOpen(false);
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <nav className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Link href="/books" className={navLinkClassName(isBooks)}>
          성경
        </Link>
        <BibleSearchButton />
      </div>

      {loading ? (
        <span
          className="size-9 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800"
          aria-label="로그인 상태 확인 중"
        />
      ) : user ? (
        <div className="flex items-center gap-2">
          {!dailyGoalLoading && achievedToday && (
            <button
              type="button"
              aria-label="오늘의 일일 읽기 목표 달성 축하 다시 보기"
              title="목표 달성 축하 다시 보기"
              onClick={replayCelebration}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            >
              <Image
                src="/images/party-popper.png"
                alt=""
                aria-hidden
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </button>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label={`${displayName} 회원 메뉴`}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
              className={`flex size-9 cursor-pointer items-center justify-center rounded-full border text-sm font-bold transition-colors ${
                accountMenuOpen || isProfile
                  ? "border-amber-800 bg-amber-800 text-white"
                  : "border-amber-800/30 bg-amber-50 text-amber-900 hover:border-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
              }`}
            >
              {initial}
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                aria-label="회원 메뉴"
                className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
              >
                <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-2">
                  <span className="min-w-0 flex-1 truncate px-1 text-xs font-semibold text-muted">
                    {displayName}
                  </span>
                  <button
                    type="button"
                    role="menuitem"
                    aria-label="페이지 새로고침"
                    title="새로고침"
                    onClick={() => window.location.reload()}
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                  >
                    <RefreshIcon />
                  </button>
                </div>
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                >
                  마이 프로필
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  disabled={signOutPending}
                  onClick={() => void handleSignOut()}
                  className="block w-full cursor-pointer border-t border-border px-4 py-2.5 text-left text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  {signOutPending ? "로그아웃 중…" : "로그아웃"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          aria-disabled={loading}
          className={navLinkClassName(isLogin)}
        >
          로그인
        </Link>
      )}
    </nav>
  );
}
