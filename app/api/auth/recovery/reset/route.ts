import {
  isValidPassword,
  isValidRecoveryCode,
  isValidUsername,
  normalizeUsername,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RECOVERY_CODE_LENGTH,
  toSupabasePassword,
} from "@/lib/auth/credentials";
import {
  isAuthActionRateLimited,
  jsonResponse,
  readJsonObject,
  readString,
  recordAuthSecurityEvent,
} from "@/lib/auth/api.server";
import { verifyRecoveryCode } from "@/lib/auth/recovery.server";
import {
  getUserSessionVersion,
  normalizeSessionVersion,
} from "@/lib/auth/session-version";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = readJsonObject(await request.json().catch(() => null));
  if (!body) {
    return jsonResponse({ message: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const username = normalizeUsername(readString(body, "username"));
  const recoveryCode = readString(body, "recoveryCode");
  const password = readString(body, "password");
  const passwordConfirmation = readString(body, "passwordConfirmation");

  if (!isValidUsername(username) || !isValidRecoveryCode(recoveryCode)) {
    return jsonResponse(
      {
        message:
          `아이디와 숫자 ${RECOVERY_CODE_LENGTH}자리 복구 코드를 확인해 주세요.`,
      },
      400,
    );
  }
  if (!isValidPassword(password)) {
    return jsonResponse(
      {
        message: `새 비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (password !== passwordConfirmation) {
    return jsonResponse(
      { message: "새 비밀번호가 서로 일치하지 않습니다." },
      400,
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonResponse(
      { message: "비밀번호 찾기 서버 설정이 아직 완료되지 않았습니다." },
      503,
    );
  }

  if (await isAuthActionRateLimited(supabase, request, username, "reset")) {
    return jsonResponse(
      { message: "확인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요." },
      429,
    );
  }

  const { data, error } = await supabase
    .from("user_accounts")
    .select("user_id, recovery_code_salt, recovery_code_hash")
    .eq("username", username)
    .maybeSingle();

  const codeMatches =
    !error &&
    data &&
    (await verifyRecoveryCode(
      recoveryCode,
      data.recovery_code_salt,
      data.recovery_code_hash,
    ));

  if (!codeMatches || !data) {
    await recordAuthSecurityEvent(
      supabase,
      request,
      username,
      "reset",
      false,
    );
    return jsonResponse(
      { message: "복구 코드가 일치하지 않습니다." },
      401,
    );
  }

  const { data: authUserData, error: authUserError } =
    await supabase.auth.admin.getUserById(data.user_id);
  const authUser = authUserError ? null : authUserData.user;
  let updateError: Error | null =
    authUserError ?? (authUser ? null : new Error("회원 정보를 찾을 수 없습니다."));

  if (authUser) {
    const nextSessionVersion = normalizeSessionVersion(
      getUserSessionVersion(authUser) + 1,
    );
    const updateResult = await supabase.auth.admin.updateUserById(
      data.user_id,
      {
        password: toSupabasePassword(password),
        app_metadata: {
          ...authUser.app_metadata,
          session_version: nextSessionVersion,
        },
      },
    );
    updateError = updateResult.error;
  }
  await recordAuthSecurityEvent(
    supabase,
    request,
    username,
    "reset",
    !updateError,
  );

  if (updateError) {
    return jsonResponse(
      { message: "비밀번호를 변경하지 못했습니다. 다시 시도해 주세요." },
      500,
    );
  }

  return jsonResponse({
    message: "비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.",
  });
}
