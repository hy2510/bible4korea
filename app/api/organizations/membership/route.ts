import { getAuthenticatedUser } from "@/lib/auth/request.server";
import { readJsonObject, readString } from "@/lib/auth/api.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import {
  isValidOrganizationNickname,
  normalizeOrganizationNickname,
  ORGANIZATION_NICKNAME_MAX_LENGTH,
} from "@/lib/organizations";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-membership-nickname",
    30,
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

  const body = readJsonObject(await request.json().catch(() => null));
  const rawNickname = body ? readString(body, "nickname") : "";
  const nickname = normalizeOrganizationNickname(rawNickname);
  if (!isValidOrganizationNickname(rawNickname)) {
    return Response.json(
      {
        message: `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      },
      {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { error } = await authenticated.supabase.rpc(
    "update_organization_membership_nickname",
    {
      p_user_id: authenticated.user.id,
      p_nickname: nickname,
    },
  );

  if (error) {
    const membershipRequired = error.message.includes(
      "organization_membership_required",
    );
    const invalidNickname = error.message.includes(
      "invalid_organization_nickname",
    );
    return Response.json(
      {
        message: membershipRequired
          ? "가입 중인 모임을 찾을 수 없습니다."
          : invalidNickname
            ? `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`
            : "별명을 변경하지 못했습니다. 다시 시도해 주세요.",
      },
      {
        status: membershipRequired ? 404 : invalidNickname ? 400 : 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  return Response.json(
    { message: "모임 별명을 변경했습니다." },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-membership-leave",
    30,
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

  const { error } = await authenticated.supabase.rpc(
    "leave_organization",
    {
      p_user_id: authenticated.user.id,
    },
  );

  if (error) {
    return Response.json(
      {
        message: error.message.includes("organization_owner_cannot_leave")
          ? "모임장은 모임에서 탈퇴할 수 없습니다."
          : "모임 요청을 취소하거나 탈퇴하지 못했습니다.",
      },
      {
        status: error.message.includes("organization_owner_cannot_leave")
          ? 409
          : 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  return Response.json(
    { message: "모임 가입 요청 또는 가입 상태를 해제했습니다." },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
