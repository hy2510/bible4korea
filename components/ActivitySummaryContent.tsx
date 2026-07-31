"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  ActivityRankingUserSummary,
  ActivityWeekdayReadCount,
} from "@/lib/activity-ranking";
import { getKoreanCalendarDate } from "@/lib/daily-goal";

export function ActivitySummarySkeleton() {
  return (
    <div className="animate-pulse" aria-label="사용자 읽기 활동을 불러오는 중">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800"
          />
        ))}
      </div>
      <div className="mt-5 h-28 rounded-2xl bg-stone-100 dark:bg-stone-800" />
    </div>
  );
}

const WEEKLY_CHART_WIDTH = 320;
const WEEKLY_CHART_HEIGHT = 156;
const WEEKLY_CHART_PADDING_X = 14;
const WEEKLY_CHART_PADDING_TOP = 24;
const WEEKLY_CHART_PADDING_BOTTOM = 10;

interface WeeklyChartPoint {
  x: number;
  y: number;
  readCount: number;
}

function roundChartCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

function getWeeklyChartPoints(
  readCounts: number[],
  maxValue: number,
): WeeklyChartPoint[] {
  const plotWidth = WEEKLY_CHART_WIDTH - WEEKLY_CHART_PADDING_X * 2;
  const plotHeight =
    WEEKLY_CHART_HEIGHT -
    WEEKLY_CHART_PADDING_TOP -
    WEEKLY_CHART_PADDING_BOTTOM;
  const step = plotWidth / Math.max(1, readCounts.length - 1);

  return readCounts.map((readCount, index) => ({
    x: roundChartCoordinate(WEEKLY_CHART_PADDING_X + step * index),
    y: roundChartCoordinate(
      WEEKLY_CHART_PADDING_TOP +
        plotHeight -
        (readCount / maxValue) * plotHeight,
    ),
    readCount,
  }));
}

function getWeeklyChartPath(points: WeeklyChartPoint[]): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");
}

function formatKoreanMonthDay(dateString: string): string {
  const [, month, day] = dateString.split("-").map(Number);
  return `${month}월 ${day}일`;
}

