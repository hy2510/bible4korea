import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getUserSessionVersion,
  normalizeSessionVersion,
} from "@/lib/auth/session-version";

export const dynamic = "force-dynamic";

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

async function getAuthenticatedUser(request: Request) {
  const token = getBearerToken(request);
  const supabase = getSupabaseAdminClient();
  if (!token || !supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return { token, user: data.user, supabase };
}

export async function GET(request: Request) {
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
