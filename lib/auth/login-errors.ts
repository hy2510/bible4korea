interface AuthErrorLike {
  message?: string;
  code?: string;
}

export function getSignInErrorMessage(error: AuthErrorLike): string {
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (
    message.includes("email logins are disabled") ||
    message.includes("email login is disabled") ||
    message.includes("signup is disabled") ||
    code.includes("email_provider_disabled")
  ) {
    return "로그인 설정 문제입니다. Supabase에서 Email provider를 켜 두었는지 확인해 주세요.";
  }

  if (
    message.includes("email not confirmed") ||
    code === "email_not_confirmed"
  ) {
    return "로그인 설정 문제입니다. Supabase에서 Confirm email 설정을 꺼 주세요.";
  }

  return "아이디 또는 비밀번호가 일치하지 않습니다.";
}
