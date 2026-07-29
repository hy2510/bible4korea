"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PronunciationSkipWord } from "@/lib/pronunciation-skip-words";

interface AdminPronunciationManagerProps {
  authenticated: boolean;
  initialItems?: PronunciationSkipWord[];
  initialError?: string;
}

function readResponseMessage(
  value: unknown,
  fallback: string,
): string {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return fallback;
}

export function AdminPronunciationManager({
  authenticated,
  initialItems = [],
  initialError = "",
}: AdminPronunciationManagerProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        setMessage(
          readResponseMessage(data, "관리자 로그인에 실패했습니다."),
        );
        return;
      }

      setPassword("");
      router.refresh();
    } catch {
      setMessage("관리자 로그인 서버에 연결하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPhrase = phrase.trim();
    if (!nextPhrase) return;

    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/pronunciation-skips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: nextPhrase }),
      });
      const data = (await response.json().catch(() => null)) as
        | { item?: PronunciationSkipWord; message?: string }
        | null;

      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (!response.ok || !data?.item) {
        setMessage(
          readResponseMessage(data, "제외 단어를 저장하지 못했습니다."),
        );
        return;
      }

      const addedItem = data.item;
      setItems((current) => [...current, addedItem]);
      setPhrase("");
      setMessage("발음 평가 제외 단어를 등록했습니다.");
    } catch {
      setMessage("제외 단어 저장 서버에 연결하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (item: PronunciationSkipWord) => {
    const confirmed = window.confirm(
      `"${item.phrase}"을(를) 발음 평가 제외 목록에서 삭제하시겠습니까?`,
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/pronunciation-skips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = (await response.json().catch(() => null)) as unknown;

      if (response.status === 401) {
        router.refresh();
        return;
      }
      if (!response.ok) {
        setMessage(
          readResponseMessage(data, "제외 단어를 삭제하지 못했습니다."),
        );
        return;
      }

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      setMessage("발음 평가 제외 단어를 삭제했습니다.");
    } catch {
      setMessage("제외 단어 삭제 서버에 연결하지 못했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    setPending(true);
    setMessage("");

    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.refresh();
    } catch {
      setMessage("관리자 로그아웃에 실패했습니다.");
    } finally {
      setPending(false);
    }
  };

  if (!authenticated) {
    return (
      <form
        onSubmit={handleLogin}
        className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="admin-username"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              관리자 아이디
            </label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-shadow focus:border-amber-600 focus:ring-4 focus:ring-amber-700/10"
            />
          </div>
          <div>
            <label
              htmlFor="admin-password"
              className="mb-1.5 block text-sm font-semibold text-foreground"
            >
              비밀번호
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-shadow focus:border-amber-600 focus:ring-4 focus:ring-amber-700/10"
            />
          </div>
        </div>

        {message && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "로그인 중…" : "관리자 로그인"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-foreground">
              평가 제외 단어 등록
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              등록한 단어나 문구는 성경 본문과 음성 인식 결과 양쪽에서
              제외한 뒤 일치율을 계산합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={pending}
            className="shrink-0 cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            로그아웃
          </button>
        </div>

        <form onSubmit={handleAdd} className="mt-5 flex gap-2">
          <label htmlFor="pronunciation-skip-phrase" className="sr-only">
            제외할 단어나 문구
          </label>
          <input
            id="pronunciation-skip-phrase"
            type="text"
            maxLength={50}
            required
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder="예: 셀라"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-amber-600 focus:ring-4 focus:ring-amber-700/10"
          />
          <button
            type="submit"
            disabled={pending || !phrase.trim()}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            추가
          </button>
        </form>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-foreground"
          >
            {message}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-serif text-lg font-bold text-foreground">
            등록된 제외 단어
          </h2>
          <p className="mt-1 text-xs text-muted">총 {items.length}개</p>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            등록된 제외 단어가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <span className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                  {item.phrase}
                </span>
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={() => void handleDelete(item)}
                  className="shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  {deletingId === item.id ? "삭제 중…" : "삭제"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
