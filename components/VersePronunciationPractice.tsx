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
import { getSilentReadingWordCharacterCounts } from "@/components/KoreanVerseText";
import { MicrophoneIcon, EyeIcon } from "@/components/PronunciationIcons";
import type { PronunciationHighlightMode } from "@/components/KoreanVerseText";

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

type PracticeMode = "silent" | "spoken";
type HighlightSpeed = "slow" | "normal" | "fast";

interface VersePronunciationPracticeProps {
  bookName: string;
  chapter: number;
  verseNum: number;
  text: string;
  onCharacterProgressChange: (
    characterCount: number | null,
    highlightMode?: PronunciationHighlightMode | null,
  ) => void;
  onCompletionChange: (completed: boolean) => void;
  onClose: () => void;
  hasNextVerse: boolean;
  onNextVerse: () => void;
  hasNextChapter: boolean;
  onNextChapter: () => void;
  autoStart: boolean;
  autoStartMode?: PracticeMode | null;
  onPracticeModeStart?: (mode: PracticeMode) => void;
  onAutoStartHandled: () => void;
}

type RecognitionStatus = "idle" | "listening";
type SupportStatus = "checking" | "supported" | "unsupported";
type RecognitionStallPrompt = "retry" | "finish" | null;

const SILENT_READING_BASE_MS = 320;
const SILENT_READING_PER_CHAR_MS = 110;
const SILENT_READING_COMPLETE_PAUSE_MS = 450;
const HIGHLIGHT_SPEED_STORAGE_KEY =
  "bible4korea:silent-reading-highlight-speed";

const HIGHLIGHT_SPEED_OPTIONS = [
  { id: "slow" as const, label: "느림", multiplier: 1.55 },
  { id: "normal" as const, label: "보통", multiplier: 1 },
  { id: "fast" as const, label: "빠름", multiplier: 0.55 },
];

function isHighlightSpeed(value: string): value is HighlightSpeed {
  return value === "slow" || value === "normal" || value === "fast";
}

function readStoredHighlightSpeed(): HighlightSpeed {
  try {
    const stored = window.localStorage.getItem(HIGHLIGHT_SPEED_STORAGE_KEY);
    if (stored && isHighlightSpeed(stored)) return stored;
  } catch {
    // ignore storage errors
  }
  return "normal";
}

