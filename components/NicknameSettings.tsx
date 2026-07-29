"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/components/UserProfileProvider";
import { NICKNAME_MAX_LENGTH } from "@/lib/user-profile";

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15";

const resetLinkClassName =
  "mx-auto mt-3 flex cursor-pointer text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:cursor-wait disabled:opacity-60";

export function NicknameSettings() {
  const { settings, loading, saving, saveNickname } = useUserProfile();
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    setNickname(settings?.nickname ?? "");
  }, [settings?.nickname]);

  const handleSave = async () => {
    setMessage("");
    setSucceeded(false);

    const result = await saveNickname(nickname);
    setSucceeded(result.ok);
    setMessage(result.message);
  };

  const handleReset = async () => {
    setMessage("");
    setSucceeded(false);

    const result = await saveNickname("");
    if (result.ok) setNickname("");
    setSucceeded(result.ok);
    setMessage(result.message);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-center text-sm text-muted">
          별명 정보를 불러오고 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
      <h2 className="font-semibold text-foreground">별명</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        별명을 설정하시면 말씀 읽기 순위 등에서 아이디 대신 표시됩니다. 미설정
        시 아이디로 표시됩니다.
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <label
          htmlFor="profile-nickname"
          className="block text-sm font-semibold text-foreground"
        >
          별명
        </label>
        <input
          id="profile-nickname"
          name="nickname"
          type="text"
          autoComplete="nickname"
          maxLength={NICKNAME_MAX_LENGTH}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="예: 은혜"
          className={fieldClassName}
        />

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "저장하는 중…" : settings?.nickname ? "변경" : "저장"}
        </button>

        {settings?.nickname && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleReset()}
            className={resetLinkClassName}
          >
            초기화
          </button>
        )}
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
  );
}
