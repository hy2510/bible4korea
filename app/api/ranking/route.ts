import { getAuthenticatedUser } from "@/lib/auth/request.server";
import {
  getCurrentKoreanWeekRange,
  type ActivityRankingItem,
  type ActivityRankingResponse,
} from "@/lib/activity-ranking";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import { getUserDisplayName } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;
const MAX_OFFSET = 100_000;

function parseBoundedInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number | null {
  if (value === null) return fallback;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = parseBoundedInteger(
    searchParams.get("offset"),
    0,
    0,
    MAX_OFFSET,
  );
  const limit = parseBoundedInteger(
    searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );
  if (offset === null || limit === null) {
    return Response.json(
      { error: "랭킹 조회 조건을 확인해 주세요." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const rateLimit = await checkPublicApiRateLimit(
    request,
    "activity-ranking",
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
  const { data: membership, error: membershipError } =
    await authenticated.supabase
      .from("organization_memberships")
      .select("organization_id, status")
      .eq("user_id", authenticated.user.id)
      .maybeSingle();

  if (membershipError) {
    return Response.json(
      { error: "모임 정보를 불러오지 못했습니다." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  if (!membership) {
    return Response.json(
      {
        items: [],
        total: 0,
        weekLabel: week.label,
        organizationName: null,
        membershipStatus: null,
      } satisfies ActivityRankingResponse,
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const organizationPromise = authenticated.supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (membership.status === "pending") {
    const organizationResult = await organizationPromise;
    if (organizationResult.error || !organizationResult.data) {
      return Response.json(
        { error: "모임 정보를 불러오지 못했습니다." },
        {
          status: 500,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    return Response.json(
      {
        items: [],
        total: 0,
        weekLabel: week.label,
        organizationName: organizationResult.data.name,
        membershipStatus: "pending",
      } satisfies ActivityRankingResponse,
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const startedAt = performance.now();
  const [organizationResult, rankingResult] = await Promise.all([
    organizationPromise,
    authenticated.supabase.rpc("get_activity_ranking", {
      p_start_date: week.startDate,
      p_end_date: week.endDate,
      p_organization_id: membership.organization_id,
      p_offset: offset,
      p_limit: limit,
    }),
  ]);
  const queryDuration = performance.now() - startedAt;
  const { data, error } = rankingResult;

  if (organizationResult.error || !organizationResult.data || error) {
    return Response.json(
      { error: "말씀 활동을 불러오지 못했습니다." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const rows = data ?? [];
  const items: ActivityRankingItem[] = rows.map((item) => ({
    rank: Number(item.ranking_position),
    displayName: getUserDisplayName(item.nickname, item.username),
    readCount: Number(item.read_count),
  }));
  const total = Number(rows[0]?.total_count ?? 0);

  const response: ActivityRankingResponse = {
    items,
    total,
    weekLabel: week.label,
    organizationName: organizationResult.data.name,
    membershipStatus: "approved",
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": `db;dur=${queryDuration.toFixed(1)}`,
    },
  });
}