function getHighlightSpeedMultiplier(speed: HighlightSpeed): number {
  return (
    HIGHLIGHT_SPEED_OPTIONS.find((option) => option.id === speed)
      ?.multiplier ?? 1
  );
}

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
  autoStartMode = null,
  onPracticeModeStart,
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
  const silentReadingTimeoutRef = useRef<number | null>(null);
  const silentReadingActiveRef = useRef(false);
  const supportStatus = useSyncExternalStore(
    subscribeToSpeechRecognitionSupport,
    getSpeechRecognitionSupportSnapshot,
    getServerSpeechRecognitionSupportSnapshot,
  );
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null);
  const [silentReadingComplete, setSilentReadingComplete] = useState(false);
  const [highlightSpeed, setHighlightSpeed] =
    useState<HighlightSpeed>("normal");
  const [evaluation, setEvaluation] =
    useState<PronunciationEvaluation | null>(null);
  const [consecutiveFailureCount, setConsecutiveFailureCount] = useState(0);
  const [recognitionStallPrompt, setRecognitionStallPrompt] =
    useState<RecognitionStallPrompt>(null);
  const [allowAdvanceAfterStall, setAllowAdvanceAfterStall] = useState(false);
  const [ignoredWords, setIgnoredWords] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const highlightSpeedRef = useRef<HighlightSpeed>(highlightSpeed);

  const clearSilentReadingTimer = useCallback(() => {
    if (silentReadingTimeoutRef.current === null) return;
    window.clearTimeout(silentReadingTimeoutRef.current);
    silentReadingTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    setHighlightSpeed(readStoredHighlightSpeed());
  }, []);

  useEffect(() => {
    highlightSpeedRef.current = highlightSpeed;
  }, [highlightSpeed]);

  const handleHighlightSpeedChange = useCallback((speed: HighlightSpeed) => {
    setHighlightSpeed(speed);
    try {
      window.localStorage.setItem(HIGHLIGHT_SPEED_STORAGE_KEY, speed);
    } catch {
      // ignore storage errors
    }
  }, []);

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

  const onCharacterProgressChangeRef = useRef(onCharacterProgressChange);
  const onCompletionChangeRef = useRef(onCompletionChange);
  const onPracticeModeStartRef = useRef(onPracticeModeStart);

  useEffect(() => {
    onCharacterProgressChangeRef.current = onCharacterProgressChange;
  }, [onCharacterProgressChange]);

  useEffect(() => {
    onCompletionChangeRef.current = onCompletionChange;
  }, [onCompletionChange]);

  useEffect(() => {
    onPracticeModeStartRef.current = onPracticeModeStart;
  }, [onPracticeModeStart]);

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
      clearSilentReadingTimer();
      silentReadingActiveRef.current = false;
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
      onCharacterProgressChangeRef.current(null, null);
    };
  }, [
    clearRecognitionRestartTimer,
    clearRecognitionStallTimer,
    clearSilentReadingTimer,
  ]);

  const stopSilentReading = useCallback(() => {
    clearSilentReadingTimer();
    silentReadingActiveRef.current = false;
    setPracticeMode(null);
    setSilentReadingComplete(false);
    onCharacterProgressChangeRef.current(null, null);
  }, [clearSilentReadingTimer]);

  const startSilentReading = useCallback(() => {
    clearSilentReadingTimer();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    manualStopRequestedRef.current = true;
    setStatus("idle");
    setEvaluation(null);
    setError("");
    setRecognitionStallPrompt(null);
    setAllowAdvanceAfterStall(false);
    setSilentReadingComplete(false);
    setPracticeMode("silent");
    onPracticeModeStartRef.current?.("silent");
    silentReadingActiveRef.current = true;

    const wordCharacterCounts = getSilentReadingWordCharacterCounts(text);
    if (wordCharacterCounts.length === 0) {
      onCharacterProgressChangeRef.current(0, "word-background");
      onCompletionChangeRef.current(true);
      setSilentReadingComplete(true);
      silentReadingActiveRef.current = false;
      return;
    }

    let wordIndex = 0;
    const advanceWord = () => {
      if (!silentReadingActiveRef.current) return;

      const characterCount = wordCharacterCounts[wordIndex] ?? 0;
      onCharacterProgressChangeRef.current(characterCount, "word-background");

      if (wordIndex >= wordCharacterCounts.length - 1) {
        silentReadingTimeoutRef.current = window.setTimeout(() => {
          if (!silentReadingActiveRef.current) return;
          silentReadingActiveRef.current = false;
          onCompletionChangeRef.current(true);
          setSilentReadingComplete(true);
        }, SILENT_READING_COMPLETE_PAUSE_MS);
        return;
      }

      const currentWordLength =
        wordIndex === 0
          ? wordCharacterCounts[0]
          : wordCharacterCounts[wordIndex] -
            wordCharacterCounts[wordIndex - 1];
      const delay =
        (SILENT_READING_BASE_MS +
          SILENT_READING_PER_CHAR_MS * Math.max(1, currentWordLength)) *
        getHighlightSpeedMultiplier(highlightSpeedRef.current);

      wordIndex += 1;
      silentReadingTimeoutRef.current = window.setTimeout(advanceWord, delay);
    };

    advanceWord();
  }, [clearSilentReadingTimer, text]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition || ignoredWords === null) return;

    clearSilentReadingTimer();
    silentReadingActiveRef.current = false;
    setSilentReadingComplete(false);
    setPracticeMode("spoken");
    onPracticeModeStartRef.current?.("spoken");

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
      onCharacterProgressChangeRef.current(furthestCharacterCount, "text");
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
      onCharacterProgressChangeRef.current(furthestCharacterCount, "text");

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
            onCharacterProgressChangeRef.current(null, null);
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
        onCharacterProgressChangeRef.current(null, null);
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
        onCompletionChangeRef.current(true);
        setRecognitionStallPrompt("finish");
        return;
      }

      if (nextEvaluation.tone === "retry") {
        const nextFailureCount = consecutiveFailureCountRef.current + 1;
        consecutiveFailureCountRef.current = nextFailureCount;
        setConsecutiveFailureCount(nextFailureCount);
        onCompletionChangeRef.current(nextFailureCount >= 2);
      } else {
        consecutiveFailureCountRef.current = 0;
        setConsecutiveFailureCount(0);
        onCompletionChangeRef.current(true);
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
      onCharacterProgressChangeRef.current(null, null);
      setError("음성 인식을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [
    clearRecognitionRestartTimer,
    clearRecognitionStallTimer,
    clearSilentReadingTimer,
    ignoredWords,
    text,
  ]);

  useEffect(() => {
    if (!autoStart) return;
    if (autoStartMode === "spoken" && ignoredWords === null) return;

    const timeoutId = window.setTimeout(() => {
      onAutoStartHandled();
      if (autoStartMode === "silent") {
        startSilentReading();
        return;
      }
      startRecognition();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoStart,
    autoStartMode,
    ignoredWords,
    onAutoStartHandled,
    startRecognition,
    startSilentReading,
  ]);

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
    clearSilentReadingTimer();
    silentReadingActiveRef.current = false;
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
    setPracticeMode(null);
    setSilentReadingComplete(false);
    onCharacterProgressChangeRef.current(null, null);
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
    silentReadingComplete || evaluation?.tone === "great"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
      : !evaluation
      ? "border-stone-200/90 bg-white/95 text-stone-900 dark:border-stone-700/80 dark:bg-stone-900/95 dark:text-stone-100"
      : evaluation.tone === "good"
        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200";
  const starCount = evaluation
    ? getPronunciationStarRating(evaluation.score)
    : null;
  const canAdvance =
    silentReadingComplete ||
    (evaluation !== null &&
      (evaluation.tone !== "retry" ||
        consecutiveFailureCount >= 2 ||
        allowAdvanceAfterStall));
  const showStartChoices =
    practiceMode === null &&
    !evaluation &&
    !silentReadingComplete &&
    status !== "listening";
  const silentReadingRunning =
    practiceMode === "silent" && !silentReadingComplete;
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
            말씀 읽기
          </h2>
          <button
            type="button"
            onClick={closePractice}
            aria-label="말씀 읽기 닫기"
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
          {showStartChoices && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={startSilentReading}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent bg-amber-800 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600"
                aria-label={`${bookName} ${chapter}장 ${verseNum}절 눈으로 읽기 시작`}
              >
                <EyeIcon className="h-5 w-5" />
                눈으로 읽기
              </button>
              <button
                type="button"
                disabled={
                  supportStatus !== "supported" || ignoredWords === null
                }
                onClick={startRecognition}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-transparent bg-amber-800 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60 dark:bg-amber-700 dark:hover:bg-amber-600"
                aria-label={`${bookName} ${chapter}장 ${verseNum}절 소리 내어 읽기 시작`}
              >
                <MicrophoneIcon className="h-5 w-5" />
                {ignoredWords === null && supportStatus === "supported"
                  ? "준비 중…"
                  : "소리 내어 읽기"}
              </button>
            </div>
          )}

          {practiceMode === "spoken" &&
            supportStatus === "supported" &&
            !evaluation && (
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
                    : `${bookName} ${chapter}장 ${verseNum}절 소리 내어 읽기 시작`
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
                    : "소리 내어 읽기"}
              </button>
            )}

          {silentReadingRunning && (
            <div className="flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <p className="shrink-0 text-xs font-medium text-stone-600 dark:text-stone-300">
                  속도
                </p>
                <div
                  className="inline-grid min-w-0 flex-1 grid-cols-3 gap-0.5 rounded-full bg-stone-900/[0.05] p-1 dark:bg-white/[0.07]"
                  role="radiogroup"
                  aria-label="하이라이트 속도"
                >
                  {HIGHLIGHT_SPEED_OPTIONS.map((option) => {
                    const active = highlightSpeed === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handleHighlightSpeedChange(option.id)}
                        className={`cursor-pointer rounded-full px-2.5 py-2 text-xs font-medium transition-colors ${
                          active
                            ? "bg-amber-800 font-semibold text-white dark:bg-amber-700 dark:text-white"
                            : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={stopSilentReading}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rose-600 bg-transparent px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-400 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                읽기 중단
              </button>
            </div>
          )}
        </div>

        {showStartChoices && supportStatus === "checking" && (
          <p className="mt-4 text-xs text-stone-400">음성 인식 확인 중…</p>
        )}

        {showStartChoices && supportStatus === "unsupported" && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm leading-6 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            소리 내어 읽기는 이 브라우저에서 사용할 수 없습니다. 눈으로
            읽기는 계속 이용할 수 있습니다.
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

        {silentReadingRunning && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300"
          >
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
            강조된 단어를 눈으로 따라가며 읽으세요.
          </div>
        )}

        {silentReadingComplete && (
          <div aria-live="polite" className="mt-4">
            <p className="text-sm font-semibold">읽기 완료</p>
            <div
              className={`mt-4 grid gap-2 ${
                canAdvance ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              <button
                type="button"
                onClick={startSilentReading}
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
