"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  isValidPassword,
  isValidRecoveryCode,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RECOVERY_CODE_LENGTH,
} from "@/lib/auth/credentials";
import {
  normalizeSessionVersion,
  setStoredSessionVersion,
} from "@/lib/auth/session-version";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ProfileSecurityMode = "password" | "recovery";

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15";

interface ProfileSecurityModalProps {
  mode: ProfileSecurityMode;
  onClose: () => void;
}

export function ProfileSecurityModal({
  mode,
  onClose,
}: ProfileSecurityModalProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] =
    useState("");
  const [currentRecoveryCode, setCurrentRecoveryCode] = useState("");
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, pending]);

  const changePassword = async () => {
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

    setPending(true);
    try {
      const response = await authenticatedFetch(
        "/api/auth/password/change",
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        version?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(
          data?.message ??
            "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.",
        );
      }

      const supabase = getSupabaseBrowserClient();
      if (user) {
        setStoredSessionVersion(
          user.id,
          normalizeSessionVersion(data?.version),
        );
      }
      await supabase?.auth.refreshSession();

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setSucceeded(true);
      setMessage("비밀번호를 변경했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setPending(false);
    }
  };

  const changeRecoveryCode = async () => {
    setSucceeded(false);
    setMessage("");

    if (!isValidRecoveryCode(currentRecoveryCode)) {
      setMessage(
        `현재 복구 코드는 숫자 ${RECOVERY_CODE_LENGTH}자리로 입력해 주세요.`,
      );
      return;
    }
    if (!isValidRecoveryCode(newRecoveryCode)) {
      setMessage(
        `변경할 복구 코드는 숫자 ${RECOVERY_CODE_LENGTH}자리로 입력해 주세요.`,
      );
      return;
    }
    if (currentRecoveryCode === newRecoveryCode) {
      setMessage("현재 복구 코드와 다른 코드를 입력해 주세요.");
      return;
    }

    setPending(true);
    try {
      const response = await authenticatedFetch(
        "/api/auth/recovery/code",
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentRecoveryCode,
            newRecoveryCode,
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(
          data?.message ??
            "복구 코드를 변경하지 못했습니다. 다시 시도해 주세요.",
        );
      }

      setCurrentRecoveryCode("");
      setNewRecoveryCode("");
      setSucceeded(true);
      setMessage(data?.message ?? "복구 코드를 변경했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "복구 코드를 변경하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setPending(false);
    }
  };

  if (typeof document === "undefined") return null;

  const isPasswordMode = mode === "password";
  const title = isPasswordMode ? "비밀번호 변경" : "복구 코드 변경";

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !pending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-security-modal-title"
        className="max-h-[min(90vh,42rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2
            id="profile-security-modal-title"
            className="min-w-0 flex-1 font-semibold text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            aria-label={`${title} 닫기`}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-wait disabled:opacity-60"
          >
            ×
          </button>
        </div>

        <form
          className="p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void (isPasswordMode
              ? changePassword()
              : changeRecoveryCode());
          }}
        >
          {isPasswordMode ? (
            <>
              <p className="mb-5 text-sm leading-6 text-muted">
                안전한 변경을 위해 현재 비밀번호를 다시 확인합니다.
              </p>
              <label
                htmlFor="security-current-password"
                className="block text-sm font-semibold text-foreground"
              >
                현재 비밀번호
              </label>
              <input
                id="security-current-password"
                type="password"
                autoComplete="current-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                autoFocus
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                className={fieldClassName}
              />

              <label
                htmlFor="security-new-password"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                새 비밀번호
              </label>
              <input
                id="security-new-password"
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
                htmlFor="security-new-password-confirmation"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                새 비밀번호 확인
              </label>
              <input
                id="security-new-password-confirmation"
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
            </>
          ) : (
            <>
              <p className="mb-5 text-sm leading-6 text-muted">
                복구 코드를 분실하면 비밀번호를 찾을 수 없습니다. 변경한 코드는
                반드시 기억하거나 안전한 곳에 메모해 두세요.
              </p>
              <label
                htmlFor="security-current-recovery-code"
                className="block text-sm font-semibold text-foreground"
              >
                현재 복구 코드
              </label>
              <input
                id="security-current-recovery-code"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                pattern={`[0-9]{${RECOVERY_CODE_LENGTH}}`}
                maxLength={RECOVERY_CODE_LENGTH}
                required
                autoFocus
                value={currentRecoveryCode}
                onChange={(event) =>
                  setCurrentRecoveryCode(
                    event.target.value.replace(/\D/g, ""),
                  )
                }
                placeholder={`숫자 ${RECOVERY_CODE_LENGTH}자리`}
                className={fieldClassName}
              />

              <label
                htmlFor="security-new-recovery-code"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                변경할 복구 코드
              </label>
              <input
                id="security-new-recovery-code"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                pattern={`[0-9]{${RECOVERY_CODE_LENGTH}}`}
                maxLength={RECOVERY_CODE_LENGTH}
                required
                value={newRecoveryCode}
                onChange={(event) =>
                  setNewRecoveryCode(
                    event.target.value.replace(/\D/g, ""),
                  )
                }
                placeholder={`숫자 ${RECOVERY_CODE_LENGTH}자리`}
                className={fieldClassName}
              />
            </>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "변경하는 중…" : title}
          </button>

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
        </form>
      </section>
    </div>,
    document.body,
  );
}
