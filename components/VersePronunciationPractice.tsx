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

const ERROR_MESSAGES: Record<string, string> = {
  "audio-capture": "마이크를 찾을 수 없습니다. 기기 설정을 확인해 주세요.",
  "not-allowed": "마이크 사용이 허용되지 않았습니다. 브라우저 설정에서 권한을 허용해 주세요.",
  "service-not-allowed":
    "음성 인식 사용이 차단되어 있습니다. 브라우저 설정을 확인해 주세요.",
  network: "음성 인식 서비스에 연결하지 못했습니다. 연결 상태를 확인해 주세요.",
  "no-speech": "목소리가 들리지 않았습니다. 마이크 가까이에서 다시 읽어 주세요.",
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supportStatus = useSyncExternalStore(
    subscribeToSpeechRecognitionSupport,
    getSpeechRecognitionSupportSnapshot,
    getServerSpeechRecognitionSupportSnapshot,
  );
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [evaluation, setEvaluation] =
    useState<PronunciationEvaluation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
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
  }, [onCharacterProgressChange]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    let finalTranscript = "";
    let latestInterimTranscript = "";
    let recognitionError = false;
    let furthestCharacterCount = 0;
    let autoStopRequested = false;
    const expectedCharacterCount = normalizePronunciationText(text).length;

    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      onCharacterProgressChange(0);
    };

    recognition.onresult = (event) => {
      let nextInterimTranscript = "";

      for (
        let resultIndex = event.resultIndex;
        resultIndex < event.results.length;
        resultIndex++
      ) {
        const result = event.results[resultIndex];
        const recognizedText = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${recognizedText}`.trim();
        } else {
          nextInterimTranscript =
            `${nextInterimTranscript} ${recognizedText}`.trim();
        }
      }

      latestInterimTranscript = nextInterimTranscript;
      const recognizedText =
        `${finalTranscript} ${nextInterimTranscript}`.trim();
      furthestCharacterCount = Math.max(
        furthestCharacterCount,
        getPronunciationCharacterCount(text, recognizedText),
      );
      onCharacterProgressChange(furthestCharacterCount);

      if (
        !autoStopRequested &&
        expectedCharacterCount > 0 &&
        furthestCharacterCount >= expectedCharacterCount
      ) {
        autoStopRequested = true;
        recognition.stop();
      }
    };

    recognition.onerror = (event) => {
      recognitionError = true;
      setError(
        ERROR_MESSAGES[event.error] ??
          "음성을 인식하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setStatus("idle");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus("idle");

      if (recognitionError) return;

      const recognizedText =
        `${finalTranscript} ${latestInterimTranscript}`.trim();

      if (!recognizedText) {
        setError(
          "인식된 말이 없습니다. 마이크 가까이에서 다시 읽어 주세요.",
        );
        return;
      }

      const nextEvaluation = evaluatePronunciation(text, recognizedText);
      setEvaluation(nextEvaluation);
      onCompletionChange(nextEvaluation.tone !== "retry");
    };

    setEvaluation(null);
    setError("");
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
    text,
  ]);

  useEffect(() => {
    if (!autoStart) return;

    const timeoutId = window.setTimeout(() => {
      onAutoStartHandled();
      startRecognition();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoStart, onAutoStartHandled, startRecognition]);

  const stopRecognition = () => {
    recognitionRef.current?.stop();
  };

  const closePractice = () => {
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

  const panelToneClasses =
    !evaluation
      ? "border-stone-200/90 bg-white/95 text-stone-900 dark:border-stone-700/80 dark:bg-stone-900/95 dark:text-stone-100"
      : evaluation.tone === "great"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      : evaluation.tone === "good"
        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-5">
      <section
        id={`pronunciation-panel-${verseNum}`}
        aria-labelledby={`pronunciation-title-${verseNum}`}
        className={`pointer-events-auto mx-auto max-w-2xl rounded-2xl border p-4 shadow-[0_-12px_40px_rgba(28,25,23,0.14)] backdrop-blur transition-colors sm:p-5 ${panelToneClasses}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`pronunciation-title-${verseNum}`}
              className="text-sm font-semibold"
            >
              소리 내어 읽기
            </h2>
            <p
              className={`mt-1 text-xs leading-5 ${
                evaluation
                  ? "text-current opacity-70"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              {bookName} {chapter}장 {verseNum}절 말씀
            </p>
          </div>
          <button
            type="button"
            onClick={closePractice}
            aria-label="소리 내어 읽기 닫기"
            className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-current opacity-60 transition-[background-color,opacity] hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="mt-4">
          {supportStatus === "supported" && !evaluation && (
            <button
              type="button"
              onClick={
                status === "listening" ? stopRecognition : startRecognition
              }
              className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                status === "listening"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-amber-800 text-white hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600"
              }`}
              aria-label={
                status === "listening"
                  ? "읽기를 마치고 평가하기"
                  : `${bookName} ${chapter}장 ${verseNum}절 읽기 시작`
              }
            >
              <span className="relative">
                {status === "listening" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-white/50" />
                )}
                <MicrophoneIcon className="relative h-5 w-5" />
              </span>
              {status === "listening" ? "읽기 마치기" : "읽기 시작"}
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
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-semibold">내 발음 평가</p>
              <p className="text-2xl font-bold tabular-nums">
                {evaluation.score}
                <span className="ml-0.5 text-sm">%</span>
              </p>
            </div>
            <div
              className={`mt-4 grid gap-2 ${
                evaluation.tone === "retry"
                  ? "grid-cols-1"
                  : "grid-cols-2"
              }`}
            >
              <button
                type="button"
                onClick={startRecognition}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-white dark:border-white/15 dark:bg-stone-950/30 dark:text-white dark:hover:bg-stone-950/50"
              >
                다시 읽기
              </button>
              {evaluation.tone !== "retry" && (
                <button
                  type="button"
                  onClick={hasNextVerse ? onNextVerse : onNextChapter}
                  disabled={!hasNextVerse && !hasNextChapter}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100"
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
  );
}
