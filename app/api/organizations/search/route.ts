import { getAuthenticatedUser } from "@/lib/auth/request.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import {
  isValidOrganizationName,
  ORGANIZATION_SEARCH_PAGE_SIZE,
  type OrganizationSearchItem,
  type OrganizationSearchResponse,
} from "@/lib/organizations";
import { getUserDisplayName } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

function parsePage(value: string | null): number {
  if (!value || !/^[1-9][0-9]*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page <= 10_000 ? page : 1;
}

export async function GET(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-search",
    60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return Response.json(
      { message: "로그인이 필요합니다." },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const page = parsePage(searchParams.get("page"));
  if (!isValidOrganizationName(query)) {
    return Response.json(
      { message: "검색할 모임 이름을 입력해 주세요." },
      {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { data, error } = await authenticated.supabase.rpc(
    "search_organizations",
    {
      p_query: query,
      p_offset: (page - 1) * ORGANIZATION_SEARCH_PAGE_SIZE,
      p_limit: ORGANIZATION_SEARCH_PAGE_SIZE + 1,
    },
  );

  if (error) {
    return Response.json(
      { message: "모임 검색 결과를 불러오지 못했습니다." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > ORGANIZATION_SEARCH_PAGE_SIZE;
  const pageRows = rows.slice(0, ORGANIZATION_SEARCH_PAGE_SIZE);
  const organizationIds = pageRows.map((organization) => organization.id);

  const ownerDisplayNameByOrgId = new Map<string, string>();
  if (organizationIds.length > 0) {
    const ownerResult = await authenticated.supabase
      .from("organization_memberships")
      .select("organization_id, user_id, nickname")
      .in("organization_id", organizationIds)
      .eq("role", "owner")
      .eq("status", "approved");

    if (ownerResult.error) {
      return Response.json(
        { message: "모임 검색 결과를 불러오지 못했습니다." },
        {
          status: 500,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    const ownerRows = ownerResult.data ?? [];
    const ownerUserIds = ownerRows.map((owner) => owner.user_id);
    const accountsByUserId = new Map<string, string>();

    if (ownerUserIds.length > 0) {
      const accountResult = await authenticated.supabase
        .from("user_accounts")
        .select("user_id, username")
        .in("user_id", ownerUserIds);

      if (accountResult.error) {
        return Response.json(
          { message: "모임 검색 결과를 불러오지 못했습니다." },
          {
            status: 500,
            headers: { "Cache-Control": "private, no-store" },
          },
        );
      }

      for (const account of accountResult.data ?? []) {
        accountsByUserId.set(account.user_id, account.username);
      }
    }

    for (const owner of ownerRows) {
      ownerDisplayNameByOrgId.set(
        owner.organization_id,
        getUserDisplayName(
          owner.nickname,
          accountsByUserId.get(owner.user_id),
        ),
      );
    }
  }

  const items: OrganizationSearchItem[] = pageRows.map((organization) => ({
    id: organization.id,
    name: organization.name,
    description: organization.description,
    requiresPassword: organization.requires_password,
    ownerDisplayName:
      ownerDisplayNameByOrgId.get(organization.id) ?? null,
  }));

  return Response.json(
    {
      items,
      page,
      hasMore,
    } satisfies OrganizationSearchResponse,
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
