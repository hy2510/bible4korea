import { getAuthenticatedUser } from "@/lib/auth/request.server";
import { readJsonObject, readString } from "@/lib/auth/api.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import {
  isValidOrganizationNickname,
  isValidOrganizationPassword,
  normalizeOrganizationNickname,
  ORGANIZATION_NICKNAME_MAX_LENGTH,
  ORGANIZATION_PASSWORD_MAX_LENGTH,
  ORGANIZATION_PASSWORD_MIN_LENGTH,
} from "@/lib/organizations";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-join",
    20,
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

  const { organizationId } = await context.params;
  if (!UUID_PATTERN.test(organizationId)) {
    return Response.json(
      { message: "모임 정보를 확인해 주세요." },
      {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const body = readJsonObject(await request.json().catch(() => null));
  const rawNickname = body ? readString(body, "nickname") : "";
  const nickname = normalizeOrganizationNickname(rawNickname);
  const password = body ? readString(body, "password") : "";
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
  if (!isValidOrganizationPassword(password)) {
    return Response.json(
      {
        message: `모임 비밀번호는 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      },
      {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { error } = await authenticated.supabase.rpc(
    "request_organization_membership",
    {
      p_user_id: authenticated.user.id,
      p_organization_id: organizationId,
      p_nickname: nickname,
      p_password: password || null,
    },
  );

  if (error) {
    const conflict = error.message.includes(
      "already_has_organization_membership",
    );
    return Response.json(
      {
        message: error.message.includes("invalid_organization_nickname")
          ? `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`
          : conflict
            ? "이미 가입했거나 가입 요청 중인 모임이 있습니다."
          : error.message.includes("organization_not_found")
            ? "모임을 찾을 수 없습니다."
            : error.message.includes("organization_password_required")
              ? "이 모임의 비밀번호를 입력해 주세요."
              : error.message.includes("invalid_organization_password")
                ? "모임 비밀번호가 올바르지 않습니다."
            : "가입을 요청하지 못했습니다. 다시 시도해 주세요.",
      },
      {
        status: conflict ? 409 : 400,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  return Response.json(
    { message: "가입을 요청했습니다. 모임장의 승인을 기다려 주세요." },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