function WeeklyReadingChart({
  weeklyReadCounts,
  readerLabel,
  comparisonSummary,
}: {
  weeklyReadCounts: ActivityWeekdayReadCount[];
  readerLabel: string;
  comparisonSummary?: ActivityRankingUserSummary | null;
}) {
  const tooltipId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(
    null,
  );
  useEffect(() => {
    if (selectedDayIndex === null) {
      return;
    }

    const closeTooltipOutsideDayButton = (event: PointerEvent) => {
      const target = event.target;
      const clickedDayButton =
        target instanceof Element
          ? target.closest("[data-weekly-day-trigger]")
          : null;

      if (
        clickedDayButton &&
        chartRef.current?.contains(clickedDayButton)
      ) {
        return;
      }

      setSelectedDayIndex(null);
    };

    document.addEventListener("pointerdown", closeTooltipOutsideDayButton);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeTooltipOutsideDayButton,
      );
    };
  }, [selectedDayIndex]);

  const comparisonCountsByDate = useMemo(
    () =>
      new Map(
        (comparisonSummary?.weeklyReadCounts ?? []).map((day) => [
          day.date,
          day.readCount,
        ]),
      ),
    [comparisonSummary],
  );
  const comparisonReadCounts = weeklyReadCounts.map(
    (day) => comparisonCountsByDate.get(day.date) ?? 0,
  );
  const chartMaxValue =
    Math.max(
      1,
      ...weeklyReadCounts.map((day) => day.readCount),
      ...comparisonReadCounts,
    ) * 1.12;
  const readerPoints = getWeeklyChartPoints(
    weeklyReadCounts.map((day) => day.readCount),
    chartMaxValue,
  );
  const comparisonPoints = comparisonSummary
    ? getWeeklyChartPoints(comparisonReadCounts, chartMaxValue)
    : [];
  const today = getKoreanCalendarDate();
  const occurredDayCount = weeklyReadCounts.filter(
    (day) => day.date <= today,
  ).length;
  const readerOccurredPoints = readerPoints.slice(0, occurredDayCount);
  const comparisonOccurredPoints = comparisonPoints.slice(
    0,
    occurredDayCount,
  );
  const guideLineYs = [
    WEEKLY_CHART_PADDING_TOP,
    roundChartCoordinate(WEEKLY_CHART_HEIGHT / 2),
    WEEKLY_CHART_HEIGHT - WEEKLY_CHART_PADDING_BOTTOM,
  ];
  const readerChartSummary = weeklyReadCounts
    .map((day) => `${day.dayLabel}요일 ${day.readCount}절`)
    .join(", ");
  const comparisonChartSummary = comparisonSummary
    ? comparisonSummary.weeklyReadCounts
        .map((day) => `${day.dayLabel}요일 ${day.readCount}절`)
        .join(", ")
    : "";
  const chartSummary = comparisonSummary
    ? `나: ${comparisonChartSummary}; ${readerLabel}: ${readerChartSummary}`
    : readerChartSummary;
  const firstWeekDate = weeklyReadCounts.at(0)?.date;
  const lastWeekDate = weeklyReadCounts.at(-1)?.date;
  const weekDateLabel =
    firstWeekDate && lastWeekDate
      ? `${formatKoreanMonthDay(firstWeekDate)} ~ ${formatKoreanMonthDay(lastWeekDate)}`
      : "";

  return (
    <div ref={chartRef} className="mt-7">
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
        이번주 읽기
      </h3>
      {weekDateLabel && (
        <p className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-400">
          {weekDateLabel}
        </p>
      )}
      <div className="mt-4 rounded-2xl bg-sky-50/55 dark:bg-sky-950/15">
        <div
          role="img"
          aria-label={`이번주 일별 읽은 절 그래프: ${chartSummary}`}
        >
          <svg
            viewBox={`0 0 ${WEEKLY_CHART_WIDTH} ${WEEKLY_CHART_HEIGHT}`}
            className="h-auto w-full overflow-visible"
            aria-hidden
          >
            {guideLineYs.map((y) => (
              <line
                key={y}
                x1={WEEKLY_CHART_PADDING_X}
                x2={WEEKLY_CHART_WIDTH - WEEKLY_CHART_PADDING_X}
                y1={y}
                y2={y}
                className="stroke-stone-200/65 dark:stroke-stone-700/65"
                strokeWidth="1"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {selectedDayIndex !== null && (
              <line
                x1={readerPoints[selectedDayIndex].x}
                x2={readerPoints[selectedDayIndex].x}
                y1={WEEKLY_CHART_PADDING_TOP}
                y2={WEEKLY_CHART_HEIGHT - WEEKLY_CHART_PADDING_BOTTOM}
                className="stroke-stone-300 dark:stroke-stone-600"
                strokeWidth="1"
                strokeDasharray="2 4"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {comparisonSummary && (
              <>
                <path
                  d={getWeeklyChartPath(comparisonOccurredPoints)}
                  fill="none"
                  className="stroke-orange-300 dark:stroke-orange-400"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {comparisonPoints.map((point, index) => (
                  <circle
                    key={`comparison-${weeklyReadCounts[index].date}`}
                    cx={point.x}
                    cy={point.y}
                    r={selectedDayIndex === index ? 4.5 : 3}
                    className={
                      index < occurredDayCount
                        ? "fill-orange-400 dark:fill-orange-300"
                        : "fill-transparent"
                    }
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </>
            )}

            <path
              d={getWeeklyChartPath(readerOccurredPoints)}
              fill="none"
              className={
                comparisonSummary
                  ? "stroke-sky-300 dark:stroke-sky-400"
                  : "stroke-orange-300 dark:stroke-orange-400"
              }
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {readerPoints.map((point, index) => (
              <circle
                key={`reader-${weeklyReadCounts[index].date}`}
                cx={point.x}
                cy={point.y}
                r={selectedDayIndex === index ? 4.5 : 3}
                className={
                  index >= occurredDayCount
                    ? "fill-transparent"
                    : comparisonSummary
                      ? "fill-sky-400 dark:fill-sky-300"
                      : "fill-orange-400 dark:fill-orange-300"
                }
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
        <div className="mt-2 grid grid-cols-7">
          {weeklyReadCounts.map((day, index) => {
            const isFutureDay = day.date > today;
            const tooltipOpen =
              !isFutureDay && selectedDayIndex === index;
            const isFirstDay = index === 0;
            const isLastDay = index === weeklyReadCounts.length - 1;
            const tooltipPosition = isFirstDay
              ? "left-0"
              : isLastDay
                ? "right-0"
                : "left-1/2 -translate-x-1/2";
            const arrowPosition = isFirstDay
              ? "left-4"
              : isLastDay
                ? "right-4"
                : "left-1/2 -translate-x-1/2";
            const dayTooltipId = `${tooltipId}-${index}`;

            return (
              <div key={day.date} className="relative flex justify-center">
                <button
                  type="button"
                  disabled={isFutureDay}
                  data-weekly-day-trigger={
                    isFutureDay ? undefined : ""
                  }
                  onClick={() =>
                    setSelectedDayIndex((current) =>
                      current === index ? null : index,
                    )
                  }
                  aria-expanded={tooltipOpen}
                  aria-describedby={tooltipOpen ? dayTooltipId : undefined}
                  aria-label={
                    isFutureDay
                      ? `아직 도래하지 않은 ${day.dayLabel}요일`
                      : `${day.dayLabel}요일 읽은 절 보기`
                  }
                  className={`flex min-h-9 min-w-9 items-center justify-center rounded-full text-xs font-bold ${
                    isFutureDay
                      ? "cursor-default text-stone-300 dark:text-stone-600"
                      : tooltipOpen
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                      : "cursor-pointer text-stone-600 dark:text-stone-300"
                  }`}
                >
                  {day.dayLabel}
                </button>

                {tooltipOpen && (
                  <div
                    id={dayTooltipId}
                    role="tooltip"
                    className={`absolute bottom-full z-20 mb-3 min-w-max rounded-xl bg-stone-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-stone-100 dark:text-stone-900 ${tooltipPosition}`}
                  >
                    <p className="font-bold">{day.dayLabel}요일</p>
                    {comparisonSummary ? (
                      <div className="mt-1.5 space-y-1">
                        <p className="flex items-center justify-between gap-4 text-orange-300 dark:text-orange-700">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-orange-400" />
                            나
                          </span>
                          <strong>
                            {comparisonReadCounts[index].toLocaleString(
                              "ko-KR",
                            )}
                            절
                          </strong>
                        </p>
                        <p className="flex items-center justify-between gap-4 text-sky-300 dark:text-sky-700">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="size-2 shrink-0 rounded-full bg-sky-400 dark:bg-sky-600" />
                            <span className="max-w-28 truncate">
                              {readerLabel}
                            </span>
                          </span>
                          <strong>
                            {day.readCount.toLocaleString("ko-KR")}절
                          </strong>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 font-medium text-stone-200 dark:text-stone-700">
                        <strong className="text-sm text-white dark:text-stone-900">
                          {day.readCount.toLocaleString("ko-KR")}절
                        </strong>{" "}
                        읽음
                      </p>
                    )}
                    <span
                      aria-hidden
                      className={`absolute top-full size-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-stone-900 dark:border-t-stone-100 ${arrowPosition}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {comparisonSummary && (
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-orange-500 dark:text-orange-300">
            <span className="size-2.5 rounded-full bg-orange-400 dark:bg-orange-300" />
            나
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-sky-500 dark:text-sky-300">
            <span className="size-2.5 shrink-0 rounded-full bg-sky-400 dark:bg-sky-300" />
            <span className="max-w-40 truncate">{readerLabel}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function ActivitySummaryContent({
  summary,
  comparisonSummary,
}: {
  summary: ActivityRankingUserSummary;
  comparisonSummary?: ActivityRankingUserSummary | null;
}) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-amber-50 px-4 py-3.5 dark:bg-amber-950/30">
          <dt className="text-xs font-medium text-amber-800 dark:text-amber-300">
            이번 주
          </dt>
          <dd className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">
            {summary.thisWeekReadCount.toLocaleString("ko-KR")}
            <span className="ml-0.5 text-sm font-semibold">절</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 dark:bg-emerald-950/25">
          <dt className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            전체 읽기
          </dt>
          <dd className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">
            {summary.totalReadCount.toLocaleString("ko-KR")}
            <span className="ml-0.5 text-sm font-semibold">절</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 dark:bg-emerald-950/25">
          <dt className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            권 완독
          </dt>
          <dd className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">
            {summary.bookCompletionCount.toLocaleString("ko-KR")}
            <span className="ml-0.5 text-sm font-semibold">회</span>
          </dd>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 dark:bg-emerald-950/25">
          <dt className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            성경 통독
          </dt>
          <dd className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">
            {summary.bibleCompletionCount.toLocaleString("ko-KR")}
            <span className="ml-0.5 text-sm font-semibold">독</span>
          </dd>
        </div>
      </dl>

      <WeeklyReadingChart
        weeklyReadCounts={summary.weeklyReadCounts}
        readerLabel={summary.displayName}
        comparisonSummary={comparisonSummary}
      />
    </>
  );
}
