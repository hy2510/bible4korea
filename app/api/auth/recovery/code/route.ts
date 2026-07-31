import {
  isValidRecoveryCode,
  RECOVERY_CODE_LENGTH,
} from "@/lib/auth/credentials";
import {
  jsonResponse,
  readJsonObject,
  readString,
} from "@/lib/auth/api.server";
import {
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/auth/recovery.server";
import { getAuthenticatedUser } from "@/lib/auth/request.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";

export async function POST(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "recovery-code-change",
    10,
    60 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return jsonResponse({ message: "로그인이 필요합니다." }, 401);
  }

  const body = readJsonObject(await request.json().catch(() => null));
  if (!body) {
    return jsonResponse({ message: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const currentRecoveryCode = readString(body, "currentRecoveryCode");
  const newRecoveryCode = readString(body, "newRecoveryCode");

  if (!isValidRecoveryCode(currentRecoveryCode)) {
    return jsonResponse(
      {
        message: `현재 복구 코드는 숫자 ${RECOVERY_CODE_LENGTH}자리로 입력해 주세요.`,
      },
      400,
    );
  }
  if (!isValidRecoveryCode(newRecoveryCode)) {
    return jsonResponse(
      {
        message: `변경할 복구 코드는 숫자 ${RECOVERY_CODE_LENGTH}자리로 입력해 주세요.`,
      },
      400,
    );
  }
  if (currentRecoveryCode === newRecoveryCode) {
    return jsonResponse(
      { message: "현재 복구 코드와 다른 코드를 입력해 주세요." },
      400,
    );
  }

  const { data: account, error: accountError } =
    await authenticated.supabase
      .from("user_accounts")
      .select("user_id, recovery_code_salt, recovery_code_hash")
      .eq("user_id", authenticated.user.id)
      .maybeSingle();

  if (accountError || !account) {
    return jsonResponse(
      { message: "계정 정보를 확인하지 못했습니다." },
      500,
    );
  }

  const codeMatches = await verifyRecoveryCode(
    currentRecoveryCode,
    account.recovery_code_salt,
    account.recovery_code_hash,
  );
  if (!codeMatches) {
    return jsonResponse(
      { message: "현재 복구 코드가 일치하지 않습니다." },
      401,
    );
  }

  const { salt, hash } = await hashRecoveryCode(newRecoveryCode);
  const { data: updatedAccount, error: updateError } =
    await authenticated.supabase
      .from("user_accounts")
      .update({
        recovery_code_salt: salt,
        recovery_code_hash: hash,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", authenticated.user.id)
      .eq("recovery_code_hash", account.recovery_code_hash)
      .select("user_id")
      .maybeSingle();

  if (updateError || !updatedAccount) {
    return jsonResponse(
      { message: "복구 코드를 변경하지 못했습니다. 다시 시도해 주세요." },
      500,
    );
  }

  return jsonResponse({ message: "복구 코드를 변경했습니다." });
}
