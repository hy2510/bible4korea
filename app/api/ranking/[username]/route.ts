import {
  isValidUsername,
  normalizeUsername,
} from "@/lib/auth/credentials";
import {
  getActivityWeekdayReadCounts,
  getCurrentKoreanWeekRange,
  type ActivityRankingUserSummary,
} from "@/lib/activity-ranking";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import { getAuthenticatedUser } from "@/lib/auth/request.server";
import { getUserDisplayName } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username: rawUsername } = await context.params;
  const username = normalizeUsername(rawUsername);

  if (!isValidUsername(username)) {
    return Response.json(
      { error: "사용자 정보를 확인해 주세요." },
      {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const rateLimit = await checkPublicApiRateLimit(
    request,
    "activity-ranking-user",
    120,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return Response.json(
      { error: "로그인이 필요합니다." },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const week = getCurrentKoreanWeekRange();
  const startedAt = performance.now();
  const { data, error } = await authenticated.supabase.rpc(
    "get_authorized_activity_summary",
    {
      p_username: username,
      p_start_date: week.startDate,
      p_end_date: week.endDate,
      p_requester_user_id: authenticated.user.id,
    },
  );
  const queryDuration = performance.now() - startedAt;

  if (error) {
    return Response.json(
      { error: "말씀 활동을 불러오지 못했습니다." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
  const record = data?.[0];
  if (!record) {
    return Response.json(
      { error: "친구로 등록된 사용자의 활동만 볼 수 있습니다." },
      {
        status: 404,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const response: ActivityRankingUserSummary = {
    username: record.username,
    displayName: getUserDisplayName(record.nickname, record.username),
    affiliation: record.affiliation,
    thisWeekReadCount: Number(record.this_week_read_count),
    totalReadCount: Number(record.total_read_count),
    activeBookCount: Number(record.active_book_count),
    completedBookCount: Number(record.completed_book_count),
    bookCompletionCount: Number(record.book_completion_count),
    bibleCompletionCount: Number(record.bible_completion_count),
    dailyGoalAchievementCount: Number(
      record.daily_goal_achievement_count,
    ),
    dailyGoalAchievementDates: record.daily_goal_achievement_dates,
    dailyGoalStartedDate: record.daily_goal_started_date,
    weeklyReadCounts: getActivityWeekdayReadCounts(
      record.weekly_read_counts,
      week,
    ),
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": `db;dur=${queryDuration.toFixed(1)}`,
    },
  });
}
