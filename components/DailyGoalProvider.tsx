"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  countCompletedVersesOnDate,
  formatKoreanCalendarDateLabel,
  getKoreanCalendarDate,
  isValidDailyGoalTarget,
} from "@/lib/daily-goal";
import {
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface DailyGoalContextValue {
  target: number | null;
  todayCount: number;
  achievedDates: ReadonlySet<string>;
  achievedToday: boolean;
  goalStartedDate: string | null;
  loading: boolean;
  saving: boolean;
  error: string;
  celebrationBlocking: boolean;
  saveTarget: (target: number) => Promise<boolean>;
  replayCelebration: () => void;
}

const DailyGoalContext = createContext<DailyGoalContextValue | null>(null);

const CELEBRATION_MESSAGES = [
  "오늘도 말씀과 함께 한 걸음을 내디뎠어요. 내일도 이 기쁨을 이어가세요.",
  "꾸준한 말씀 읽기가 마음에 깊은 뿌리를 내리고 있어요. 정말 잘했어요!",
  "오늘의 목표를 멋지게 완성했어요. 작은 실천이 큰 변화를 만들어요.",
  "말씀을 향한 귀한 시간을 채웠어요. 오늘의 성취를 마음껏 기뻐하세요.",
  "하루의 목표를 이루었어요. 말씀과 동행하는 좋은 습관이 자라고 있어요.",
  "오늘도 약속한 만큼 말씀을 읽었어요. 꾸준함이 빛나는 순간이에요!",
  "한 절 한 절 쌓아 올린 오늘의 목표를 달성했어요. 정말 훌륭해요.",
  "말씀 읽기 목표 완료! 오늘의 은혜와 배움을 오래 간직해 보세요.",
  "포기하지 않고 목표까지 도착했어요. 내일의 말씀도 기대해 보세요.",
  "오늘의 말씀 여정을 완주했어요. 이 소중한 흐름을 계속 이어가세요.",
] as const;

interface CelebrationContent {
  message: string;
}

interface CelebrationState extends CelebrationContent {
  replay: boolean;
}

function createCelebrationContent(replay = false): CelebrationState {
  return {
    replay,
    message:
      CELEBRATION_MESSAGES[
        Math.floor(Math.random() * CELEBRATION_MESSAGES.length)
      ],
  };
}

function DailyGoalCelebration({
  celebration,
  onClose,
}: {
  celebration: CelebrationContent | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!celebration) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [celebration, onClose]);

  if (!celebration || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <iframe
        title="일일 읽기 목표 달성 폭죽"
        aria-hidden="true"
        src="/vendor/firework-simulator/index.html"
        className="pointer-events-none absolute inset-0 z-0 size-full border-0"
        sandbox="allow-scripts allow-same-origin"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-goal-celebration-title"
        className="dark relative z-10 w-full max-w-sm overflow-hidden break-words rounded-3xl border border-amber-800/50 bg-surface/70 px-6 py-8 text-center text-foreground shadow-2xl backdrop-blur-xl [word-break:keep-all]"
      >
        <Image
          src="/images/party-popper.png"
          alt=""
          aria-hidden
          width={50}
          height={50}
          className="mx-auto size-[50px] object-contain"
        />
        <p className="mt-4 text-sm font-medium text-amber-800 dark:text-amber-300">
          {formatKoreanCalendarDateLabel()}
        </p>
        <h2
          id="daily-goal-celebration-title"
          className="mt-4 font-serif text-2xl font-bold text-foreground"
        >
          일일 읽기 목표를 달성했어요!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {celebration.message}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
        >
          확인
        </button>
      </div>
    </div>,
    document.body,
  );
}

function DailyGoalAccountProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isBibleReadingPage = pathname.startsWith("/read/");
  const progress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const [target, setTarget] = useState<number | null>(null);
  const [goalStartedDate, setGoalStartedDate] = useState<string | null>(null);
  const [achievedTargets, setAchievedTargets] = useState<
    Readonly<Record<string, number>>
  >({});
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [today, setToday] = useState(() => getKoreanCalendarDate());
  const achievementPendingRef = useRef(false);
  const todayCount = countCompletedVersesOnDate(progress, today);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextToday = getKoreanCalendarDate();
      setToday((current) => (current === nextToday ? current : nextToday));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    void Promise.all([
      supabase
        .from("user_daily_goals")
        .select("target_verses, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_daily_goal_achievements")
        .select("goal_date, target_verses")
        .eq("user_id", userId),
    ]).then(([goalResult, achievementResult]) => {
      if (!active) return;
      if (goalResult.error || achievementResult.error) {
        setError("일일 읽기 목표를 불러오지 못했습니다.");
      } else {
        setTarget(goalResult.data?.target_verses ?? null);
        setGoalStartedDate(
          goalResult.data?.created_at
            ? getKoreanCalendarDate(new Date(goalResult.data.created_at))
            : null,
        );
        setAchievedTargets(
          Object.fromEntries(
            (achievementResult.data ?? []).map(
              ({ goal_date, target_verses }) => [goal_date, target_verses],
            ),
          ),
        );
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (
      !userId ||
      !isBibleReadingPage ||
      loading ||
      !target ||
      todayCount < target ||
      (achievedTargets[today] ?? 0) >= target ||
      achievementPendingRef.current
    ) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    achievementPendingRef.current = true;

    void supabase
      .from("user_daily_goal_achievements")
      .upsert(
        {
          user_id: userId,
          goal_date: today,
          target_verses: target,
          completed_verses: todayCount,
          achieved_at: new Date().toISOString(),
        },
        { onConflict: "user_id,goal_date" },
      )
      .then(({ error: insertError }) => {
        if (!insertError) {
          setAchievedTargets((current) => ({
            ...current,
            [today]: target,
          }));
          setCelebration(createCelebrationContent());
        } else {
          setError("목표 달성 기록을 저장하지 못했습니다.");
        }
        achievementPendingRef.current = false;
      });
  }, [
    achievedTargets,
    isBibleReadingPage,
    loading,
    target,
    today,
    todayCount,
    userId,
  ]);

  const achievedDates = useMemo(
    () => new Set(Object.keys(achievedTargets)),
    [achievedTargets],
  );
  const achievedToday = achievedDates.has(today);
  const replayCelebration = useCallback(() => {
    if (
      !achievedToday &&
      (!target || todayCount < target)
    ) {
      return;
    }
    setCelebration(createCelebrationContent(true));
  }, [achievedToday, target, todayCount]);
  const celebrationBlocking =
    Boolean(celebration) ||
    Boolean(
      userId &&
        isBibleReadingPage &&
        (loading ||
          (!error &&
            target &&
            todayCount >= target &&
            !achievedToday)),
    );

  const saveTarget = useCallback(
    async (nextTarget: number) => {
      if (!userId || !isValidDailyGoalTarget(nextTarget)) return false;
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return false;

      setSaving(true);
      setError("");
      const now = new Date();
      const { data, error: saveError } = await supabase
        .from("user_daily_goals")
        .upsert(
          {
            user_id: userId,
            target_verses: nextTarget,
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("target_verses, created_at")
        .single();
      setSaving(false);

      if (saveError || !data) {
        setError("일일 읽기 목표를 저장하지 못했습니다.");
        return false;
      }

      setTarget(data.target_verses);
      setGoalStartedDate(getKoreanCalendarDate(new Date(data.created_at)));
      return true;
    },
    [userId],
  );

  const value = useMemo<DailyGoalContextValue>(
    () => ({
      target,
      todayCount,
      achievedDates,
      achievedToday,
      goalStartedDate,
      loading,
      saving,
      error,
      celebrationBlocking,
      saveTarget,
      replayCelebration,
    }),
    [
      achievedDates,
      achievedToday,
      celebrationBlocking,
      error,
      goalStartedDate,
      loading,
      replayCelebration,
      saveTarget,
      saving,
      target,
      todayCount,
    ],
  );

  return (
    <DailyGoalContext.Provider value={value}>
      {children}
      <DailyGoalCelebration
        celebration={
          celebration && (isBibleReadingPage || celebration.replay)
            ? celebration
            : null
        }
        onClose={() => setCelebration(null)}
      />
    </DailyGoalContext.Provider>
  );
}

export function DailyGoalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <DailyGoalAccountProvider
      key={user?.id ?? "guest"}
      userId={user?.id ?? null}
    >
      {children}
    </DailyGoalAccountProvider>
  );
}

export function useDailyGoal(): DailyGoalContextValue {
  const context = useContext(DailyGoalContext);
  if (!context) {
    throw new Error("useDailyGoal must be used within DailyGoalProvider");
  }
  return context;
}
