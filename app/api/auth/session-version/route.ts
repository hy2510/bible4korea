import {
  getUserSessionVersion,
  normalizeSessionVersion,
} from "@/lib/auth/session-version";
import {
  getAuthenticatedUser,
  getBearerToken,
} from "@/lib/auth/request.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return Response.json({ valid: false }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return Response.json(
      { message: "인증 서버 설정이 완료되지 않았습니다." },
      { status: 503 },
    );
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return Response.json({ valid: false }, { status: 401 });
  }

  return Response.json(
    {
      valid: true,
      version: getUserSessionVersion(authenticated.user),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const currentVersion = getUserSessionVersion(authenticated.user);
  const nextVersion = normalizeSessionVersion(currentVersion + 1);
  const { error: updateError } =
    await authenticated.supabase.auth.admin.updateUserById(
      authenticated.user.id,
      {
        app_metadata: {
          ...authenticated.user.app_metadata,
          session_version: nextVersion,
        },
      },
    );

  if (updateError) {
    return Response.json(
      { message: "다른 기기 세션을 정리하지 못했습니다." },
      { status: 500 },
    );
  }

  await authenticated.supabase.auth.admin.signOut(
    authenticated.token,
    "others",
  );

  return Response.json(
    { version: nextVersion },
    { headers: { "Cache-Control": "no-store" } },
  );
}
