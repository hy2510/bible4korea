"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getRecoveryQuestionLabel,
  isKnownRecoveryQuestionId,
  isValidPassword,
  isValidRecoveryAnswer,
  isValidUsername,
  normalizeUsername,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RECOVERY_QUESTIONS,
  toInternalAccountEmail,
  toSupabasePassword,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  type RecoveryQuestionId,
} from "@/lib/auth/credentials";
import { getSignInErrorMessage } from "@/lib/auth/login-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthView = "login" | "signup" | "recovery";
type RecoveryStep = "username" | "answer";
type MessageTone = "neutral" | "error" | "success";

interface ApiResult {
  message?: string;
  question?: string;
}

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15";
const primaryButtonClassName =
  "mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60";

async function requestJson(
  url: string,
  body: Record<string, string>,
): Promise<{ ok: boolean; data: ApiResult }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as ApiResult;
    return { ok: response.ok, data };
  } catch {
    return {
      ok: false,
      data: { message: "서버에 연결하지 못했습니다. 다시 시도해 주세요." },
    };
  }
}

export function UsernameAuth() {
  const router = useRouter();
  const { user, username: signedInUsername, loading, configured } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] =
    useState<RecoveryQuestionId>(RECOVERY_QUESTIONS[0].id);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [recoveryAnswerConfirmation, setRecoveryAnswerConfirmation] =
    useState("");
  const [recoveryStep, setRecoveryStep] =
    useState<RecoveryStep>("username");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral");

  const showMessage = (text: string, tone: MessageTone = "error") => {
    setMessage(text);
    setMessageTone(tone);
  };

  const changeView = (nextView: AuthView) => {
    setView(nextView);
    setPassword("");
    setPasswordConfirmation("");
    setRecoveryAnswer("");
    setRecoveryAnswerConfirmation("");
    setRecoveryStep("username");
    setMessage("");
  };

  const signIn = async (
    usernameValue: string,
    passwordValue: string,
  ): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      showMessage("로그인 설정이 아직 완료되지 않았습니다.");
      return false;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: toInternalAccountEmail(usernameValue),
      password: toSupabasePassword(passwordValue),
    });
    if (error) {
      showMessage(getSignInErrorMessage(error));
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    const normalizedUsername = normalizeUsername(username);
    if (
      !isValidUsername(normalizedUsername) ||
      !isValidPassword(password)
    ) {
      showMessage("아이디와 비밀번호를 확인해 주세요.");
      return;
    }

    setPending(true);
    setMessage("");
    const succeeded = await signIn(normalizedUsername, password);
    setPending(false);
    if (succeeded) {
      router.replace("/");
      router.refresh();
    }
  };

  const handleSignup = async () => {
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      showMessage(
        `아이디는 ${USERNAME_MIN_LENGTH}~${USERNAME_MAX_LENGTH}자의 영문, 숫자와 기호(., _, -)만 사용할 수 있으며 영문 또는 숫자로 시작해야 합니다.`,
      );
      return;
    }
    if (!isValidPassword(password)) {
      showMessage(
        `비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }
    if (password !== passwordConfirmation) {
      showMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    if (!isValidRecoveryAnswer(recoveryAnswer)) {
      showMessage("비밀번호 찾기 답변은 2자 이상 입력해 주세요.");
      return;
    }
    if (recoveryAnswer !== recoveryAnswerConfirmation) {
      showMessage("비밀번호 찾기 답변이 서로 일치하지 않습니다.");
      return;
    }

    setPending(true);
    setMessage("");
    const result = await requestJson("/api/auth/signup", {
      username: normalizedUsername,
      password,
      passwordConfirmation,
      recoveryQuestion,
      recoveryAnswer,
      recoveryAnswerConfirmation,
    });

    if (!result.ok) {
      setPending(false);
      showMessage(result.data.message ?? "회원가입하지 못했습니다.");
      return;
    }

    const signedIn = await signIn(normalizedUsername, password);
    setPending(false);
    if (signedIn) {
      router.replace("/");
      router.refresh();
    }
  };

  const handleFindQuestion = async () => {
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      showMessage("아이디를 확인해 주세요.");
      return;
    }

    setPending(true);
    setMessage("");
    const result = await requestJson("/api/auth/recovery/question", {
      username: normalizedUsername,
    });
    setPending(false);
    const question = result.data.question;

    if (!result.ok || !question || !isKnownRecoveryQuestionId(question)) {
      showMessage(
        result.data.message ?? "비밀번호 찾기 질문을 불러오지 못했습니다.",
      );
      return;
    }

    setUsername(normalizedUsername);
    setRecoveryQuestion(question);
    setRecoveryStep("answer");
  };

  const handleResetPassword = async () => {
    if (!isValidRecoveryAnswer(recoveryAnswer)) {
      showMessage("비밀번호 찾기 답변을 입력해 주세요.");
      return;
    }
    if (!isValidPassword(password)) {
      showMessage(
        `새 비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }
    if (password !== passwordConfirmation) {
      showMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setPending(true);
    setMessage("");
    const result = await requestJson("/api/auth/recovery/reset", {
      username,
      recoveryAnswer,
      password,
      passwordConfirmation,
    });
    setPending(false);

    if (!result.ok) {
      showMessage(result.data.message ?? "비밀번호를 변경하지 못했습니다.");
      return;
    }

    setView("login");
    setRecoveryStep("username");
    setRecoveryAnswer("");
    setRecoveryAnswerConfirmation("");
    setPassword("");
    setPasswordConfirmation("");
    showMessage(
      result.data.message ?? "새 비밀번호로 로그인해 주세요.",
      "success",
    );
  };

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        로그인 상태를 확인하고 있습니다.
      </p>
    );
  }

  if (user) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:px-8">
        <p className="text-sm text-muted">로그인되어 있습니다.</p>
        <p className="mt-2 font-semibold text-foreground">
          {signedInUsername ?? "회원"}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
        >
          홈으로 가기
        </Link>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center dark:border-amber-900/60 dark:bg-amber-950/25">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          로그인 준비가 필요합니다.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
          Supabase 연결 정보가 등록되면 회원가입과 로그인을 사용할 수 있습니다.
        </p>
      </div>
    );
  }

  const activeQuestionLabel = getRecoveryQuestionLabel(recoveryQuestion);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
      {view !== "recovery" && (
        <div
          role="tablist"
          aria-label="회원 인증 방식"
          className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-950/50"
        >
          {(["login", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={view === tab}
              onClick={() => changeView(tab)}
              className={`min-h-11 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                view === tab
                  ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              {tab === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>
      )}

      {view === "login" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <label
            htmlFor="login-username"
            className="block text-sm font-semibold text-foreground"
          >
            아이디
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            pattern="[A-Za-z0-9._-]+"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="아이디 입력"
            className={fieldClassName}
          />
          <label
            htmlFor="login-password"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            비밀번호
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호 입력"
            className={fieldClassName}
          />
          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClassName}
          >
            {pending ? "로그인 중…" : "로그인"}
          </button>
          <button
            type="button"
            onClick={() => changeView("recovery")}
            className="mt-3 min-h-10 w-full cursor-pointer text-sm text-muted transition-colors hover:text-foreground"
          >
            비밀번호 찾기
          </button>
        </form>
      )}

      {view === "signup" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignup();
          }}
        >
          <label
            htmlFor="signup-username"
            className="block text-sm font-semibold text-foreground"
          >
            아이디
          </label>
          <input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="username"
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            pattern="[A-Za-z0-9._-]+"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="영문, 숫자"
            className={fieldClassName}
          />
          <label
            htmlFor="signup-password"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            비밀번호
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`}
            className={fieldClassName}
          />
          <label
            htmlFor="signup-password-confirmation"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            비밀번호 확인
          </label>
          <input
            id="signup-password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            placeholder="비밀번호 다시 입력"
            className={fieldClassName}
          />
          <label
            htmlFor="signup-recovery-question"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            비밀번호 찾기 질문
          </label>
          <select
            id="signup-recovery-question"
            name="recoveryQuestion"
            required
            value={recoveryQuestion}
            onChange={(event) =>
              setRecoveryQuestion(event.target.value as RecoveryQuestionId)
            }
            className={fieldClassName}
          >
            {RECOVERY_QUESTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label
            htmlFor="signup-recovery-answer"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            답변
          </label>
          <input
            id="signup-recovery-answer"
            name="recoveryAnswer"
            type="text"
            autoComplete="off"
            required
            value={recoveryAnswer}
            onChange={(event) => setRecoveryAnswer(event.target.value)}
            placeholder="본인만 기억할 수 있는 답변"
            className={fieldClassName}
          />
          <label
            htmlFor="signup-recovery-answer-confirmation"
            className="mt-5 block text-sm font-semibold text-foreground"
          >
            답변 확인
          </label>
          <input
            id="signup-recovery-answer-confirmation"
            name="recoveryAnswerConfirmation"
            type="text"
            autoComplete="off"
            required
            value={recoveryAnswerConfirmation}
            onChange={(event) =>
              setRecoveryAnswerConfirmation(event.target.value)
            }
            placeholder="답변 다시 입력"
            className={fieldClassName}
          />
          <p className="mt-2 text-xs leading-relaxed text-muted">
            선택한 질문과 답변은 추후 변경이 어려우니 반드시 기억하거나 안전한
            곳에 메모해 두세요.
          </p>
          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClassName}
          >
            {pending ? "가입하는 중…" : "회원가입"}
          </button>
        </form>
      )}

      {view === "recovery" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (recoveryStep === "username") {
              void handleFindQuestion();
            } else {
              void handleResetPassword();
            }
          }}
        >
          <div className="mb-6">
            <h2 className="font-semibold text-foreground">비밀번호 찾기</h2>
            <p className="mt-1 text-sm text-muted">
              가입할 때 등록한 질문으로 본인을 확인합니다.
            </p>
          </div>

          {recoveryStep === "username" ? (
            <>
              <label
                htmlFor="recovery-username"
                className="block text-sm font-semibold text-foreground"
              >
                아이디
              </label>
              <input
                id="recovery-username"
                name="username"
                type="text"
                autoComplete="username"
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                pattern="[A-Za-z0-9._-]+"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="아이디 입력"
                className={fieldClassName}
              />
              <button
                type="submit"
                disabled={pending}
                className={primaryButtonClassName}
              >
                {pending ? "확인하는 중…" : "질문 확인"}
              </button>
            </>
          ) : (
            <>
              <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium leading-relaxed text-foreground dark:bg-stone-800">
                {activeQuestionLabel}
              </p>
              <label
                htmlFor="recovery-answer"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                답변
              </label>
              <input
                id="recovery-answer"
                name="recoveryAnswer"
                type="text"
                autoComplete="off"
                required
                value={recoveryAnswer}
                onChange={(event) => setRecoveryAnswer(event.target.value)}
                placeholder="가입할 때 입력한 답변"
                className={fieldClassName}
              />
              <label
                htmlFor="recovery-password"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                새 비밀번호
              </label>
              <input
                id="recovery-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`}
                className={fieldClassName}
              />
              <label
                htmlFor="recovery-password-confirmation"
                className="mt-5 block text-sm font-semibold text-foreground"
              >
                새 비밀번호 확인
              </label>
              <input
                id="recovery-password-confirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                placeholder="새 비밀번호 다시 입력"
                className={fieldClassName}
              />
              <button
                type="submit"
                disabled={pending}
                className={primaryButtonClassName}
              >
                {pending ? "변경하는 중…" : "비밀번호 변경"}
              </button>
            </>
          )}
        </form>
      )}

      {message && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${
            messageTone === "error"
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              : messageTone === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
