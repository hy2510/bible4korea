import { getAuthenticatedUser } from "@/lib/auth/request.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import { getUserDisplayName } from "@/lib/user-profile";
import type {
  FriendDiscoveryItem,
  FriendDiscoveryResponse,
} from "@/lib/user-friends";

export const dynamic = "force-dynamic";

const USERNAME_QUERY_PATTERN = /^[a-z0-9._-]{1,20}$/;
const DISCOVERY_PAGE_SIZE = 10;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000
    ? parsed
    : 1;
}

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "friend-discovery",
    120,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  if (mode !== "username" && mode !== "affiliation") {
    return noStoreJson(
      { message: "친구 검색 방식을 확인해 주세요." },
      400,
    );
  }

  let currentAffiliation: string | null = null;
  const page = parsePage(searchParams.get("page"));
  let total = 0;
  let totalPages = 0;
  let accountRows: Array<{ user_id: string; username: string }> = [];
  let profileRows: Array<{
    user_id: string;
    affiliation: string | null;
  }> = [];
  let membershipNicknameRows: Array<{
    user_id: string;
    nickname: string;
  }> = [];

  if (mode === "username") {
    const query = (searchParams.get("query") ?? "").trim().toLowerCase();
    if (!USERNAME_QUERY_PATTERN.test(query)) {
      return noStoreJson(
        { message: "아이디를 한 글자 이상 정확히 입력해 주세요." },
        400,
      );
    }

    const accountResult = await authenticated.supabase
      .from("user_accounts")
      .select("user_id, username", { count: "exact" })
      .neq("user_id", authenticated.user.id)
      .gte("username", query)
      .lt("username", `${query}\uffff`)
      .order("username", { ascending: true })
      .range(
        (page - 1) * DISCOVERY_PAGE_SIZE,
        page * DISCOVERY_PAGE_SIZE - 1,
      );

    if (accountResult.error) {
      return noStoreJson(
        { message: "아이디 검색 결과를 불러오지 못했습니다." },
        500,
      );
    }

    accountRows = accountResult.data ?? [];
    total = accountResult.count ?? 0;
    totalPages = Math.ceil(total / DISCOVERY_PAGE_SIZE);
    const userIds = accountRows.map((account) => account.user_id);
    if (userIds.length > 0) {
      const [profileResult, membershipResult] = await Promise.all([
        authenticated.supabase
          .from("user_profile_settings")
          .select("user_id, affiliation")
          .in("user_id", userIds),
        authenticated.supabase
          .from("organization_memberships")
          .select("user_id, nickname")
          .in("user_id", userIds)
          .eq("status", "approved"),
      ]);

      if (profileResult.error || membershipResult.error) {
        return noStoreJson(
          { message: "사용자 프로필을 불러오지 못했습니다." },
          500,
        );
      }
      profileRows = profileResult.data ?? [];
      membershipNicknameRows = membershipResult.data ?? [];
    }
  } else {
    const currentMembershipResult = await authenticated.supabase
      .from("organization_memberships")
      .select("organization_id, status")
      .eq("user_id", authenticated.user.id)
      .maybeSingle();

    if (currentMembershipResult.error) {
      return noStoreJson(
        { message: "내 모임 정보를 불러오지 못했습니다." },
        500,
      );
    }

    const currentMembership = currentMembershipResult.data;
    if (!currentMembership || currentMembership.status !== "approved") {
      return noStoreJson(
        {
          items: [],
          affiliation: null,
          page: 1,
          totalPages: 0,
          total: 0,
        } satisfies FriendDiscoveryResponse,
      );
    }

    const [organizationResult, membershipResult] = await Promise.all([
      authenticated.supabase
        .from("organizations")
        .select("name")
        .eq("id", currentMembership.organization_id)
        .maybeSingle(),
      authenticated.supabase
        .from("organization_memberships")
        .select("user_id, nickname", { count: "exact" })
        .eq("organization_id", currentMembership.organization_id)
        .eq("status", "approved")
        .neq("user_id", authenticated.user.id)
        .order("user_id", { ascending: true })
        .range(
          (page - 1) * DISCOVERY_PAGE_SIZE,
          page * DISCOVERY_PAGE_SIZE - 1,
        ),
    ]);

    if (
      organizationResult.error ||
      !organizationResult.data ||
      membershipResult.error
    ) {
      return noStoreJson(
        { message: "같은 모임 사용자를 불러오지 못했습니다." },
        500,
      );
    }

    currentAffiliation = organizationResult.data.name;
    const membershipRows = membershipResult.data ?? [];
    total = membershipResult.count ?? 0;
    totalPages = Math.ceil(total / DISCOVERY_PAGE_SIZE);
    const userIds = membershipRows.map((membership) => membership.user_id);
    if (userIds.length > 0) {
      const [accountResult, profileResult] = await Promise.all([
        authenticated.supabase
          .from("user_accounts")
          .select("user_id, username")
          .in("user_id", userIds),
        authenticated.supabase
          .from("user_profile_settings")
          .select("user_id, affiliation")
          .in("user_id", userIds),
      ]);

      if (accountResult.error || profileResult.error) {
        return noStoreJson(
          { message: "사용자 정보를 불러오지 못했습니다." },
          500,
        );
      }
      accountRows = accountResult.data ?? [];
      profileRows = profileResult.data ?? [];
      membershipNicknameRows = membershipRows;
    }
  }

  const candidateUserIds = accountRows.map((account) => account.user_id);
  const friendResult =
    candidateUserIds.length > 0
      ? await authenticated.supabase
          .from("user_friends")
          .select("friend_user_id")
          .eq("owner_user_id", authenticated.user.id)
          .in("friend_user_id", candidateUserIds)
      : { data: [], error: null };

  if (friendResult.error) {
    return noStoreJson(
      { message: "친구 상태를 확인하지 못했습니다." },
      500,
    );
  }

  const profilesByUserId = new Map(
    profileRows.map((profile) => [profile.user_id, profile]),
  );
  const membershipsByUserId = new Map(
    membershipNicknameRows.map((membership) => [
      membership.user_id,
      membership,
    ]),
  );
  const friendUserIds = new Set(
    (friendResult.data ?? []).map((friend) => friend.friend_user_id),
  );
  const items = accountRows
    .map((account): FriendDiscoveryItem => {
      const profile = profilesByUserId.get(account.user_id);
      const membership = membershipsByUserId.get(account.user_id);
      return {
        username: account.username,
        displayName: getUserDisplayName(
          membership?.nickname ?? null,
          account.username,
        ),
        affiliation: profile?.affiliation ?? null,
        isFriend: friendUserIds.has(account.user_id),
      };
    })
    .sort(
      (left, right) =>
        left.displayName.localeCompare(right.displayName, "ko") ||
        left.username.localeCompare(right.username, "ko"),
    );

  return noStoreJson(
    {
      items,
      affiliation: currentAffiliation,
      page,
      totalPages,
      total,
    } satisfies FriendDiscoveryResponse,
  );
}
