"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DailyGoalSettings } from "@/components/DailyGoalSettings";
import { ProfileReadingActivity } from "@/components/ProfileReadingActivity";
import {
  ProfileSecurityModal,
  type ProfileSecurityMode,
} from "@/components/ProfileSecurityModal";
import { useUserNickname } from "@/components/useUserNickname";

const securityButtonClassName =
  "cursor-pointer text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:hover:text-amber-300";

export function ProfileSettings() {
  const { user, username, loading, configured } = useAuth();
  const { displayName } = useUserNickname();
  const [securityMode, setSecurityMode] =
    useState<ProfileSecurityMode | null>(null);
  const initial = (displayName.trim().charAt(0) || "회").toUpperCase();

  if (loading) {
    return (
      <p className="rounded-xl border border-border bg-surface-muted px-4 py-5 text-center text-sm text-muted">
        로그인 상태를 확인하고 있습니다.
      </p>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center sm:px-8">
        <p className="text-sm leading-relaxed text-muted">
          프로필과 계정 정보를 관리하려면 로그인해 주세요.
        </p>
        {configured && (
          <Link
            href="/login"
            className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
          >
            로그인
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-5 sm:gap-4 sm:px-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-800 text-lg font-bold text-white">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">
            {displayName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href="/reading-history"
              className={securityButtonClassName}
            >
              기록 관리
            </Link>
            <span aria-hidden className="text-xs text-border">
              ·
            </span>
            <button
              type="button"
              onClick={() => setSecurityMode("password")}
              className={securityButtonClassName}
            >
              비밀번호 변경
            </button>
            <span aria-hidden className="text-xs text-border">
              ·
            </span>
            <button
              type="button"
              onClick={() => setSecurityMode("recovery")}
              className={securityButtonClassName}
            >
              복구 코드 변경
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          {username && <ProfileReadingActivity username={username} />}
        </div>

        <div className="space-y-6">
          <DailyGoalSettings />
        </div>
      </div>

      {securityMode && (
        <ProfileSecurityModal
          key={securityMode}
          mode={securityMode}
          onClose={() => setSecurityMode(null)}
        />
      )}
    </div>
  );
}
