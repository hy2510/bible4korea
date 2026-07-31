import { getAuthenticatedUser } from "@/lib/auth/request.server";
import { readJsonObject, readString } from "@/lib/auth/api.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMBERSHIP_ACTIONS = new Set(["approve", "reject", "remove"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-member-review",
    120,
    60 * 60,
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

  const { userId } = await context.params;
  const body = readJsonObject(await request.json().catch(() => null));
  const action = body ? readString(body, "action") : "";
  if (!UUID_PATTERN.test(userId) || !MEMBERSHIP_ACTIONS.has(action)) {
    return Response.json(
      { message: "회원 처리 요청을 확인해 주세요." },
      {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { error } = await authenticated.supabase.rpc(
    "review_organization_membership",
    {
      p_owner_user_id: authenticated.user.id,
      p_member_user_id: userId,
      p_action: action,
    },
  );

  if (error) {
    return Response.json(
      {
        message: error.message.includes("organization_owner_required")
          ? "모임장만 회원을 관리할 수 있습니다."
          : error.message.includes("organization_member_not_found")
            ? "모임 회원 또는 가입 요청을 찾을 수 없습니다."
            : "회원을 처리하지 못했습니다. 다시 시도해 주세요.",
      },
      {
        status: error.message.includes("organization_owner_required")
          ? 403
          : 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const message =
    action === "approve"
      ? "가입을 승인했습니다."
      : action === "reject"
        ? "가입 요청을 거절했습니다."
        : "모임에서 회원을 삭제했습니다.";

  return Response.json(
    { message },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
