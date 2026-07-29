import {
  isValidUsername,
  normalizeUsername,
} from "@/lib/auth/credentials";
import {
  isAuthActionRateLimited,
  jsonResponse,
  readJsonObject,
  readString,
  recordAuthSecurityEvent,
} from "@/lib/auth/api.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = readJsonObject(await request.json().catch(() => null));
  const username = normalizeUsername(
    body ? readString(body, "username") : "",
  );

  if (!isValidUsername(username)) {
    return jsonResponse({ message: "아이디를 확인해 주세요." }, 400);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return jsonResponse(
      { message: "비밀번호 찾기 서버 설정이 아직 완료되지 않았습니다." },
      503,
    );
  }

  if (await isAuthActionRateLimited(supabase, request, username, "question")) {
    return jsonResponse(
      { message: "요청이 너무 많습니다. 15분 후 다시 시도해 주세요." },
      429,
    );
  }

  const { data, error } = await supabase
    .from("user_accounts")
    .select("recovery_question")
    .eq("username", username)
    .maybeSingle();
  const succeeded = !error && Boolean(data);
  await recordAuthSecurityEvent(
    supabase,
    request,
    username,
    "question",
    succeeded,
  );

  if (!succeeded || !data) {
    return jsonResponse({ message: "아이디를 확인해 주세요." }, 404);
  }

  return jsonResponse({ question: data.recovery_question });
}
