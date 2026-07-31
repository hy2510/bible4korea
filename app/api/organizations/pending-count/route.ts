import { getAuthenticatedUser } from "@/lib/auth/request.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";

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
    "organization-pending-count",
    300,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const organizationResult = await authenticated.supabase
    .from("organizations")
    .select("id")
    .eq("owner_user_id", authenticated.user.id)
    .maybeSingle();

  if (organizationResult.error) {
    return noStoreJson(
      { message: "가입 대기 인원을 불러오지 못했습니다." },
      500,
    );
  }
  if (!organizationResult.data) {
    return noStoreJson({ pendingCount: 0 });
  }

  const pendingResult = await authenticated.supabase
    .from("organization_memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("organization_id", organizationResult.data.id)
    .eq("role", "member")
    .eq("status", "pending");

  if (pendingResult.error) {
    return noStoreJson(
      { message: "가입 대기 인원을 불러오지 못했습니다." },
      500,
    );
  }

  return noStoreJson({ pendingCount: pendingResult.count ?? 0 });
}
