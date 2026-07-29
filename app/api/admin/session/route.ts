import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  isAdminAuthConfigured,
  isSameOriginRequest,
  verifyAdminCredentials,
} from "@/lib/admin-auth.server";
import {
  isAuthActionRateLimited,
  readJsonObject,
  readString,
  recordAuthSecurityEvent,
} from "@/lib/auth/api.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ADMIN_SECURITY_USERNAME = "__admin__";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  }

  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { message: "관리자 로그인이 아직 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "관리자 데이터베이스 연결이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  if (
    await isAuthActionRateLimited(
      supabase,
      request,
      ADMIN_SECURITY_USERNAME,
      "reset",
    )
  ) {
    return NextResponse.json(
      { message: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const body = readJsonObject(await request.json().catch(() => null));
  const username = body ? readString(body, "username") : "";
  const password = body ? readString(body, "password") : "";
  const authenticated = verifyAdminCredentials(username, password);

  await recordAuthSecurityEvent(
    supabase,
    request,
    ADMIN_SECURITY_USERNAME,
    "reset",
    authenticated,
  );

  if (!authenticated) {
    return NextResponse.json(
      { message: "관리자 아이디 또는 비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json(
      { message: "관리자 세션을 만들지 못했습니다." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    token,
    getAdminSessionCookieOptions(),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { message: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
