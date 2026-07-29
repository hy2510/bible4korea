import {
  isRecoveryQuestionId,
  isValidPassword,
  isValidRecoveryAnswer,
  isValidUsername,
  normalizeUsername,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  toInternalAccountEmail,
  toSupabasePassword,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/auth/credentials";
import {
  isAuthActionRateLimited,
  jsonResponse,
  readJsonObject,
  readString,
  recordAuthSecurityEvent,
} from "@/lib/auth/api.server";
import { hashRecoveryAnswer } from "@/lib/auth/recovery.server";
import { INITIAL_SESSION_VERSION } from "@/lib/auth/session-version";
import { DEFAULT_DAILY_GOAL_TARGET } from "@/lib/daily-goal";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = readJsonObject(await request.json().catch(() => null));
  if (!body) {
    return jsonResponse({ message: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const username = normalizeUsername(readString(body, "username"));
  const password = readString(body, "password");
  const passwordConfirmation = readString(body, "passwordConfirmation");
  const recoveryQuestion = readString(body, "recoveryQuestion");
  const recoveryAnswer = readString(body, "recoveryAnswer");
  const recoveryAnswerConfirmation = readString(
    body,
    "recoveryAnswerConfirmation",
  );

  if (!isValidUsername(username)) {
    return jsonResponse(
      {
        message:
          `아이디는 ${USERNAME_MIN_LENGTH}~${USERNAME_MAX_LENGTH}자의 영문, 숫자와 기호(., _, -)만 사용할 수 있습니다.`,
      },
      400,
    );
  }
  if (!isValidPassword(password)) {
    return jsonResponse(
      {
        message: `비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (password !== passwordConfirmation) {
    return jsonResponse({ message: "비밀번호가 서로 일치하지 않습니다." }, 400);
  }
  if (!isRecoveryQuestionId(recoveryQuestion)) {
    return jsonResponse({ message: "비밀번호 찾기 질문을 선택해 주세요." }, 400);
  }
  if (!isValidRecoveryAnswer(recoveryAnswer)) {
    return jsonResponse(
      { message: "비밀번호 찾기 답변은 2~100자로 입력해 주세요." },
      400,
    );
  }
  if (recoveryAnswer !== recoveryAnswerConfirmation) {
    return jsonResponse(
      { message: "비밀번호 찾기 답변이 서로 일치하지 않습니다." },
      400,
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonResponse(
      { message: "회원가입 서버 설정이 아직 완료되지 않았습니다." },
      503,
    );
  }

  if (await isAuthActionRateLimited(supabase, request, username, "signup")) {
    return jsonResponse(
      { message: "회원가입 요청이 너무 많습니다. 15분 후 다시 시도해 주세요." },
      429,
    );
  }

  const { salt, hash } = await hashRecoveryAnswer(recoveryAnswer);
  const { data, error } = await supabase.auth.admin.createUser({
    email: toInternalAccountEmail(username),
    password: toSupabasePassword(password),
    email_confirm: true,
    user_metadata: { username },
    app_metadata: {
      username,
      login_method: "username",
      session_version: INITIAL_SESSION_VERSION,
    },
  });

  if (error || !data.user) {
    const duplicate =
      error?.code === "email_exists" ||
      error?.code === "user_already_exists" ||
      error?.message.toLowerCase().includes("already");
    await recordAuthSecurityEvent(
      supabase,
      request,
      username,
      "signup",
      false,
    );
    return jsonResponse(
      {
        message: duplicate
          ? "이미 사용 중인 아이디입니다."
          : "회원가입하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      duplicate ? 409 : 400,
    );
  }

  const [accountResult, dailyGoalResult] = await Promise.all([
    supabase.from("user_accounts").insert({
      user_id: data.user.id,
      username,
      recovery_question: recoveryQuestion,
      recovery_answer_salt: salt,
      recovery_answer_hash: hash,
    }),
    supabase.from("user_daily_goals").insert({
      user_id: data.user.id,
      target_verses: DEFAULT_DAILY_GOAL_TARGET,
    }),
  ]);

  if (accountResult.error || dailyGoalResult.error) {
    await supabase.auth.admin.deleteUser(data.user.id);
    await recordAuthSecurityEvent(
      supabase,
      request,
      username,
      "signup",
      false,
    );
    return jsonResponse(
      { message: "회원 정보를 저장하지 못했습니다. 다시 시도해 주세요." },
      500,
    );
  }

  await recordAuthSecurityEvent(
    supabase,
    request,
    username,
    "signup",
    true,
  );
  return jsonResponse({ message: "회원가입이 완료되었습니다." }, 201);
}
