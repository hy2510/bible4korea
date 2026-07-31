"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  evaluatePronunciation,
  getPronunciationCharacterCount,
  normalizePronunciationText,
  type PronunciationEvaluation,
} from "@/lib/pronunciation-match";
import { DailyGoalProgressBar } from "@/components/DailyGoalProgressBar";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import { MicrophoneIcon } from "@/components/PronunciationIcons";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

type SpeechWindow = typeof window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

interface VersePronunciationPracticeProps {
  bookName: string;
  chapter: number;
  verseNum: number;
  text: string;
  onCharacterProgressChange: (characterCount: number | null) => void;
  onCompletionChange: (completed: boolean) => void;
  onClose: () => void;
  hasNextVerse: boolean;
  onNextVerse: () => void;
  hasNextChapter: boolean;
  onNextChapter: () => void;
  autoStart: boolean;
  onAutoStartHandled: () => void;
}

type RecognitionStatus = "idle" | "listening";
type SupportStatus = "checking" | "supported" | "unsupported";
type RecognitionStallPrompt = "retry" | "finish" | null;

const ERROR_MESSAGES: Record<string, string> = {
  "audio-capture": "마이크를 찾을 수 없습니다. 기기 설정을 확인해 주세요.",
  "not-allowed": "마이크 사용이 허용되지 않았습니다. 브라우저 설정에서 권한을 허용해 주세요.",
  "service-not-allowed":
    "음성 인식 사용이 차단되어 있습니다. 브라우저 설정을 확인해 주세요.",
  network: "음성 인식 서비스에 연결하지 못했습니다. 연결 상태를 확인해 주세요.",
  "no-speech": "목소리가 들리지 않았습니다. 마이크 가까이에서 다시 읽어 주세요.",
};
const SKIP_WORD_CACHE_DURATION_MS = 30_000;
const RECOGNITION_STALL_TIMEOUT_MS = 5_000;
const RECOGNITION_RESTART_DELAY_MS = 200;

let cachedSkipWords:
  | {
      words: string[];
      expiresAt: number;
    }
  | undefined;
let pendingSkipWords: Promise<string[]> | undefined;

async function loadPronunciationSkipWords(): Promise<string[]> {
  if (cachedSkipWords && cachedSkipWords.expiresAt > Date.now()) {
    return cachedSkipWords.words;
  }
  if (pendingSkipWords) return pendingSkipWords;

  pendingSkipWords = fetch("/api/pronunciation-skips", {
    cache: "no-store",
  })
    .then(async (response) => {
      const data = (await response.json().catch(() => null)) as
        | { words?: unknown }
        | null;
      if (!response.ok || !Array.isArray(data?.words)) return [];

      return data.words.filter(
        (word): word is string => typeof word === "string",
      );
    })
    .catch(() => [])
    .then((words) => {
      cachedSkipWords = {
        words,
        expiresAt: Date.now() + SKIP_WORD_CACHE_DURATION_MS,
      };
      return words;
    })
    .finally(() => {
      pendingSkipWords = undefined;
    });

  return pendingSkipWords;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function isAndroidSpeechRecognitionClient(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent)
  );
}

function joinRecognitionTranscripts(...transcripts: string[]): string {
  return transcripts.filter(Boolean).join(" ").trim();
}

function subscribeToSpeechRecognitionSupport() {
  return () => {};
}

function getSpeechRecognitionSupportSnapshot(): SupportStatus {
  return getSpeechRecognitionConstructor() ? "supported" : "unsupported";
}

function getServerSpeechRecognitionSupportSnapshot(): SupportStatus {
  return "checking";
}

function getPronunciationStarRating(score: number) {
  if (score >= 70) return 3;
  if (score >= 50) return 2;
  if (score >= 30) return 1;
  return 0;
}

function RoundedStarIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="-mx-1 size-8"
    >
      <path d="m12 3.4 2.42 4.9 5.41.79-3.91 3.81.92 5.39L12 15.76l-4.84 2.55.92-5.39-3.91-3.81 5.41-.79L12 3.4Z" />
    </svg>
  );
}

