"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DailyGoalSettings } from "@/components/DailyGoalSettings";
import { AffiliationSettings } from "@/components/AffiliationSettings";
import { NicknameSettings } from "@/components/NicknameSettings";
import { useUserNickname } from "@/components/useUserNickname";
import {
  isValidPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/credentials";
import {
  normalizeSessionVersion,
  setStoredSessionVersion,
} from "@/lib/auth/session-version";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15";

export function ProfileSettings() {
  const { user, username, loading, configured } = useAuth();
  const { nickname, displayName } = useUserNickname();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const initial = (displayName.trim().charAt(0) || "회").toUpperCase();

  const handlePasswordChange = async () => {
    setSucceeded(false);
    setMessage("");

    if (!currentPassword) {
      setMessage("현재 비밀번호를 입력해 주세요.");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setMessage(
        `새 비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    if (currentPassword === newPassword) {
      setMessage("현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) {
      setMessage("비밀번호 변경 설정을 확인해 주세요.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setMessage("로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/auth/password/change", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      message?: string;
      version?: unknown;
    } | null;
    setPending(false);

    if (!response.ok) {
      setMessage(
        data?.message ?? "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.",
      );
      return;
    }

    setStoredSessionVersion(
      user.id,
      normalizeSessionVersion(data?.version),
    );
    await supabase.auth.refreshSession();
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirmation("");
    setSucceeded(true);
    setMessage("비밀번호를 변경했습니다.");
  };

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
          프로필과 비밀번호를 관리하려면 로그인해 주세요.
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
          <p className="text-xs font-medium text-muted">
            {nickname ? "별명" : "아이디"}
          </p>
          <p className="mt-1 truncate font-semibold text-foreground">
            {displayName}
          </p>
          {nickname && username && (
            <p className="mt-0.5 truncate text-xs text-muted">
              아이디 {username}
            </p>
          )}
        </div>
        <Link
          href="/reading-history"
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-amber-700 hover:text-amber-800 dark:hover:text-amber-300"
        >
          기록 관리
        </Link>
      </section>

      <DailyGoalSettings />

      <NicknameSettings />

      <AffiliationSettings />

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <h2 className="font-semibold text-foreground">비밀번호 변경</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          안전한 변경을 위해 현재 비밀번호를 다시 확인합니다.
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePasswordChange();
          }}
        >
          <label
            htmlFor="profile-current-password"
            className="block text-sm font-semibold text-foreground"
          >
            현재 비밀번호
          </label>
          <input
            id="profile-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={fieldClassName}
          />

          <label
            htmlFor="profile-new-password"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            새 비밀번호
          </label>
          <input
            id="profile-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={`${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`}
            className={fieldClassName}
          />

          <label
            htmlFor="profile-new-password-confirmation"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            새 비밀번호 확인
          </label>
          <input
            id="profile-new-password-confirmation"
            name="newPasswordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={newPasswordConfirmation}
            onChange={(event) =>
              setNewPasswordConfirmation(event.target.value)
            }
            placeholder="새 비밀번호 다시 입력"
            className={fieldClassName}
          />

          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "변경하는 중…" : "비밀번호 변경"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${
              succeeded
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
            }`}
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
