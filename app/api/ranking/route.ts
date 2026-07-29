import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  countReadingProgressInRange,
  getCurrentKoreanWeekRange,
  type ActivityRankingItem,
  type ActivityRankingResponse,
} from "@/lib/activity-ranking";
import { normalizeAffiliation } from "@/lib/user-affiliation";
import { getUserDisplayName } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;
const MAX_RANKED_USERS = 1_000;
const DEVELOPMENT_SAMPLE_USERS = [
  { username: "gracewalker", readCount: 15 },
  { username: "olivebranch", readCount: 13 },
  { username: "shalom7", readCount: 11 },
  { username: "morningstar", readCount: 9 },
  { username: "psalm23", readCount: 8 },
  { username: "faithhope", readCount: 7 },
  { username: "livingword", readCount: 6 },
  { username: "mustardseed", readCount: 5 },
  { username: "bethany12", readCount: 4 },
  { username: "selah2026", readCount: 3 },
] satisfies Array<{
  username: string;
  readCount: number;
  affiliation?: string | null;
}>;

function parseNonNegativeInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return Response.json(
      { error: "말씀 활동 서비스를 사용할 수 없습니다." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const offset = parseNonNegativeInteger(searchParams.get("offset"), 0);
  const requestedLimit = parseNonNegativeInteger(
    searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
  );
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);
  const affiliationFilter = normalizeAffiliation(
    searchParams.get("affiliation") ?? "",
  );
  const week = getCurrentKoreanWeekRange();

  const [accountResult, profileResult, readingResult] = await Promise.all([
    supabase
      .from("user_accounts")
      .select("user_id, username")
      .limit(MAX_RANKED_USERS),
    supabase
      .from("user_profile_settings")
      .select("user_id, affiliation, nickname")
      .limit(MAX_RANKED_USERS),
    supabase
      .from("user_reading_progress")
      .select("user_id, progress")
      .limit(MAX_RANKED_USERS),
  ]);

  if (accountResult.error || profileResult.error || readingResult.error) {
    return Response.json(
      { error: "말씀 활동을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const readCounts = new Map(
    (readingResult.data ?? []).map((record) => [
      record.user_id,
      countReadingProgressInRange(record.progress, week),
    ]),
  );
  const affiliations = new Map(
    (profileResult.data ?? []).map((record) => [
      record.user_id,
      record.affiliation,
    ]),
  );
  const nicknames = new Map(
    (profileResult.data ?? []).map((record) => [
      record.user_id,
      record.nickname,
    ]),
  );

  const recordedUsers = (accountResult.data ?? [])
    .map((account) => {
      const readCount = readCounts.get(account.user_id) ?? 0;
      const nickname = nicknames.get(account.user_id) ?? null;

      return {
        username: account.username,
        nickname,
        displayName: getUserDisplayName(nickname, account.username),
        affiliation: affiliations.get(account.user_id) ?? null,
        readCount,
      };
    })
    .filter((item) => item.readCount > 0)
    .filter(
      (item) =>
        !affiliationFilter || item.affiliation === affiliationFilter,
    );
  const recordedUsernames = new Set(
    recordedUsers.map((item) => item.username),
  );
  const sampleUsers =
    process.env.NODE_ENV === "development"
      ? DEVELOPMENT_SAMPLE_USERS.filter(
          (item) => !recordedUsernames.has(item.username),
        ).map((item) => ({
          username: item.username,
          readCount: item.readCount,
          nickname: null,
          displayName: item.username,
          affiliation: null,
        }))
      : [];
  const rankedUsers = [...recordedUsers, ...sampleUsers]
    .sort(
      (left, right) =>
        right.readCount - left.readCount ||
        left.username.localeCompare(right.username, "ko"),
    );

  const items: ActivityRankingItem[] = rankedUsers
    .slice(offset, offset + limit)
    .map((item, index) => ({
      rank: offset + index + 1,
      username: item.username,
      nickname: item.nickname ?? null,
      displayName: item.displayName,
      readCount: item.readCount,
      affiliation: item.affiliation ?? null,
    }));
  const response: ActivityRankingResponse = {
    items,
    total: rankedUsers.length,
    weekLabel: week.label,
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
