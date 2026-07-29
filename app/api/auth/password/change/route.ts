import {
  isValidPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  toSupabasePassword,
} from "@/lib/auth/credentials";
import {
  jsonResponse,
  readJsonObject,
  readString,
} from "@/lib/auth/api.server";
import { getAuthenticatedUser, getSupabaseAnonAuthClient } from "@/lib/auth/request.server";
import {
  getUserSessionVersion,
  normalizeSessionVersion,
} from "@/lib/auth/session-version";

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return jsonResponse({ message: "로그인이 필요합니다." }, 401);
  }

  const body = readJsonObject(await request.json().catch(() => null));
  if (!body) {
    return jsonResponse({ message: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const currentPassword = readString(body, "currentPassword");
  const newPassword = readString(body, "newPassword");

  if (!currentPassword) {
    return jsonResponse({ message: "현재 비밀번호를 입력해 주세요." }, 400);
  }
  if (!isValidPassword(newPassword)) {
    return jsonResponse(
      {
        message: `새 비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (currentPassword === newPassword) {
    return jsonResponse(
      { message: "현재 비밀번호와 다른 새 비밀번호를 입력해 주세요." },
      400,
    );
  }

  const email = authenticated.user.email;
  if (!email) {
    return jsonResponse({ message: "계정 정보를 확인할 수 없습니다." }, 400);
  }

  const anonClient = getSupabaseAnonAuthClient();
  if (!anonClient) {
    return jsonResponse(
      { message: "비밀번호 변경 서버 설정이 아직 완료되지 않았습니다." },
      503,
    );
  }

  const { error: verificationError } = await anonClient.auth.signInWithPassword({
    email,
    password: toSupabasePassword(currentPassword),
  });
  if (verificationError) {
    return jsonResponse({ message: "현재 비밀번호가 일치하지 않습니다." }, 401);
  }

  const nextSessionVersion = normalizeSessionVersion(
    getUserSessionVersion(authenticated.user) + 1,
  );
  const { error: updateError } =
    await authenticated.supabase.auth.admin.updateUserById(
      authenticated.user.id,
      {
        password: toSupabasePassword(newPassword),
        app_metadata: {
          ...authenticated.user.app_metadata,
          session_version: nextSessionVersion,
        },
      },
    );

  if (updateError) {
    return jsonResponse(
      { message: "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요." },
      500,
    );
  }

  await authenticated.supabase.auth.admin.signOut(
    authenticated.token,
    "others",
  );

  return jsonResponse({ version: nextSessionVersion });
}
