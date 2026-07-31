import { getAuthenticatedUser } from "@/lib/auth/request.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import type { OrganizationApprovalNoticeResponse } from "@/lib/organizations";

export const dynamic = "force-dynamic";

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
    "organization-approval-notice",
    300,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const noticeResult = await authenticated.supabase
    .rpc("get_organization_approval_notice", {
      p_user_id: authenticated.user.id,
    })
    .maybeSingle();

  if (noticeResult.error) {
    return noStoreJson(
      { message: "모임 승인 알림을 불러오지 못했습니다." },
      500,
    );
  }

  const notice = noticeResult.data
    ? {
        organizationId: noticeResult.data.organization_id,
        organizationName: noticeResult.data.organization_name,
        approvedAt: noticeResult.data.approved_at,
      }
    : null;

  return noStoreJson({
    notice,
  } satisfies OrganizationApprovalNoticeResponse);
}

export async function PATCH(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-approval-notice-dismiss",
    30,
    60 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const { error } = await authenticated.supabase.rpc(
    "dismiss_organization_approval_notice",
    {
      p_user_id: authenticated.user.id,
    },
  );

  if (error) {
    return noStoreJson(
      { message: "모임 승인 알림을 닫지 못했습니다." },
      500,
    );
  }

  return noStoreJson({ dismissed: true });
}
