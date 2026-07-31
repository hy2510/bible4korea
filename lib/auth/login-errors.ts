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
    return "아이디 로그인 설정에 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (
    message.includes("email not confirmed") ||
    code === "email_not_confirmed"
  ) {
    return "아이디 로그인 설정에 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "아이디 또는 비밀번호가 일치하지 않습니다.";
}