export function VersePronunciationPractice({
  bookName,
  chapter,
  verseNum,
  text,
  onCharacterProgressChange,
  onCompletionChange,
  onClose,
  hasNextVerse,
  onNextVerse,
  hasNextChapter,
  onNextChapter,
  autoStart,
  onAutoStartHandled,
}: VersePronunciationPracticeProps) {
  const {
    target: dailyGoalTarget,
    todayCount: dailyGoalTodayCount,
    achievedToday: dailyGoalAchievedToday,
    loading: dailyGoalLoading,
  } = useDailyGoal();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const consecutiveFailureCountRef = useRef(0);
  const recognitionStallTimeoutRef = useRef<number | null>(null);
  const recognitionRestartTimeoutRef = useRef<number | null>(null);
  const recognitionStallCountRef = useRef(0);
  const manualStopRequestedRef = useRef(false);
  const supportStatus = useSyncExternalStore(
    subscribeToSpeechRecognitionSupport,
    getSpeechRecognitionSupportSnapshot,
    getServerSpeechRecognitionSupportSnapshot,
  );
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [evaluation, setEvaluation] =
    useState<PronunciationEvaluation | null>(null);
  const [consecutiveFailureCount, setConsecutiveFailureCount] = useState(0);
  const [recognitionStallPrompt, setRecognitionStallPrompt] =
    useState<RecognitionStallPrompt>(null);
  const [allowAdvanceAfterStall, setAllowAdvanceAfterStall] = useState(false);
  const [ignoredWords, setIgnoredWords] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const clearRecognitionStallTimer = useCallback(() => {
    if (recognitionStallTimeoutRef.current === null) return;
    window.clearTimeout(recognitionStallTimeoutRef.current);
    recognitionStallTimeoutRef.current = null;
  }, []);

  const clearRecognitionRestartTimer = useCallback(() => {
    if (recognitionRestartTimeoutRef.current === null) return;
    window.clearTimeout(recognitionRestartTimeoutRef.current);
    recognitionRestartTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    void loadPronunciationSkipWords().then((words) => {
      if (active) setIgnoredWords(words);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      clearRecognitionStallTimer();
      clearRecognitionRestartTimer();
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      }
      recognitionRef.current = null;
      onCharacterProgressChange(null);
    };
  }, [
    clearRecognitionRestartTimer,
    clearRecognitionStallTimer,
    onCharacterProgressChange,
  ]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition || ignoredWords === null) return;

    clearRecognitionStallTimer();
    clearRecognitionRestartTimer();
    recognitionRef.current?.abort();
    manualStopRequestedRef.current = false;

    const recognition = new SpeechRecognition();
    const isAndroidClient = isAndroidSpeechRecognitionClient();
    let completedSessionTranscript = "";
    let finalTranscript = "";
    let latestInterimTranscript = "";
    let recognitionError = false;
    let furthestCharacterCount = 0;
    let autoStopRequested = false;
    let stallResolution: Exclude<RecognitionStallPrompt, null> | null = null;
    const expectedCharacterCount = normalizePronunciationText(text).length;

    const requestStallRecovery = () => {
      if (autoStopRequested || recognitionRef.current !== recognition) {
        return;
      }

      clearRecognitionStallTimer();
      autoStopRequested = true;
      const nextStallCount = recognitionStallCountRef.current + 1;
      recognitionStallCountRef.current = nextStallCount;
      stallResolution = nextStallCount >= 2 ? "finish" : "retry";

      if (recognitionRestartTimeoutRef.current !== null) {
        clearRecognitionRestartTimer();
        recognition.onend?.();
        return;
      }

      try {
        recognition.stop();
      } catch {
        recognition.onend?.();
      }
    };

    const scheduleStallRecovery = () => {
      clearRecognitionStallTimer();
      recognitionStallTimeoutRef.current = window.setTimeout(
        requestStallRecovery,
        RECOGNITION_STALL_TIMEOUT_MS,
      );
    };

    recognition.lang = "ko-KR";
    recognition.continuous = !isAndroidClient;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      onCharacterProgressChange(furthestCharacterCount);
      if (recognitionStallTimeoutRef.current === null) {
        scheduleStallRecovery();
      }
    };

    recognition.onresult = (event) => {
      let nextFinalTranscript = "";
      let nextInterimTranscript = "";

      for (
        let resultIndex = 0;
        resultIndex < event.results.length;
        resultIndex++
      ) {
        const result = event.results[resultIndex];
        const recognizedText = result[0]?.transcript ?? "";

        if (result.isFinal) {
          nextFinalTranscript = joinRecognitionTranscripts(
            nextFinalTranscript,
            recognizedText,
          );
        } else {
          nextInterimTranscript = joinRecognitionTranscripts(
            nextInterimTranscript,
            recognizedText,
          );
        }
      }

      finalTranscript = nextFinalTranscript;
      latestInterimTranscript = nextInterimTranscript;
      const recognizedText = joinRecognitionTranscripts(
        completedSessionTranscript,
        finalTranscript,
        nextInterimTranscript,
      );
      const previousCharacterCount = furthestCharacterCount;
      furthestCharacterCount = Math.max(
        furthestCharacterCount,
        getPronunciationCharacterCount(
          text,
          recognizedText,
          ignoredWords,
        ),
      );
      onCharacterProgressChange(furthestCharacterCount);

      if (
        !autoStopRequested &&
        expectedCharacterCount > 0 &&
        furthestCharacterCount >= expectedCharacterCount
      ) {
        clearRecognitionStallTimer();
        autoStopRequested = true;
        recognition.stop();
      } else if (
        recognizedText &&
        expectedCharacterCount > 0 &&
        (furthestCharacterCount > previousCharacterCount ||
          recognitionStallTimeoutRef.current === null)
      ) {
        scheduleStallRecovery();
      }
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;

      const recoverableAndroidSegmentEnd =
        isAndroidClient &&
        !autoStopRequested &&
        !manualStopRequestedRef.current &&
        (event.error === "no-speech" || event.error === "aborted");

      if (recoverableAndroidSegmentEnd) {
        return;
      }

      clearRecognitionStallTimer();
      recognitionError = true;
      setError(
        ERROR_MESSAGES[event.error] ??
          "음성을 인식하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setStatus("idle");
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;

      if (recognitionError) {
        clearRecognitionStallTimer();
        recognitionRef.current = null;
        return;
      }

      if (!autoStopRequested && !manualStopRequestedRef.current) {
        completedSessionTranscript = joinRecognitionTranscripts(
          completedSessionTranscript,
          finalTranscript,
          latestInterimTranscript,
        );
        finalTranscript = "";
        latestInterimTranscript = "";

        recognitionRestartTimeoutRef.current = window.setTimeout(() => {
          recognitionRestartTimeoutRef.current = null;
          if (
            recognitionRef.current !== recognition ||
            manualStopRequestedRef.current
          ) {
            return;
          }

          try {
            recognition.start();
          } catch {
            recognitionRef.current = null;
            setStatus("idle");
            onCharacterProgressChange(null);
            setError(
              "음성 인식을 계속하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
          }
        }, RECOGNITION_RESTART_DELAY_MS);
        return;
      }

      clearRecognitionStallTimer();
      recognitionRef.current = null;
      setStatus("idle");

      const recognizedText = joinRecognitionTranscripts(
        completedSessionTranscript,
        finalTranscript,
        latestInterimTranscript,
      );

      if (stallResolution === "retry") {
        onCharacterProgressChange(null);
        setRecognitionStallPrompt("retry");
        return;
      }

      if (!recognizedText && stallResolution !== "finish") {
        setError(
          "인식된 말이 없습니다. 마이크 가까이에서 다시 읽어 주세요.",
        );
        return;
      }

      const nextEvaluation = evaluatePronunciation(
        text,
        recognizedText,
        ignoredWords,
      );
      setEvaluation(nextEvaluation);

      if (stallResolution === "finish") {
        setAllowAdvanceAfterStall(true);
        onCompletionChange(true);
        setRecognitionStallPrompt("finish");
        return;
      }

      if (nextEvaluation.tone === "retry") {
        const nextFailureCount = consecutiveFailureCountRef.current + 1;
        consecutiveFailureCountRef.current = nextFailureCount;
        setConsecutiveFailureCount(nextFailureCount);
        onCompletionChange(nextFailureCount >= 2);
      } else {
        consecutiveFailureCountRef.current = 0;
        setConsecutiveFailureCount(0);
        onCompletionChange(true);
      }
    };

    setEvaluation(null);
    setError("");
    setRecognitionStallPrompt(null);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus("idle");
      onCharacterProgressChange(null);
      setError("음성 인식을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [
    onCharacterProgressChange,
    onCompletionChange,
    clearRecognitionRestartTimer,
    clearRecognitionStallTimer,
    ignoredWords,
    text,
  ]);

  useEffect(() => {
    if (!autoStart || ignoredWords === null) return;

    const timeoutId = window.setTimeout(() => {
      onAutoStartHandled();
      startRecognition();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoStart, ignoredWords, onAutoStartHandled, startRecognition]);

  const stopRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    const wasWaitingToRestart =
      recognitionRestartTimeoutRef.current !== null;
    clearRecognitionStallTimer();
    clearRecognitionRestartTimer();
    manualStopRequestedRef.current = true;

    if (wasWaitingToRestart) {
      recognition.onend?.();
      return;
    }

    try {
      recognition.stop();
    } catch {
      recognition.onend?.();
    }
  };

  const closePractice = () => {
    clearRecognitionStallTimer();
    clearRecognitionRestartTimer();
    manualStopRequestedRef.current = true;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    }
    setStatus("idle");
    onCharacterProgressChange(null);
    onClose();
  };

  const confirmRecognitionStallPrompt = () => {
    const prompt = recognitionStallPrompt;
    setRecognitionStallPrompt(null);

    if (prompt === "retry") {
      startRecognition();
    }
  };

  const panelToneClasses =
    !evaluation
      ? "border-stone-200/90 bg-white/95 text-stone-900 dark:border-stone-700/80 dark:bg-stone-900/95 dark:text-stone-100"
      : evaluation.tone === "great"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      : evaluation.tone === "good"
        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  const starCount = evaluation
    ? getPronunciationStarRating(evaluation.score)
    : null;
  const canAdvance =
    evaluation !== null &&
    (evaluation.tone !== "retry" ||
      consecutiveFailureCount >= 2 ||
      allowAdvanceAfterStall);
  const dailyGoalCompleted =
    dailyGoalAchievedToday ||
    Boolean(
      dailyGoalTarget && dailyGoalTodayCount >= dailyGoalTarget,
    );
  const dailyGoalPercentage = dailyGoalTarget
    ? Math.min(
        100,
        Math.round((dailyGoalTodayCount / dailyGoalTarget) * 100),
      )
    : 0;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-5">
        <section
          id={`pronunciation-panel-${verseNum}`}
          aria-labelledby={`pronunciation-title-${verseNum}`}
          className={`pointer-events-auto mx-auto max-w-2xl rounded-2xl border p-4 shadow-[0_-12px_40px_rgba(28,25,23,0.14)] backdrop-blur transition-colors sm:p-5 ${panelToneClasses}`}
        >
        <div className="flex items-center justify-between gap-4">
          <h2
            id={`pronunciation-title-${verseNum}`}
            className="text-sm font-semibold"
          >
            소리 내어 읽기
          </h2>
          <button
            type="button"
            onClick={closePractice}
            aria-label="소리 내어 읽기 닫기"
            className="-mr-1 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-current opacity-60 transition-[background-color,opacity] hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        {!dailyGoalLoading && dailyGoalTarget && (
          <div className="flex items-center gap-3">
            <p className="shrink-0 text-xs font-medium text-stone-600 dark:text-stone-300">
              일일 목표
            </p>
            <div className="min-w-0 flex-1">
              <DailyGoalProgressBar
                value={dailyGoalTodayCount}
                max={dailyGoalTarget}
                completed={dailyGoalCompleted}
                label="녹음 중 일일 읽기 목표 진행률"
                trackClassName="bg-stone-200 dark:bg-stone-700"
              />
            </div>
            <p
              className={`shrink-0 text-xs font-semibold ${
                dailyGoalCompleted
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}
            >
              {dailyGoalPercentage}%
            </p>
          </div>
        )}

        <div className="mt-4">
          {supportStatus === "supported" && !evaluation && (
            <button
              type="button"
              disabled={ignoredWords === null}
              onClick={
                status === "listening" ? stopRecognition : startRecognition
              }
              className={`inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                status === "listening"
                  ? "border-rose-600 bg-transparent text-rose-600 hover:bg-rose-50 dark:border-rose-400 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  : "border-transparent bg-amber-800 text-white hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600"
              }`}
              aria-label={
                status === "listening"
                  ? "읽기를 마치고 평가하기"
                  : `${bookName} ${chapter}장 ${verseNum}절 읽기 시작`
              }
            >
              <span className="relative">
                {status === "listening" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />
                )}
                <MicrophoneIcon className="relative h-5 w-5" />
              </span>
              {ignoredWords === null
                ? "평가 설정 불러오는 중…"
                : status === "listening"
                  ? "읽기 마치기"
                  : "읽기 시작"}
            </button>
          )}
        </div>

        {supportStatus === "checking" && (
          <p className="mt-4 text-xs text-stone-400">음성 인식 확인 중…</p>
        )}

        {supportStatus === "unsupported" && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm leading-6 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            이 브라우저에서는 음성 인식을 사용할 수 없습니다. 음성 인식을
            지원하는 브라우저에서 다시 이용해 주세요.
          </p>
        )}

        {status === "listening" && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            듣고 있어요. 말씀을 끝까지 소리내어 읽어 주세요.
          </div>
        )}

        {evaluation && (
          <div aria-live="polite" className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold">내 발음 평가</p>
              {starCount !== null && (
                <div
                  role="img"
                  aria-label={`발음 평가 별 ${starCount}개`}
                  className="flex items-center text-yellow-500 dark:text-yellow-400"
                >
                  {Array.from({ length: 3 }, (_, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className={
                        starCount > 0 && index >= starCount
                          ? "opacity-30"
                          : undefined
                      }
                    >
                      <RoundedStarIcon active={index < starCount} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div
              className={`mt-4 grid gap-2 ${
                canAdvance ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              <button
                type="button"
                onClick={startRecognition}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-white dark:border-white/15 dark:bg-stone-950/30 dark:text-white dark:hover:bg-stone-950/50"
              >
                다시 읽기
              </button>
              {canAdvance && (
                <button
                  type="button"
                  onClick={hasNextVerse ? onNextVerse : onNextChapter}
                  disabled={!hasNextVerse && !hasNextChapter}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100"
                >
                  {hasNextVerse ? "다음 구절" : "읽기 완료"}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
          >
            {error}
          </p>
        )}
        </section>
      </div>

      {recognitionStallPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-[2px]">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="recognition-stall-title"
            aria-describedby="recognition-stall-description"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-stone-900"
          >
            <h2
              id="recognition-stall-title"
              className="text-lg font-bold text-stone-900 dark:text-stone-100"
            >
              {recognitionStallPrompt === "retry"
                ? "발음을 다시 들려주세요"
                : "현재 읽기를 채점했어요"}
            </h2>
            <p
              id="recognition-stall-description"
              className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300"
            >
              잠깐 멈추고 발음을 좀 더 정확하고 크게 소리내 주세요.
            </p>
            {recognitionStallPrompt === "finish" && (
              <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                인식이 두 번 원활하지 않아 현재까지 읽은 내용으로 녹음을
                종료하고 채점했어요. 확인 후 다음 절로 넘어갈 수 있어요.
              </p>
            )}
            <button
              type="button"
              autoFocus
              onClick={confirmRecognitionStallPrompt}
              className="mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600"
            >
              확인
            </button>
          </section>
        </div>
      )}
    </>
  );
}
